import { randomUUID } from "node:crypto";
import type { User } from "@/shared/auth/types";
import { hashPassword } from "@/shared/auth/password";
import { seedDefaultAccounts } from "@/shared/auth/account-seed";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { writeAudit } from "@/modules/system/audit";
import { assertAny } from "@/modules/system/access";
import { setUserRoles } from "@/modules/access/roles";

function text(value: string | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function cleanName(value: string | undefined) {
  const name = text(value);
  if (name.length < 2) throw new AppError("Họ tên cần ít nhất 2 ký tự.", 400);
  if (name.length > 80) throw new AppError("Họ tên tối đa 80 ký tự.", 400);
  return name;
}

function cleanUsername(value: string | undefined) {
  const username = text(value).toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) {
    throw new AppError("Tên đăng nhập từ 3 đến 32 ký tự, bắt đầu bằng chữ hoặc số, chỉ gồm chữ không dấu, số, dấu chấm và gạch.", 400);
  }
  return username;
}

function cleanPassword(value: string | undefined, required: boolean) {
  const password = value ?? "";
  if (!password) {
    if (required) throw new AppError("Hãy nhập mật khẩu.", 400);
    return "";
  }
  if (password.length < 8) throw new AppError("Mật khẩu cần ít nhất 8 ký tự.", 400);
  if (password.length > 72) throw new AppError("Mật khẩu tối đa 72 ký tự.", 400);
  return password;
}

async function assertUsernameFree(username: string, ignoreId?: string) {
  const existing = await prisma.loginAccount.findFirst({
    where: { username, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
    select: { id: true },
  });
  if (existing) throw new AppError("Tên đăng nhập đã có.", 409);
}

export async function listStaffWithoutLogin(user: User) {
  assertAny(user, ["settings.manage"]);
  await seedDefaultAccounts(prisma);
  return prisma.staff.findMany({
    where: { loginAccount: { is: null } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function createLoginAccount(
  user: User,
  input: { name?: string; username?: string; password?: string; roleIds?: unknown; staffId?: string },
) {
  assertAny(user, ["settings.manage"]);
  await seedDefaultAccounts(prisma);
  const name = cleanName(input.name);
  const username = cleanUsername(input.username);
  const password = cleanPassword(input.password, true);
  const staffId = text(input.staffId);
  await assertUsernameFree(username);
  const passwordHash = await hashPassword(password);
  let id: string = randomUUID();
  if (staffId) {
    const staff = await prisma.staff.findUnique({ where: { id: staffId }, select: { id: true } });
    if (!staff) throw new AppError("Không tìm thấy nhân viên.", 400);
    const taken = await prisma.loginAccount.findUnique({ where: { id: staffId }, select: { id: true } });
    if (taken) throw new AppError("Nhân viên này đã có tài khoản.", 409);
    id = staffId;
  }
  await prisma.$transaction(async (tx) => {
    if (!staffId) await tx.staff.create({ data: { id, name, active: true } });
    await tx.loginAccount.create({ data: { id, username, name, passwordHash, active: true } });
    await writeAudit(tx, user.id, "tao", "nguoi_dung", id, `Thêm tài khoản ${username}`);
  });
  if (input.roleIds !== undefined) await setUserRoles(user, id, input.roleIds);
  return { id };
}

export async function updateLoginAccount(
  user: User,
  id: string,
  input: { name?: string; username?: string; password?: string; active?: boolean; roleIds?: unknown },
) {
  assertAny(user, ["settings.manage"]);
  const current = await prisma.loginAccount.findUnique({ where: { id } });
  if (!current) throw new AppError("Không tìm thấy tài khoản.", 404);
  if (input.active === false && id === user.id) throw new AppError("Không tự khóa tài khoản đang đăng nhập.", 400);
  const name = input.name === undefined ? current.name : cleanName(input.name);
  const username = input.username === undefined ? current.username : cleanUsername(input.username);
  const password = input.password === undefined ? "" : cleanPassword(input.password, false);
  const active = input.active === undefined ? current.active : input.active;
  if (username !== current.username) await assertUsernameFree(username, id);
  const passwordHash = password ? await hashPassword(password) : undefined;
  await prisma.$transaction(async (tx) => {
    await tx.loginAccount.update({
      where: { id },
      data: { name, username, active, ...(passwordHash ? { passwordHash } : {}) },
    });
    await writeAudit(tx, user.id, "sua", "nguoi_dung", id, `Cập nhật tài khoản ${username}`);
  });
  if (input.roleIds !== undefined) await setUserRoles(user, id, input.roleIds);
  return { id };
}
