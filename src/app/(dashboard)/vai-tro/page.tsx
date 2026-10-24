import { Suspense } from "react";
import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { hasCapability } from "@/shared/auth/types";
import { requireUser } from "@/shared/auth/session";
import { rethrowPage } from "@/shared/page";
import { RoleBoard } from "@/modules/access/role-board";
import { listRoles, listUsersWithRoles } from "@/modules/access/roles";

export const metadata: Metadata = { title: "Vai trò và quyền" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải vai trò...</p>}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  if (!hasCapability(user, "settings.manage")) forbidden();
  const query = await searchParams;
  const mo = one(query.mo);
  const hoSo = one(query["ho-so"]);
  const initialMode = mo === "them" ? "them" : (mo === "sua" || mo === "xem") && hoSo ? mo : null;
  let rows: Awaited<ReturnType<typeof listRoles>> = [];
  let accounts: Awaited<ReturnType<typeof listUsersWithRoles>> = [];
  try {
    [rows, accounts] = await Promise.all([listRoles(user), listUsersWithRoles(user)]);
  } catch (error) {
    rethrowPage(error);
  }
  return (
    <RoleBoard
      rows={rows}
      accounts={accounts.map((account) => ({ id: account.id, name: account.name }))}
      initialMode={initialMode}
      initialId={hoSo}
    />
  );
}
