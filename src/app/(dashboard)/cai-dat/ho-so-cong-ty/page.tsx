import { Suspense } from "react";
import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { hasCapability } from "@/shared/auth/types";
import { requireUser } from "@/shared/auth/session";
import { rethrowPage } from "@/shared/page";
import { CompanyProfileScreen } from "@/modules/settings/company-profile-screen";
import { readCompanyProfile } from "@/modules/settings/company-profile";

export const metadata: Metadata = { title: "Hồ sơ công ty" };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải hồ sơ công ty...</p>}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requireUser();
  if (!hasCapability(user, "settings.manage")) forbidden();
  try {
    const hoSo = await readCompanyProfile(user);
    return <CompanyProfileScreen initial={hoSo} />;
  } catch (error) {
    rethrowPage(error);
  }
}
