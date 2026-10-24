import { Suspense } from "react";
import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { BackupScreen } from "@/modules/system/backup-screen";
import { listBackups } from "@/modules/system/backup";
import { hasCapability } from "@/shared/auth/types";
import { requireUser } from "@/shared/auth/session";
import { rethrowPage } from "@/shared/page";

export const metadata: Metadata = { title: "Sao lưu" };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải sao lưu...</p>}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requireUser();
  if (!hasCapability(user, "settings.manage")) forbidden();
  try {
    const backups = await listBackups(user);
    return <BackupScreen initial={backups} />;
  } catch (error) {
    rethrowPage(error);
  }
}
