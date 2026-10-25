import { Suspense } from "react";
import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { hasCapability } from "@/shared/auth/types";
import { requireUser } from "@/shared/auth/session";
import { rethrowPage } from "@/shared/page";
import { ReceiveScreen } from "@/modules/field/field-receive";

export const metadata: Metadata = { title: "Nhận tại xưởng" };

export default function Page({ searchParams }: { searchParams: Promise<{ phieu?: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải phiếu nhận xưởng...</p>}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ phieu?: string }> }) {
  const user = await requireUser();
  if (!hasCapability(user, "receive.workshop") && !hasCapability(user, "settings.manage")) forbidden();
  try {
    const query = await searchParams;
    return <ReceiveScreen slipId={typeof query.phieu === "string" ? query.phieu : ""} noi="xuong" />;
  } catch (error) {
    rethrowPage(error);
  }
}
