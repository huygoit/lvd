import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { hasCapability } from "@/shared/auth/types";
import { requireUser } from "@/shared/auth/session";
import { routes } from "@/shared/config/routes";
import { rethrowPage } from "@/shared/page";
import { listWorkshopContacts } from "@/modules/settings/workshops";
import { WorkshopScreen } from "@/modules/settings/workshop-screen";

export const metadata: Metadata = { title: "Người nhận xưởng" };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải xưởng...</p>}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requireUser();
  if (!hasCapability(user, "settings.manage")) forbidden();
  try {
    const data = await listWorkshopContacts(user);
    return (
      <section className="space-y-4">
        <div>
          <Link href={routes.settings} className="text-sm font-medium text-primary">Cài đặt</Link>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Người nhận xưởng</h1>
          <p className="mt-1 text-sm text-muted">Chỉ đối tác đang dùng, có vai trò xưởng gia công. Gán một người liên hệ cho từng nhà xưởng.</p>
        </div>
        <WorkshopScreen workshops={data.workshops} users={data.users} />
      </section>
    );
  } catch (error) {
    rethrowPage(error);
  }
}
