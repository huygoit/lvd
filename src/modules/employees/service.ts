import type { Prisma } from "@prisma/client";
import type { User } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { writeAudit } from "@/modules/system/audit";
import { assertAny } from "@/modules/system/access";
import { seedDefaultAccounts } from "@/shared/auth/account-seed";

export type EmployeeInput = {
  name?: string;
  phone?: string;
  email?: string;
  note?: string;
  departmentId?: string;
  positionId?: string;
  active?: boolean;
};

function text(value: string | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function cleanPhone(value: string | undefined) {
  const digits = phoneDigits(text(value));
  if (!digits) return "";
  if (digits.length < 9 || digits.length > 12) throw new AppError("Điện thoại cần từ 9 đến 12 chữ số.", 400);
  return digits;
}

function cleanEmail(value: string | undefined) {
  const email = text(value).toLowerCase();
  if (!email) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError("Email không đúng định dạng.", 400);
  return email;
}

function cleanName(value: string | undefined) {
  const name = text(value);
  if (name.length < 2) throw new AppError("Tên nhân viên cần ít nhất 2 ký tự.", 400);
  if (name.length > 80) throw new AppError("Tên nhân viên tối đa 80 ký tự.", 400);
  return name;
}

async function cleanPlace(kind: "phong" | "chuc-vu", id: string, previous: string) {
  if (!id) return null;
  if (kind === "phong") {
    const row = await prisma.department.findUnique({ where: { id }, select: { id: true, active: true } });
    if (!row) throw new AppError("Phòng ban không còn trong danh mục.", 400);
    if (!row.active && row.id !== previous) throw new AppError("Phòng ban này đã ngừng dùng.", 400);
    return row.id;
  }
  const row = await prisma.position.findUnique({ where: { id }, select: { id: true, active: true } });
  if (!row) throw new AppError("Chức vụ không còn trong danh mục.", 400);
  if (!row.active && row.id !== previous) throw new AppError("Chức vụ này đã ngừng dùng.", 400);
  return row.id;
}

async function assertContactFree(phone: string, email: string, ignoreId?: string) {
  if (phone) {
    const existing = await prisma.staff.findFirst({
      where: { active: true, phone, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
      select: { name: true },
    });
    if (existing) throw new AppError(`Số điện thoại đã thuộc ${existing.name}.`, 409);
  }
  if (email) {
    const existing = await prisma.staff.findFirst({
      where: { active: true, email, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
      select: { name: true },
    });
    if (existing) throw new AppError(`Email đã thuộc ${existing.name}.`, 409);
  }
}

function present(row: {
  id: string;
  name: string;
  phone: string;
  email: string;
  note: string;
  active: boolean;
  departmentId: string | null;
  positionId: string | null;
  department: { name: string } | null;
  position: { name: string } | null;
}, accountName = "") {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    note: row.note,
    active: row.active,
    departmentId: row.departmentId ?? "",
    departmentName: row.department?.name ?? "",
    positionId: row.positionId ?? "",
    positionName: row.position?.name ?? "",
    accountName,
  };
}

const include = { department: { select: { name: true } }, position: { select: { name: true } } } satisfies Prisma.StaffInclude;

export async function listEmployees(
  user: User,
  filters: { q?: string; departmentId?: string; positionId?: string; status?: string },
) {
  assertAny(user, ["settings.manage"]);
  const q = filters.q?.trim();
  const digits = q ? phoneDigits(q) : "";
  const where: Prisma.StaffWhereInput = {
    active: filters.status === "ngung" ? false : true,
    ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
    ...(filters.positionId ? { positionId: filters.positionId } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            ...(digits ? [{ phone: { contains: digits } }] : []),
          ],
        }
      : {}),
  };
  const rows = await prisma.staff.findMany({
    where,
    include,
    orderBy: { name: "asc" },
  });
  await seedDefaultAccounts(prisma);
  const accounts = await prisma.loginAccount.findMany({
    where: { id: { in: rows.map((row) => row.id) } },
    select: { id: true, name: true },
  });
  const names = new Map(accounts.map((account) => [account.id, account.name]));
  return rows.map((row) => present(row, names.get(row.id) ?? ""));
}

export async function getEmployee(user: User, id: string) {
  assertAny(user, ["settings.manage"]);
  const row = await prisma.staff.findUnique({ where: { id }, include });
  if (!row) throw new AppError("Không tìm thấy nhân viên.", 404);
  await seedDefaultAccounts(prisma);
  const account = await prisma.loginAccount.findUnique({ where: { id }, select: { name: true } });
  return present(row, account?.name ?? "");
}

export async function createEmployee(user: User, input: EmployeeInput) {
  assertAny(user, ["settings.manage"]);
  const name = cleanName(input.name);
  const phone = cleanPhone(input.phone);
  const email = cleanEmail(input.email);
  const note = text(input.note).slice(0, 300);
  const departmentId = await cleanPlace("phong", text(input.departmentId), "");
  const positionId = await cleanPlace("chuc-vu", text(input.positionId), "");
  await assertContactFree(phone, email);
  return prisma.$transaction(async (tx) => {
    const row = await tx.staff.create({
      data: { name, phone, email, note, departmentId, positionId, active: true },
      include,
    });
    await writeAudit(tx, user.id, "tao", "nhan_vien", row.id, `Thêm nhân viên ${row.name}`);
    return present(row);
  });
}

export async function updateEmployee(user: User, id: string, input: EmployeeInput) {
  assertAny(user, ["settings.manage"]);
  const current = await prisma.staff.findUnique({ where: { id } });
  if (!current) throw new AppError("Không tìm thấy nhân viên.", 404);
  const name = input.name === undefined ? current.name : cleanName(input.name);
  const phone = input.phone === undefined ? current.phone : cleanPhone(input.phone);
  const email = input.email === undefined ? current.email : cleanEmail(input.email);
  const note = input.note === undefined ? current.note : text(input.note).slice(0, 300);
  const departmentId = input.departmentId === undefined
    ? current.departmentId
    : await cleanPlace("phong", text(input.departmentId), current.departmentId ?? "");
  const positionId = input.positionId === undefined
    ? current.positionId
    : await cleanPlace("chuc-vu", text(input.positionId), current.positionId ?? "");
  const active = input.active === undefined ? current.active : input.active;
  if (active) await assertContactFree(phone, email, id);
  return prisma.$transaction(async (tx) => {
    const row = await tx.staff.update({
      where: { id },
      data: { name, phone, email, note, departmentId, positionId, active },
      include,
    });
    await writeAudit(tx, user.id, "sua", "nhan_vien", row.id, `Cập nhật nhân viên ${row.name}`);
    return present(row);
  });
}
