import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { hasCapability } from "@/shared/auth/types";
import { requireUser } from "@/shared/auth/session";
import { routes } from "@/shared/config/routes";
import { rethrowPage } from "@/shared/page";
import { QuoteTemplateScreen } from "@/modules/settings/quote-template-screen";
import { getQuoteTemplateBundle } from "@/modules/settings/quote-templates";

export const metadata: Metadata = { title: "Mẫu báo giá" };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải mẫu báo giá...</p>}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requireUser();
  if (!hasCapability(user, "settings.manage")) forbidden();
  let bundle: Awaited<ReturnType<typeof getQuoteTemplateBundle>> | null = null;
  try {
    bundle = await getQuoteTemplateBundle();
  } catch (error) {
    rethrowPage(error);
  }
  if (!bundle) return null;
  return (
    <div className="space-y-4">
      <div>
        <Link href={routes.settings} className="text-sm font-medium text-primary">
          Cài đặt
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Mẫu báo giá (Excel)</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Giữ file Excel làm gốc. Khai báo biến đơn (ô cố định) và biến bảng <code>dong[]</code> (vùng lặp). Xem trước cách đổ dữ liệu trước khi nối xuất thật.
        </p>
      </div>
      <QuoteTemplateScreen initial={bundle} />
    </div>
  );
}
