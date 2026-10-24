import type { Prisma } from "@prisma/client";
import type { User } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { writeAudit } from "@/modules/system/audit";
import { assertAny } from "@/modules/system/access";
import { nextCode } from "@/modules/system/codes";
import { parseRoles, type PartnerRole } from "@/modules/partners/roles";
import { canonJobTitle } from "@/modules/settings/job-titles";

const pageSize = 15;

export type PartnerInput = {
  code?: string;
  name: string;
  shortName?: string;
  taxCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  bankName?: string;
  accountNumber?: string;
  address?: string;
  representativeName?: string;
  representativeTitle?: string;
  note?: string;
  roles: unknown;
  revision?: number;
};

export type PartnerWarning = {
  kind: "doi_tac" | "khach_hang";
  id: string;
  code: string;
  name: string;
};

function text(value: string | undefined) {
  return (value ?? "").trim();
}

function partnerCode(value: string | undefined, required: boolean) {
  const code = text(value).replace(/\s+/g, "");
  if (!code && required) throw new AppError("Cần nhập mã đối tác.", 400);
  if (code.length > 40) throw new AppError("Mã đối tác tối đa 40 ký tự.", 400);
  if (code && !/^[\p{L}\p{N}-]+$/u.test(code)) throw new AppError("Mã đối tác chỉ dùng chữ, số và dấu gạch.", 400);
  return code;
}

function normalizeTax(value: string) {
  return value.replace(/[\s.-]/g, "").toUpperCase();
}

function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function assertEmail(value: string) {
  if (!value) return;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new AppError("Email không đúng định dạng.", 400);
}

function assertPhone(value: string) {
  if (!value) return;
  const digits = phoneDigits(value);
  if (digits.length < 9 || digits.length > 12) throw new AppError("Điện thoại cần từ 9 đến 12 chữ số.", 400);
}

function assertTax(value: string) {
  if (!value) return;
  if (!/^\d{10}(\d{3})?$/.test(value)) throw new AppError("Mã số thuế cần 10 hoặc 13 chữ số.", 400);
}

function cleanWebsite(value: string) {
  const website = value.trim();
  if (!website) return "";
  if (website.length > 200 || /\s/.test(website)) throw new AppError("Website không đúng định dạng.", 400);
  return website;
}

function cleanSupplierBank(bankName: string, accountNumber: string) {
  const name = bankName.trim();
  const number = accountNumber.replace(/[\s.-]/g, "");
  if (!name && !number) return { bankName: "", accountNumber: "" };
  if (!name) throw new AppError("Cần nhập tên ngân hàng.", 400);
  if (!/^\d{6,20}$/.test(number)) throw new AppError("Số tài khoản cần từ 6 đến 20 chữ số.", 400);
  return { bankName: name, accountNumber: number };
}

function clean(input: PartnerInput) {
  const roles = parseRoles(input.roles);
  const taxCode = normalizeTax(text(input.taxCode));
  const email = text(input.email).toLowerCase();
  const phone = text(input.phone);
  const bank = cleanSupplierBank(text(input.bankName), text(input.accountNumber));
  assertEmail(email);
  assertPhone(phone);
  assertTax(taxCode);
  if (!text(input.name)) throw new AppError("Cần nhập tên đối tác.", 400);
  return {
    roles,
    name: text(input.name),
    shortName: text(input.shortName),
    taxCode,
    phone,
    email,
    website: cleanWebsite(text(input.website)),
    bankName: bank.bankName,
    accountNumber: bank.accountNumber,
    address: text(input.address),
    representativeName: text(input.representativeName),
    representativeTitle: text(input.representativeTitle),
    note: text(input.note),
  };
}

async function assertCodeFree(code: string, ignoreId?: string) {
  if (!code) return;
  const existing = await prisma.partner.findFirst({
    where: { code: { equals: code, mode: "insensitive" }, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
    select: { id: true, code: true, name: true },
  });
  if (existing) {
    const label = existing.name ? `${existing.code} · ${existing.name}` : existing.code;
    throw new AppError(`Mã đối tác đã thuộc ${label}.`, 409, { partnerId: existing.id });
  }
}

async function assertTaxFree(taxCode: string, ignoreId?: string) {
  if (!taxCode) return;
  const existing = await prisma.partner.findFirst({
    where: { taxCode, status: "dang_dung", ...(ignoreId ? { id: { not: ignoreId } } : {}) },
    select: { id: true, code: true, name: true },
  });
  if (existing) {
    throw new AppError(`Mã số thuế đã thuộc ${existing.code} · ${existing.name}.`, 409, { partnerId: existing.id });
  }
}

async function warningsFor(data: { name: string; phone: string; email: string; taxCode: string }, ignoreId?: string): Promise<PartnerWarning[]> {
  const rows = await prisma.partner.findMany({
    where: { status: "dang_dung", ...(ignoreId ? { id: { not: ignoreId } } : {}) },
    select: { id: true, code: true, name: true, phone: true, email: true, taxCode: true },
  });
  const phone = phoneDigits(data.phone);
  const similar = rows
    .filter((row) => {
      if (data.taxCode && row.taxCode === data.taxCode) return false;
      const sameName = data.name.toLocaleLowerCase("vi") === row.name.toLocaleLowerCase("vi");
      const samePhone = phone.length > 0 && phoneDigits(row.phone) === phone;
      const sameEmail = data.email.length > 0 && row.email.toLowerCase() === data.email;
      return sameName || samePhone || sameEmail;
    })
    .slice(0, 5)
    .map((row) => ({ kind: "doi_tac" as const, id: row.id, code: row.code, name: row.name }));
  if (!data.taxCode) return similar;
  const customer = await prisma.customer.findFirst({
    where: { taxCode: data.taxCode, status: "dang_dung" },
    select: { id: true, code: true, name: true },
  });
  if (!customer) return similar;
  return [...similar, { kind: "khach_hang", id: customer.id, code: customer.code, name: customer.name }];
}

function whereOf(filters: { q?: string; role?: string; status?: string }): Prisma.PartnerWhereInput {
  const q = filters.q?.trim();
  const tax = q ? normalizeTax(q) : "";
  return {
    status: filters.status || "dang_dung",
    ...(filters.role ? { roles: { some: { role: filters.role } } } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { shortName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { email: { contains: q, mode: "insensitive" } },
            ...(tax ? [{ taxCode: { contains: tax } }] : []),
          ],
        }
      : {}),
  };
}

function roleList(rows: { role: string }[]): PartnerRole[] {
  return parseRoles(rows.map((row) => row.role));
}

export async function listPartners(user: User, filters: { q?: string; role?: string; status?: string; page?: number }) {
  assertAny(user, ["partners.view"]);
  const page = Math.max(1, filters.page ?? 1);
  const where = whereOf(filters);
  const [total, rows] = await prisma.$transaction([
    prisma.partner.count({ where }),
    prisma.partner.findMany({
      where,
      include: {
        roles: true,
        contacts: { where: { isPrimary: true }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return {
    page,
    pageSize,
    total,
    rows: rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      shortName: row.shortName,
      phone: row.phone,
      email: row.email,
      taxCode: row.taxCode,
      status: row.status,
      roles: roleList(row.roles),
      contactName: row.contacts[0]?.name ?? "",
    })),
  };
}

export async function getPartner(user: User, id: string) {
  assertAny(user, ["partners.view"]);
  const row = await prisma.partner.findUnique({
    where: { id },
    include: {
      roles: true,
      contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
    },
  });
  if (!row) throw new AppError("Không tìm thấy đối tác.", 404);
  return { ...row, roles: roleList(row.roles) };
}

export async function createPartner(user: User, input: PartnerInput, now = new Date()) {
  assertAny(user, ["partners.create"]);
  const data = clean(input);
  data.representativeTitle = await canonJobTitle(data.representativeTitle);
  const requested = partnerCode(input.code, false);
  await assertCodeFree(requested);
  await assertTaxFree(data.taxCode);
  const warnings = await warningsFor(data);
  const created = await prisma.$transaction(async (tx) => {
    const code = requested || await nextCode(tx, "DT", now);
    const partner = await tx.partner.create({
      data: {
        code,
        name: data.name,
        shortName: data.shortName,
        taxCode: data.taxCode,
        phone: data.phone,
        email: data.email,
        website: data.website,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        address: data.address,
        representativeName: data.representativeName,
        representativeTitle: data.representativeTitle,
        note: data.note,
        roles: { create: data.roles.map((role) => ({ role })) },
      },
    });
    await writeAudit(tx, user.id, "tao", "doi_tac", partner.id, `Tạo đối tác ${code}`);
    return partner;
  });
  return { partner: created, warnings };
}

export async function updatePartner(user: User, id: string, input: PartnerInput) {
  assertAny(user, ["partners.update"]);
  const current = await prisma.partner.findUnique({ where: { id } });
  if (!current) throw new AppError("Không tìm thấy đối tác.", 404);
  if (current.revision !== input.revision) throw new AppError("Đối tác vừa được cập nhật. Hãy tải lại.", 409);
  const data = clean(input);
  data.representativeTitle = await canonJobTitle(data.representativeTitle, current.representativeTitle);
  const code = partnerCode(input.code, true);
  await assertCodeFree(code, id);
  await assertTaxFree(data.taxCode, id);
  const warnings = await warningsFor(data, id);
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.partner.updateMany({
      where: { id, revision: current.revision },
      data: {
        code,
        name: data.name,
        shortName: data.shortName,
        taxCode: data.taxCode,
        phone: data.phone,
        email: data.email,
        website: data.website,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        address: data.address,
        representativeName: data.representativeName,
        representativeTitle: data.representativeTitle,
        note: data.note,
        revision: { increment: 1 },
      },
    });
    if (updated.count === 0) throw new AppError("Đối tác vừa được cập nhật. Hãy tải lại.", 409);
    await tx.partnerRole.deleteMany({ where: { partnerId: id, role: { notIn: data.roles } } });
    for (const role of data.roles) {
      await tx.partnerRole.upsert({
        where: { partnerId_role: { partnerId: id, role } },
        create: { partnerId: id, role },
        update: {},
      });
    }
    await writeAudit(tx, user.id, "sua", "doi_tac", id, `Cập nhật ${code}`);
    return tx.partner.findUniqueOrThrow({ where: { id } });
  });
  return { partner: result, warnings };
}

export async function deletePartner(user: User, id: string) {
  assertAny(user, ["partners.archive"]);
  const current = await prisma.partner.findUnique({ where: { id } });
  if (!current) throw new AppError("Không tìm thấy đối tác.", 404);
  await prisma.$transaction(async (tx) => {
    await writeAudit(tx, user.id, "xoa", "doi_tac", id, `Xóa đối tác ${current.code}`);
    await tx.partner.delete({ where: { id } });
  });
}

export async function archivePartner(user: User, id: string) {
  assertAny(user, ["partners.archive"]);
  const current = await prisma.partner.findUnique({ where: { id } });
  if (!current) throw new AppError("Không tìm thấy đối tác.", 404);
  await prisma.$transaction(async (tx) => {
    await tx.partner.update({ where: { id }, data: { status: "luu_tru", revision: { increment: 1 } } });
    await writeAudit(tx, user.id, "luu_tru", "doi_tac", id, `Lưu trữ ${current.code}. Hồ sơ cũ vẫn giữ.`);
  });
}

export async function savePartnerContact(
  user: User,
  partnerId: string,
  input: { name: string; title?: string; phone?: string; email?: string; note?: string; isPrimary?: boolean },
) {
  assertAny(user, ["partners.update"]);
  const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
  if (!partner) throw new AppError("Không tìm thấy đối tác.", 404);
  const name = text(input.name);
  if (!name) throw new AppError("Cần nhập họ tên người liên hệ.", 400);
  const title = await canonJobTitle(text(input.title));
  const email = text(input.email).toLowerCase();
  const phone = text(input.phone);
  assertEmail(email);
  assertPhone(phone);
  await prisma.$transaction(async (tx) => {
    if (input.isPrimary) {
      await tx.partnerContact.updateMany({ where: { partnerId }, data: { isPrimary: false } });
    }
    const count = await tx.partnerContact.count({ where: { partnerId } });
    await tx.partnerContact.create({
      data: {
        partnerId,
        name,
        title,
        phone,
        email,
        note: text(input.note),
        isPrimary: Boolean(input.isPrimary) || count === 0,
      },
    });
    await writeAudit(tx, user.id, "lien_he", "doi_tac", partnerId, `Thêm người liên hệ ${name}`);
  });
}

export async function deletePartnerContact(user: User, contactId: string) {
  assertAny(user, ["partners.update"]);
  const contact = await prisma.partnerContact.findUnique({ where: { id: contactId } });
  if (!contact) throw new AppError("Không tìm thấy người liên hệ.", 404);
  await prisma.partnerContact.delete({ where: { id: contactId } });
}
