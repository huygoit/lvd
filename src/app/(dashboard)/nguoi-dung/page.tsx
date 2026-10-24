import { Suspense } from "react";
import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { hasCapability } from "@/shared/auth/types";
import { requireUser } from "@/shared/auth/session";
import { rethrowPage } from "@/shared/page";
import { listStaffWithoutLogin } from "@/modules/access/accounts";
import { UserBoard } from "@/modules/access/user-board";
import { listRoles, listUsersWithRoles } from "@/modules/access/roles";

export const metadata: Metadata = { title: "Người dùng" };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải người dùng...</p>}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requireUser();
  if (!hasCapability(user, "settings.manage")) forbidden();
  let rows: Awaited<ReturnType<typeof listUsersWithRoles>> = [];
  let roles: Awaited<ReturnType<typeof listRoles>> = [];
  let staff: Awaited<ReturnType<typeof listStaffWithoutLogin>> = [];
  try {
    [rows, roles, staff] = await Promise.all([listUsersWithRoles(user), listRoles(user), listStaffWithoutLogin(user)]);
  } catch (error) {
    rethrowPage(error);
  }
  return (
    <UserBoard
      rows={rows}
      roles={roles.map((role) => ({ id: role.id, name: role.name, active: role.active }))}
      staff={staff}
      actorId={user.id}
    />
  );
}
