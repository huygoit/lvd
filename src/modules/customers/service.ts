import type { Prisma } from "@prisma/client";
import type { User } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { writeAudit } from "@/modules/system/audit";
import { assertAny, assertOwn, listOwner } from "@/modules/system/access";
import { nextCode } from "@/modules/system/codes";

const pageSize = 15;

export type CustomerInput = {
  type: string;
  name: string;
  shortName?: string;
  taxCode?: string;
  phone?: string;
  fax?: string;
  altPhone?: string;
  email?: string;
  address?: string;
  invoiceName?: string;
  invoiceTaxCode?: string;
  invoiceAddress?: string;
  invoiceEmail?: string;
  representativeName?: string;
  representativeTitle?: string;
  executorName?: string;
  executorTitle?: string;
  ownerId: string;
  source?: string;
  note?: string;
  revision?: number;
  bankAccounts?: { id?: string; bankName?: string; accountNumber?: string; isPrimary?: boolean }[];
};

function text(value: string | undefined) {
  return (value ?? "").trim();
}

export function normalizeTax(value: string) {
  return value.replace(/[\s.-]/g, "").toUpperCase();
}

export function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function assertEmail(value: string, label: string) {
  if (!value) return;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new AppError(`${label} không đúng định dạng.`, 400);
}

function assertPhone(value: string, label = "Điện thoại") {
  if (!value) return;
  const digits = phoneDigits(value);
  if (digits.length < 9 || digits.length > 12) throw new AppError(`${label} cần từ 9 đến 12 chữ số.`, 400);
}

function assertTax(value: string) {
  if (!value) return;
  if (!/^\d{10}(\d{3})?$/.test(value)) throw new AppError("Mã số thuế cần 10 hoặc 13 chữ số.", 400);
}

async function activeOwner(ownerId: string) {
  const staff = await prisma.staff.findFirst({ where: { id: ownerId, active: true } });
  if (!staff) throw new AppError("Người phụ trách không còn hoạt động.", 400);
}

function cleanBankAccounts(rows: CustomerInput["bankAccounts"]) {
  const cleaned: { id: string; bankName: string; accountNumber: string; isPrimary: boolean }[] = [];
  const seen = new Set<string>();
  for (const row of rows ?? []) {
    const bankName = text(row.bankName);
    const accountNumber = phoneDigits(text(row.accountNumber));
    if (!bankName && !accountNumber) continue;
    if (!bankName) throw new AppError("Cần nhập tên ngân hàng.", 400);
    if (accountNumber.length < 6 || accountNumber.length > 20) {
      throw new AppError("Số tài khoản cần từ 6 đến 20 chữ số.", 400);
    }
    if (seen.has(accountNumber)) throw new AppError("Số tài khoản bị trùng trong bảng.", 409);
    seen.add(accountNumber);
    cleaned.push({ id: text(row.id), bankName, accountNumber, isPrimary: Boolean(row.isPrimary) });
  }
  if (cleaned.length > 0 && !cleaned.some((row) => row.isPrimary)) cleaned[0].isPrimary = true;
  let marked = false;
  for (const row of cleaned) {
    if (row.isPrimary && !marked) marked = true;
    else row.isPrimary = false;
  }
  return cleaned;
}

async function applyBanks(
  tx: Prisma.TransactionClient,
  customerId: string,
  banks: ReturnType<typeof cleanBankAccounts>,
) {
  const owned = await tx.customerBankAccount.findMany({ where: { customerId }, select: { id: true } });
  const ownedIds = new Set(owned.map((row) => row.id));
  for (const row of banks) {
    if (row.id && !ownedIds.has(row.id)) throw new AppError("Không tìm thấy tài khoản.", 404);
  }
  const keep = banks.map((row) => row.id).filter((item) => ownedIds.has(item));
  await tx.customerBankAccount.deleteMany({
    where: { customerId, ...(keep.length > 0 ? { id: { notIn: keep } } : {}) },
  });
  for (const row of banks) {
    const data = { bankName: row.bankName, accountNumber: row.accountNumber, isPrimary: row.isPrimary };
    if (row.id && ownedIds.has(row.id)) {
      await tx.customerBankAccount.update({ where: { id: row.id }, data });
    } else {
      await tx.customerBankAccount.create({ data: { customerId, ...data } });
    }
  }
}

function clean(input: CustomerInput) {
  const taxCode = normalizeTax(text(input.taxCode));
  const email = text(input.email).toLowerCase();
  const invoiceEmail = text(input.invoiceEmail).toLowerCase();
  const phone = phoneDigits(text(input.phone));
  const fax = phoneDigits(text(input.fax));
  const altPhone = phoneDigits(text(input.altPhone));
  assertEmail(email, "Email liên lạc");
  assertEmail(invoiceEmail, "Email nhận hóa đơn");
  assertPhone(phone);
  assertPhone(fax, "Số fax");
  assertPhone(altPhone, "Số điện thoại liên lạc");
  assertTax(taxCode);
  if (input.type !== "ca_nhan" && input.type !== "doanh_nghiep") throw new AppError("Chọn loại khách hàng.", 400);
  if (!text(input.name)) throw new AppError("Cần nhập tên khách hàng.", 400);
  return {
    type: input.type,
    name: text(input.name),
    shortName: text(input.shortName),
    taxCode,
    phone,
    fax,
    altPhone,
    email,
    address: text(input.address),
    invoiceName: text(input.invoiceName),
    invoiceTaxCode: taxCode,
    invoiceAddress: text(input.invoiceAddress),
    invoiceEmail,
    representativeName: text(input.representativeName),
    representativeTitle: text(input.representativeTitle),
    executorName: text(input.executorName),
    executorTitle: text(input.executorTitle),
    ownerId: input.ownerId,
    source: text(input.source),
    note: text(input.note),
  };
}

async function similar(data: { name: string; phone: string; email: string; taxCode: string }, ignoreId?: string) {
  const rows = await prisma.customer.findMany({
    where: { status: "dang_dung", ...(ignoreId ? { id: { not: ignoreId } } : {}) },
    select: { id: true, code: true, name: true, phone: true, email: true, taxCode: true },
  });
  return rows
    .filter((row) => {
      if (data.taxCode && row.taxCode === data.taxCode) return false;
      const sameName = data.name.toLocaleLowerCase("vi") === row.name.toLocaleLowerCase("vi");
      const sameEmail = data.email.length > 0 && row.email.toLowerCase() === data.email;
      return sameName || sameEmail;
    })
    .slice(0, 5)
    .map((row) => ({ id: row.id, code: row.code, name: row.name }));
}

async function assertPhoneFree(phone: string, ignoreId?: string) {
  const digits = phoneDigits(phone);
  if (!digits) return;
  const rows = await prisma.customer.findMany({
    where: { status: "dang_dung", phone: { not: "" }, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
    select: { id: true, code: true, name: true, phone: true },
  });
  const existing = rows.find((row) => phoneDigits(row.phone) === digits);
  if (existing) {
    throw new AppError(`Số điện thoại đã thuộc ${existing.code} · ${existing.name}.`, 409, { customerId: existing.id });
  }
}

async function assertTaxFree(taxCode: string, ignoreId?: string) {
  if (!taxCode) return;
  const existing = await prisma.customer.findFirst({
    where: { taxCode, status: "dang_dung", ...(ignoreId ? { id: { not: ignoreId } } : {}) },
    select: { id: true, code: true, name: true },
  });
  if (existing) {
    throw new AppError(`Mã số thuế đã thuộc ${existing.code} · ${existing.name}.`, 409, { customerId: existing.id });
  }
}

function customerWhere(user: User, filters: { q?: string; type?: string; ownerId?: string; status?: string }): Prisma.CustomerWhereInput {
  const scope = listOwner(user, "customers.view", "customers.view.assigned");
  const ownerId = scope || filters.ownerId || undefined;
  const q = filters.q?.trim();
  return {
    ...(ownerId ? { ownerId } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    status: filters.status || "dang_dung",
    ...(q
      ? {
          OR: [
            { code: { contains: q } },
            { name: { contains: q } },
            { taxCode: { contains: normalizeTax(q) } },
            { phone: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : {}),
  };
}

export async function listCustomers(user: User, filters: { q?: string; type?: string; ownerId?: string; status?: string; page?: number }) {
  const page = Math.max(1, filters.page ?? 1);
  const where = customerWhere(user, filters);
  const [total, rows] = await prisma.$transaction([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      include: { contacts: { where: { isPrimary: true }, take: 1 } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  const staff = await prisma.staff.findMany();
  const names = new Map(staff.map((item) => [item.id, item.name]));
  return {
    page,
    pageSize,
    total,
    rows: rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      type: row.type,
      phone: row.phone,
      email: row.email,
      status: row.status,
      ownerName: names.get(row.ownerId) ?? "Chưa gán",
      contactName: row.contacts[0]?.name ?? "",
    })),
  };
}

export async function getCustomer(user: User, id: string) {
  const row = await prisma.customer.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
      bankAccounts: { orderBy: [{ isPrimary: "desc" }, { bankName: "asc" }] },
      projects: { orderBy: { createdAt: "desc" } },
      quotations: { include: { versions: { orderBy: { number: "desc" }, take: 1, include: { items: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!row) throw new AppError("Không tìm thấy khách hàng.", 404);
  assertOwn(user, "customers.view", "customers.view.assigned", row.ownerId);
  const audits = await prisma.auditLog.findMany({
    where: { entityType: "khach_hang", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return { ...row, audits };
}

export async function createCustomer(user: User, input: CustomerInput, now = new Date()) {
  assertAny(user, ["customers.create"]);
  const data = clean(input);
  await activeOwner(data.ownerId);
  await assertTaxFree(data.taxCode);
  await assertPhoneFree(data.phone);
  const warnings = await similar(data);
  const banks = cleanBankAccounts(input.bankAccounts);
  const created = await prisma.$transaction(async (tx) => {
    const code = await nextCode(tx, "KH", now);
    const customer = await tx.customer.create({ data: { ...data, code } });
    await applyBanks(tx, customer.id, banks);
    await writeAudit(tx, user.id, "tao", "khach_hang", customer.id, `Tạo khách hàng ${code}`);
    return customer;
  });
  return { customer: created, warnings };
}

export async function updateCustomer(user: User, id: string, input: CustomerInput) {
  assertAny(user, ["customers.update", "customers.create"]);
  const current = await prisma.customer.findUnique({ where: { id } });
  if (!current) throw new AppError("Không tìm thấy khách hàng.", 404);
  assertOwn(user, "customers.view", "customers.view.assigned", current.ownerId);
  if (current.revision !== input.revision) throw new AppError("Khách hàng vừa được cập nhật. Hãy tải lại.", 409);
  const data = clean(input);
  await activeOwner(data.ownerId);
  await assertTaxFree(data.taxCode, id);
  await assertPhoneFree(data.phone, id);
  const warnings = await similar(data, id);
  const banks = input.bankAccounts ? cleanBankAccounts(input.bankAccounts) : null;
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.customer.updateMany({
      where: { id, revision: current.revision },
      data: { ...data, shortName: current.shortName, source: current.source, revision: { increment: 1 } },
    });
    if (updated.count === 0) throw new AppError("Khách hàng vừa được cập nhật. Hãy tải lại.", 409);
    if (banks) await applyBanks(tx, id, banks);
    await writeAudit(tx, user.id, "sua", "khach_hang", id, `Cập nhật ${current.code}`);
    return tx.customer.findUniqueOrThrow({ where: { id } });
  });
  return { customer: result, warnings };
}

export async function deleteCustomer(user: User, id: string) {
  assertAny(user, ["customers.archive", "customers.update"]);
  const current = await prisma.customer.findUnique({
    where: { id },
    include: { _count: { select: { projects: true, quotations: true, contracts: true } } },
  });
  if (!current) throw new AppError("Không tìm thấy khách hàng.", 404);
  assertOwn(user, "customers.view", "customers.view.assigned", current.ownerId);
  if (current._count.projects + current._count.quotations + current._count.contracts > 0) {
    throw new AppError("Khách này đang có công trình, báo giá hoặc hợp đồng nên không xóa. Hãy lưu trữ hồ sơ.", 409);
  }
  await prisma.$transaction(async (tx) => {
    await writeAudit(tx, user.id, "xoa", "khach_hang", id, `Xóa khách hàng ${current.code}`);
    await tx.customer.delete({ where: { id } });
  });
}

export async function archiveCustomer(user: User, id: string) {
  assertAny(user, ["customers.archive", "customers.update"]);
  const current = await prisma.customer.findUnique({ where: { id } });
  if (!current) throw new AppError("Không tìm thấy khách hàng.", 404);
  assertOwn(user, "customers.view", "customers.view.assigned", current.ownerId);
  await prisma.$transaction(async (tx) => {
    await tx.customer.update({ where: { id }, data: { status: "luu_tru", revision: { increment: 1 } } });
    await writeAudit(tx, user.id, "luu_tru", "khach_hang", id, `Lưu trữ ${current.code}. Hồ sơ cũ vẫn giữ.`);
  });
}

export async function saveContact(
  user: User,
  customerId: string,
  input: { id?: string; name: string; role?: string; phone?: string; email?: string; note?: string; isPrimary?: boolean },
) {
  assertAny(user, ["customers.contacts", "customers.update", "customers.create"]);
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new AppError("Không tìm thấy khách hàng.", 404);
  assertOwn(user, "customers.view", "customers.view.assigned", customer.ownerId);
  const name = text(input.name);
  if (!name) throw new AppError("Cần nhập họ tên người liên hệ.", 400);
  const email = text(input.email).toLowerCase();
  const phone = text(input.phone);
  assertEmail(email, "Email liên hệ");
  assertPhone(phone);
  await prisma.$transaction(async (tx) => {
    if (input.isPrimary) {
      await tx.customerContact.updateMany({ where: { customerId }, data: { isPrimary: false } });
    }
    if (input.id) {
      await tx.customerContact.update({
        where: { id: input.id },
        data: { name, role: text(input.role), phone, email, note: text(input.note), isPrimary: Boolean(input.isPrimary) },
      });
    } else {
      const count = await tx.customerContact.count({ where: { customerId } });
      await tx.customerContact.create({
        data: {
          customerId,
          name,
          role: text(input.role),
          phone,
          email,
          note: text(input.note),
          isPrimary: Boolean(input.isPrimary) || count === 0,
        },
      });
    }
    await writeAudit(tx, user.id, "lien_he", "khach_hang", customerId, `Cập nhật người liên hệ ${name}`);
  });
}

export async function replaceBankAccounts(
  user: User,
  customerId: string,
  rows: CustomerInput["bankAccounts"],
) {
  assertAny(user, ["customers.update", "customers.create"]);
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new AppError("Không tìm thấy khách hàng.", 404);
  assertOwn(user, "customers.view", "customers.view.assigned", customer.ownerId);
  const banks = cleanBankAccounts(rows);
  await prisma.$transaction(async (tx) => {
    await applyBanks(tx, customerId, banks);
    await writeAudit(tx, user.id, "tai_khoan", "khach_hang", customerId, `Cập nhật tài khoản ngân hàng`);
  });
}

export async function saveBankAccount(
  user: User,
  customerId: string,
  input: { bankName?: string; accountNumber?: string; isPrimary?: boolean },
) {
  assertAny(user, ["customers.update", "customers.create"]);
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new AppError("Không tìm thấy khách hàng.", 404);
  assertOwn(user, "customers.view", "customers.view.assigned", customer.ownerId);
  const bankName = text(input.bankName);
  const accountNumber = phoneDigits(text(input.accountNumber));
  if (!bankName) throw new AppError("Cần nhập tên ngân hàng.", 400);
  if (accountNumber.length < 6 || accountNumber.length > 20) {
    throw new AppError("Số tài khoản cần từ 6 đến 20 chữ số.", 400);
  }
  const duplicated = await prisma.customerBankAccount.findFirst({ where: { customerId, accountNumber } });
  if (duplicated) throw new AppError("Số tài khoản này đã có trên hồ sơ.", 409);
  await prisma.$transaction(async (tx) => {
    const count = await tx.customerBankAccount.count({ where: { customerId } });
    const primary = Boolean(input.isPrimary) || count === 0;
    if (primary) {
      await tx.customerBankAccount.updateMany({ where: { customerId }, data: { isPrimary: false } });
    }
    await tx.customerBankAccount.create({
      data: { customerId, bankName, accountNumber, isPrimary: primary },
    });
    await writeAudit(tx, user.id, "tai_khoan", "khach_hang", customerId, `Thêm tài khoản ${bankName}`);
  });
}

export async function deleteBankAccount(user: User, accountId: string) {
  assertAny(user, ["customers.update", "customers.create"]);
  const account = await prisma.customerBankAccount.findUnique({ where: { id: accountId }, include: { customer: true } });
  if (!account) throw new AppError("Không tìm thấy tài khoản.", 404);
  assertOwn(user, "customers.view", "customers.view.assigned", account.customer.ownerId);
  await prisma.$transaction(async (tx) => {
    await tx.customerBankAccount.delete({ where: { id: accountId } });
    if (account.isPrimary) {
      const next = await tx.customerBankAccount.findFirst({
        where: { customerId: account.customerId },
        orderBy: { createdAt: "asc" },
      });
      if (next) await tx.customerBankAccount.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
    await writeAudit(tx, user.id, "tai_khoan", "khach_hang", account.customerId, `Xóa tài khoản ${account.bankName}`);
  });
}

export async function deleteContact(user: User, contactId: string) {
  assertAny(user, ["customers.contacts", "customers.update"]);
  const contact = await prisma.customerContact.findUnique({ where: { id: contactId }, include: { customer: true } });
  if (!contact) throw new AppError("Không tìm thấy người liên hệ.", 404);
  assertOwn(user, "customers.view", "customers.view.assigned", contact.customer.ownerId);
  await prisma.customerContact.delete({ where: { id: contactId } });
}

export async function listStaff() {
  return prisma.staff.findMany({ where: { active: true }, orderBy: { name: "asc" } });
}

export async function customerOptions(user: User) {
  const owner = listOwner(user, "customers.view", "customers.view.assigned");
  return prisma.customer.findMany({
    where: { status: "dang_dung", ...(owner ? { ownerId: owner } : {}) },
    select: { id: true, code: true, name: true },
    orderBy: { name: "asc" },
    take: 200,
  });
}
