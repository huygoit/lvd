import { prisma } from "@/shared/db";
import type { User } from "@/shared/auth/types";
import { AppError } from "@/shared/errors";
import { assertAny } from "@/modules/system/access";

export async function listWorkshopContacts(user: User) {
  assertAny(user, ["settings.manage"]);
  const [partners, contacts, users] = await Promise.all([
    prisma.partner.findMany({
      where: { status: "dang_dung", roles: { some: { role: "xuong_gia_cong" } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.workshopContact.findMany(),
    prisma.loginAccount.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const byId = new Map(contacts.map((row) => [row.id, row.userId]));
  const workshops = partners.map((row) => ({ id: row.id, name: row.name, userId: byId.get(row.id) ?? "" }));
  return {
    workshops,
    users: users.map((row) => ({ id: row.id, name: row.name })),
  };
}

export async function saveWorkshopContact(user: User, input: Record<string, unknown>) {
  assertAny(user, ["settings.manage"]);
  const id = typeof input.id === "string" ? input.id.trim() : "";
  const userId = typeof input.userId === "string" ? input.userId.trim() : "";
  if (!id) throw new AppError("Chọn xưởng.", 400);
  const partner = await prisma.partner.findFirst({
    where: { id, status: "dang_dung", roles: { some: { role: "xuong_gia_cong" } } },
    select: { id: true },
  });
  if (!partner) throw new AppError("Chọn đối tác đang dùng, có vai trò xưởng gia công.", 400);
  if (!userId) {
    await prisma.workshopContact.deleteMany({ where: { id } });
    return { id, userId: "" };
  }
  const account = await prisma.loginAccount.findFirst({ where: { id: userId, active: true }, select: { id: true } });
  if (!account) throw new AppError("Người liên hệ chưa có tài khoản đang dùng.", 400);
  await prisma.workshopContact.upsert({
    where: { id },
    create: { id, userId },
    update: { userId },
  });
  return { id, userId };
}
