import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { Capability, User } from "@/shared/auth/types";
import { findUser } from "@/shared/auth/users";
import { seedDefaultAccounts } from "@/shared/auth/account-seed";
import { isCapability } from "@/shared/auth/permissions";
import { seedDefaultRoles } from "@/shared/auth/role-seed";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { writeAudit } from "@/modules/system/audit";
import { assertAny } from "@/modules/system/access";

export type RoleInput = {
  name?: string;
  description?: string;
  active?: boolean;
  capabilities?: unknown;
  userIds?: unknown;
};

function text(value: string | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function cleanName(value: string | undefined) {
  const name = text(value);
  if (name.length < 2) throw new AppError("Tên vai trò cần ít nhất 2 ký tự.", 400);
  if (name.length > 80) throw new AppError("Tên vai trò tối đa 80 ký tự.", 400);
  return name;
}

function cleanCaps(value: unknown) {
  if (!Array.isArray(value)) throw new AppError("Danh sách quyền không đúng.", 400);
  const list: Capability[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !isCapability(item)) throw new AppError("Có quyền không có trong hệ thống.", 400);
    if (!list.includes(item)) list.push(item);
  }
  return list;
}

async function cleanUserIds(value: unknown) {
  if (!Array.isArray(value)) throw new AppError("Danh sách người dùng không đúng.", 400);
  const list: string[] = [];
  for (const item of value) {
    const id = typeof item === "string" ? item : "";
    if (!id || list.includes(id)) continue;
    list.push(id);
  }
  await seedDefaultAccounts(prisma);
  const found = await prisma.loginAccount.findMany({ where: { id: { in: list } }, select: { id: true } });
  if (found.length !== list.length) throw new AppError("Có tài khoản không tồn tại.", 400);
  return list;
}

async function assertNameFree(name: string, ignoreId?: string) {
  const existing = await prisma.role.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
    select: { id: true },
  });
  if (existing) throw new AppError("Tên vai trò đã có.", 409);
}

type RoleRow = {
  id: string;
  name: string;
  description: string;
  active: boolean;
  capabilities: string[];
  members: Array<{ userId: string }>;
};

function present(row: RoleRow, names: Map<string, string>) {
  const userIds = row.members.map((member) => member.userId);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    active: row.active,
    capabilities: [...new Set(row.capabilities.flatMap((item) => item === "orders.confirm" ? ["receive.site" as const] : isCapability(item) ? [item] : []))],
    userIds,
    userNames: userIds.flatMap((id) => {
      const name = names.get(id) || findUser(id)?.name;
      return name ? [name] : [];
    }),
  };
}

async function accountNames() {
  await seedDefaultAccounts(prisma);
  const rows = await prisma.loginAccount.findMany({ select: { id: true, name: true } });
  return new Map(rows.map((row) => [row.id, row.name]));
}

const include = { members: { select: { userId: true }, orderBy: { userId: "asc" as const } } };

async function capsAfter(
  tx: Prisma.TransactionClient,
  userId: string,
  rolePatch?: { id: string; active: boolean; capabilities: string[]; userIds: string[] },
  userPatch?: { userId: string; roleIds: string[] },
) {
  const links = await tx.userRole.findMany({
    where: { userId },
    include: { role: { select: { id: true, active: true, capabilities: true } } },
  });
  const caps = new Set<string>();
  for (const link of links) {
    if (rolePatch && link.roleId === rolePatch.id) continue;
    if (userPatch && userPatch.userId === userId) continue;
    if (!link.role.active) continue;
    for (const capability of link.role.capabilities) caps.add(capability);
  }
  if (rolePatch && rolePatch.active && rolePatch.userIds.includes(userId)) {
    for (const capability of rolePatch.capabilities) caps.add(capability);
  }
  if (userPatch && userPatch.userId === userId) {
    const roles = await tx.role.findMany({
      where: { id: { in: userPatch.roleIds }, active: true },
      select: { id: true, capabilities: true },
    });
    for (const role of roles) {
      if (rolePatch && role.id === rolePatch.id) continue;
      for (const capability of role.capabilities) caps.add(capability);
    }
  }
  return caps;
}

async function keepOwnAdmin(
  tx: Prisma.TransactionClient,
  actorId: string,
  rolePatch?: { id: string; active: boolean; capabilities: string[]; userIds: string[] },
  userPatch?: { userId: string; roleIds: string[] },
) {
  const caps = await capsAfter(tx, actorId, rolePatch, userPatch);
  if (!caps.has("settings.manage")) {
    throw new AppError("Bạn đang bỏ quyền quản trị của chính mình. Hãy giữ quyền sửa vai trò.", 400);
  }
}

export async function listRoles(user: User) {
  assertAny(user, ["settings.manage"]);
  await seedDefaultRoles(prisma);
  const rows = await prisma.role.findMany({ include, orderBy: { name: "asc" } });
  const names = await accountNames();
  return rows.map((row) => present(row, names));
}

export async function getRole(user: User, id: string) {
  assertAny(user, ["settings.manage"]);
  const row = await prisma.role.findUnique({ where: { id }, include });
  if (!row) throw new AppError("Không tìm thấy vai trò.", 404);
  return present(row, await accountNames());
}

async function writeMembers(tx: Prisma.TransactionClient, roleId: string, userIds: string[]) {
  await tx.userRole.deleteMany({ where: { roleId } });
  if (userIds.length === 0) return;
  await tx.userRole.createMany({ data: userIds.map((userId) => ({ userId, roleId })) });
}

export async function createRole(user: User, input: RoleInput) {
  assertAny(user, ["settings.manage"]);
  const name = cleanName(input.name);
  const description = text(input.description).slice(0, 300);
  const capabilities = cleanCaps(input.capabilities ?? []);
  const userIds = await cleanUserIds(input.userIds ?? []);
  await assertNameFree(name);
  return prisma.$transaction(async (tx) => {
    const row = await tx.role.create({
      data: { id: randomUUID(), name, description, active: true, capabilities },
      include,
    });
    await writeMembers(tx, row.id, userIds);
    await keepOwnAdmin(tx, user.id, { id: row.id, active: true, capabilities, userIds });
    await writeAudit(tx, user.id, "tao", "vai_tro", row.id, `Thêm vai trò ${name}`);
    const saved = await tx.role.findUniqueOrThrow({ where: { id: row.id }, include });
    return present(saved, await accountNames());
  });
}

export async function updateRole(user: User, id: string, input: RoleInput) {
  assertAny(user, ["settings.manage"]);
  const current = await prisma.role.findUnique({ where: { id }, include });
  if (!current) throw new AppError("Không tìm thấy vai trò.", 404);
  const name = input.name === undefined ? current.name : cleanName(input.name);
  const description = input.description === undefined ? current.description : text(input.description).slice(0, 300);
  const active = input.active === undefined ? current.active : input.active;
  const capabilities = input.capabilities === undefined ? current.capabilities.filter(isCapability) : cleanCaps(input.capabilities);
  const userIds = input.userIds === undefined ? current.members.map((member) => member.userId) : await cleanUserIds(input.userIds);
  if (name.toLowerCase() !== current.name.toLowerCase()) await assertNameFree(name, id);
  return prisma.$transaction(async (tx) => {
    await keepOwnAdmin(tx, user.id, { id, active, capabilities, userIds });
    await tx.role.update({ where: { id }, data: { name, description, active, capabilities } });
    if (input.userIds !== undefined) await writeMembers(tx, id, userIds);
    await writeAudit(tx, user.id, "sua", "vai_tro", id, `Cập nhật vai trò ${name}`);
    const saved = await tx.role.findUniqueOrThrow({ where: { id }, include });
    return present(saved, await accountNames());
  });
}

export async function listUsersWithRoles(user: User) {
  assertAny(user, ["settings.manage"]);
  await seedDefaultRoles(prisma);
  await seedDefaultAccounts(prisma);
  const [accounts, roles] = await Promise.all([
    prisma.loginAccount.findMany({ orderBy: { name: "asc" } }),
    prisma.role.findMany({
      select: { id: true, name: true, active: true, capabilities: true, members: { select: { userId: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  return accounts.map((account) => {
    const owned = roles.filter((role) => role.members.some((member) => member.userId === account.id));
    const activeRoles = owned.filter((role) => role.active);
    const capabilities = new Set(activeRoles.flatMap((role) => role.capabilities));
    return {
      id: account.id,
      username: account.username,
      name: account.name,
      active: account.active,
      roleIds: owned.map((role) => role.id),
      roleNames: activeRoles.map((role) => role.name),
      permissionCount: [...capabilities].filter(isCapability).length,
    };
  });
}

export async function setUserRoles(user: User, userId: string, roleIds: unknown) {
  assertAny(user, ["settings.manage"]);
  const account = await prisma.loginAccount.findUnique({ where: { id: userId }, select: { name: true } });
  if (!account) throw new AppError("Không tìm thấy tài khoản.", 404);
  if (!Array.isArray(roleIds)) throw new AppError("Danh sách vai trò không đúng.", 400);
  const picked = [...new Set(roleIds.filter((item): item is string => typeof item === "string" && item.length > 0))];
  const found = await prisma.role.findMany({ where: { id: { in: picked } }, select: { id: true, active: true } });
  if (found.length !== picked.length) throw new AppError("Có vai trò không còn trong danh mục.", 400);
  const current = await prisma.userRole.findMany({ where: { userId }, select: { roleId: true } });
  const currentIds = new Set(current.map((item) => item.roleId));
  for (const role of found) {
    if (!role.active && !currentIds.has(role.id)) throw new AppError("Không gán thêm vai trò đã ngừng dùng.", 400);
  }
  return prisma.$transaction(async (tx) => {
    await keepOwnAdmin(tx, user.id, undefined, { userId, roleIds: picked });
    await tx.userRole.deleteMany({ where: { userId } });
    if (picked.length > 0) await tx.userRole.createMany({ data: picked.map((roleId) => ({ userId, roleId })) });
    await writeAudit(tx, user.id, "sua", "nguoi_dung", userId, `Gán vai trò cho ${account.name}`);
    return { id: userId, roleIds: picked };
  });
}
