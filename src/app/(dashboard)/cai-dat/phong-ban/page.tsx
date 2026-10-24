import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { hasCapability } from "@/shared/auth/types";
import { requireUser } from "@/shared/auth/session";
import { routes } from "@/shared/config/routes";
import { rethrowPage } from "@/shared/page";
import { listDepartments } from "@/modules/settings/departments";
import { OrgScreen } from "@/modules/settings/org-screen";
import { listPositions } from "@/modules/settings/positions";
import { listStaffOrg } from "@/modules/settings/staff-org";

export const metadata: Metadata = { title: "Phòng ban" };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải phòng ban...</p>}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requireUser();
  if (!hasCapability(user, "settings.manage")) forbidden();
  let departments: Awaited<ReturnType<typeof listDepartments>> = [];
  let positions: Awaited<ReturnType<typeof listPositions>> = [];
  let staff: Awaited<ReturnType<typeof listStaffOrg>> = [];
  try {
    [departments, positions, staff] = await Promise.all([listDepartments(), listPositions(), listStaffOrg()]);
  } catch (error) {
    rethrowPage(error);
  }
  return (
    <div className="space-y-6">
      <div>
        <Link href={routes.settings} className="text-sm font-medium text-primary">Cài đặt</Link>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Phòng ban</h1>
        <p className="mt-1 text-sm text-muted">Gõ thẳng trên bảng. Rời ô là lưu. Ngừng dùng không gỡ người đang gắn.</p>
      </div>
      <OrgScreen
        kind="phong"
        label="Phòng ban"
        placeholder="Kinh doanh"
        endpoint="/api/cai-dat/phong-ban"
        listKey="departments"
        departments={departments}
        positions={positions}
        staff={staff}
      />
    </div>
  );
}
