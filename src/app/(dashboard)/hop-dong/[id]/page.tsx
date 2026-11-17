import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasAnyCapability } from "@/shared/auth/types";
import { requireUser } from "@/shared/auth/session";
import { rethrowPage } from "@/shared/page";
import { ContractBoard } from "@/modules/contracts/contract-board";
import { getContract } from "@/modules/contracts/service";

export const metadata: Metadata = { title: "Hợp đồng" };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải hợp đồng...</p>}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  let contract: Awaited<ReturnType<typeof getContract>> | null = null;
  try {
    contract = await getContract(user, id);
  } catch (error) {
    rethrowPage(error);
  }
  if (!contract) notFound();
  const canEdit = hasAnyCapability(user, ["contracts.update", "contracts.create"]);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/hop-dong" className="text-sm font-semibold text-primary">
        Hợp đồng
      </Link>

      <div className="overflow-hidden rounded-[22px] border border-line bg-gradient-to-br from-slate-50 via-white to-sky-50/40 p-5 shadow-[var(--shadow-card)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Số hợp đồng</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{contract.code}</h1>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/90 px-3.5 py-3 ring-1 ring-line/70">
            <dt className="text-[11px] font-medium text-muted">Công trình</dt>
            <dd className="mt-1">
              <Link href={`/cong-trinh/${contract.project.id}`} className="text-sm font-semibold text-primary">
                {contract.project.code} · {contract.project.name}
              </Link>
            </dd>
          </div>
          <div className="rounded-2xl bg-white/90 px-3.5 py-3 ring-1 ring-line/70">
            <dt className="text-[11px] font-medium text-muted">Khách hàng</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">{contract.customer.name}</dd>
          </div>
          <div className="rounded-2xl bg-white/90 px-3.5 py-3 ring-1 ring-line/70 sm:col-span-2">
            <dt className="text-[11px] font-medium text-muted">Báo giá</dt>
            <dd className="mt-1 text-sm">
              {contract.quotation ? (
                <Link
                  className="font-semibold text-primary"
                  href={`/bao-gia?mo=sua&id=${contract.quotation.id}&v=${contract.quotation.versionId}`}
                >
                  {contract.quotation.code} · phiên bản {contract.quotation.number}
                </Link>
              ) : (
                <span className="text-muted">Không gắn báo giá</span>
              )}
            </dd>
          </div>
        </dl>
      </div>

      <ContractBoard
        id={contract.id}
        revision={contract.revision}
        canEdit={canEdit}
        draft={{ name: contract.name, signedOn: contract.signedOn ?? "" }}
      />
    </div>
  );
}
