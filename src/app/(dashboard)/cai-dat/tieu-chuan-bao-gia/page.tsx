import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { hasCapability } from "@/shared/auth/types";
import { requireUser } from "@/shared/auth/session";
import { routes } from "@/shared/config/routes";
import { rethrowPage } from "@/shared/page";
import { QuoteStandardScreen } from "@/modules/settings/quote-standard-screen";
import { getTieuChuanBaoGia } from "@/modules/settings/quote-standard";

export const metadata: Metadata = { title: "Tiêu chuẩn báo giá" };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải cấu hình…</p>}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requireUser();
  if (!hasCapability(user, "settings.manage")) forbidden();
  let initial: Awaited<ReturnType<typeof getTieuChuanBaoGia>> | null = null;
  try {
    initial = await getTieuChuanBaoGia(user);
  } catch (error) {
    rethrowPage(error);
  }
  if (!initial) return null;
  return (
    <div className="space-y-4">
      <div>
        <Link href={routes.settings} className="text-sm font-medium text-primary">
          Cài đặt
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Tiêu chuẩn báo giá</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Cấu hình lời chào, thuế VAT, hiệu lực, bảo hành và đợt thanh toán mặc định. Báo giá mới sẽ nạp sẵn các giá trị này.
        </p>
      </div>
      <QuoteStandardScreen initial={initial} />
    </div>
  );
}
