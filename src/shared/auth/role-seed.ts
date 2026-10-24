import type { Prisma, PrismaClient } from "@prisma/client";
import { defaultMembers, defaultRoles } from "@/shared/auth/role-defaults";

type Db = PrismaClient | Prisma.TransactionClient;

export async function seedDefaultRoles(db: Db) {
  const count = await db.role.count();
  if (count > 0) return;
  for (const role of defaultRoles) {
    await db.role.create({
      data: {
        id: role.id,
        name: role.name,
        description: role.description,
        active: true,
        capabilities: [...role.capabilities],
      },
    });
  }
  for (const member of defaultMembers) {
    await db.userRole.create({ data: member });
  }
}
