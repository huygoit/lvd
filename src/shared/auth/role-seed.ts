import type { Prisma, PrismaClient } from "@prisma/client";
import { defaultMembers, defaultRoles } from "@/shared/auth/role-defaults";
import { users } from "@/shared/auth/users";

type Db = PrismaClient | Prisma.TransactionClient;

export async function seedDefaultRoles(db: Db) {
  for (const role of defaultRoles) {
    const existing = await db.role.findUnique({ where: { id: role.id }, select: { capabilities: true } });
    if (!existing) {
      await db.role.create({
        data: {
          id: role.id,
          name: role.name,
          description: role.description,
          active: true,
          capabilities: [...role.capabilities],
        },
      });
      continue;
    }
    const have = new Set(existing.capabilities);
    const missing = role.capabilities.filter((cap) => !have.has(cap));
    if (missing.length === 0) continue;
    await db.role.update({
      where: { id: role.id },
      data: { capabilities: [...existing.capabilities, ...missing] },
    });
  }
  for (const member of defaultMembers) {
    const profile = users.find((item) => item.id === member.userId);
    if (profile) {
      await db.staff.upsert({
        where: { id: profile.id },
        update: {},
        create: { id: profile.id, name: profile.name, active: true },
      });
    }
    await db.userRole.upsert({
      where: { userId_roleId: { userId: member.userId, roleId: member.roleId } },
      update: {},
      create: member,
    });
  }
}
