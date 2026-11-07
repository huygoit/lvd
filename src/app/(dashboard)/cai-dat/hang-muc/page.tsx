import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { hasCapability } from "@/shared/auth/types";
import { requireUser } from "@/shared/auth/session";
import { routes } from "@/shared/config/routes";
import { rethrowPage } from "@/shared/page";
import { CategoryBoard } from "@/modules/settings/category-board";
import { listQuoteCategoryBundle } from "@/modules/settings/categories";

export const metadata: Metadata = { title: "Hạng mục báo giá" };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải hạng mục...</p>}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requireUser();
  if (!hasCapability(user, "settings.manage")) forbidden();
  let catalog: Awaited<ReturnType<typeof listQuoteCategoryBundle>> = { groups: [], categories: [] };
  try {
    catalog = await listQuoteCategoryBundle();
  } catch (error) {
    rethrowPage(error);
  }
  return (
    <div className="space-y-4">
      <div>
        <Link href={routes.settings} className="text-sm font-medium text-primary">
          Cài đặt
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Hạng mục báo giá</h1>
        <p className="mt-1 text-sm text-muted">
          Trái: cây nhóm cha–con (thêm, đổi tên, xóa, kéo thứ tự). Phải: hạng mục trong nhóm đang chọn kèm đơn vị và đơn giá tham chiếu.
        </p>
      </div>
      <CategoryBoard initial={catalog} />
    </div>
  );
}
