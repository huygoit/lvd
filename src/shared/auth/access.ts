import type { Capability, User } from "@/shared/auth/types";
import { isCapability } from "@/shared/auth/permissions";
import { seedDefaultAccounts } from "@/shared/auth/account-seed";
import { seedDefaultRoles } from "@/shared/auth/role-seed";
import { prisma } from "@/shared/db";

function capsOf(values: string[]) {
  const list: Capability[] = [];
  for (const value of values) {
    const mapped = value === "orders.confirm" ? "receive.site" : value;
    if (isCapability(mapped) && !list.includes(mapped)) list.push(mapped);
  }
  return list;
}

export async function loadAccess(userId: string) {
  await seedDefaultRoles(prisma);
  const links = await prisma.userRole.findMany({
    where: { userId, role: { active: true } },
    include: { role: { select: { name: true, capabilities: true } } },
    orderBy: { role: { name: "asc" } },
  });
  const capabilities = capsOf(links.flatMap((link) => link.role.capabilities));
  const roleLabel = links.map((link) => link.role.name).join(", ") || "Chưa gán vai trò";
  return { roleLabel, capabilities };
}

export async function resolveUser(userId: string): Promise<User | null> {
  await seedDefaultAccounts(prisma);
  const account = await prisma.loginAccount.findUnique({
    where: { id: userId },
    select: { id: true, name: true, active: true },
  });
  if (!account || !account.active) return null;
  const access = await loadAccess(userId);
  const parts = account.name.trim().split(/\s+/);
  return {
    id: account.id,
    name: account.name,
    givenName: parts[parts.length - 1] || account.name,
    roleLabel: access.roleLabel,
    capabilities: access.capabilities,
  };
}
