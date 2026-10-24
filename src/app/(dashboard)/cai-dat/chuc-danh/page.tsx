import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { hasCapability } from "@/shared/auth/types";
import { requireUser } from "@/shared/auth/session";
import { routes } from "@/shared/config/routes";
import { rethrowPage } from "@/shared/page";
import { CatalogTable } from "@/modules/settings/catalog-table";
import { listJobTitles } from "@/modules/settings/job-titles";

export const metadata: Metadata = { title: "Chức danh" };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải chức danh...</p>}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requireUser();
  if (!hasCapability(user, "settings.manage")) forbidden();
  let titles: Awaited<ReturnType<typeof listJobTitles>> = [];
  try {
    titles = await listJobTitles();
  } catch (error) {
    rethrowPage(error);
  }
  return (
    <div className="space-y-4">
      <div>
        <Link href={routes.settings} className="text-sm font-medium text-primary">Cài đặt</Link>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Chức danh</h1>
        <p className="mt-1 text-sm text-muted">Gõ thẳng trên bảng. Rời ô là lưu. Dòng Mới dùng cho người đại diện và người liên hệ.</p>
      </div>
      <CatalogTable initial={titles} label="Chức danh" placeholder="Giám đốc" endpoint="/api/cai-dat/chuc-danh" listKey="titles" />
    </div>
  );
}
