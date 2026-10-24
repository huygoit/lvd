import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasAnyCapability, hasCapability } from "@/shared/auth/types";
import { requireUser } from "@/shared/auth/session";
import { panelClass } from "@/shared/components/controls";
import { formatVnd } from "@/shared/lib/money";
import { rethrowPage } from "@/shared/page";
import { ContractBoard } from "@/modules/contracts/contract-board";
import { ScopeTree } from "@/modules/contracts/scope-tree";
import { contractInternalLabel, contractKindLabel, effectLabel, executionLabel, priceBasisLabel, signLabel } from "@/modules/contracts/labels";
import { getContract } from "@/modules/contracts/service";

export const metadata: Metadata = { title: "Hợp đồng" };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải hợp đồng...</p>}>
      <Content params={params} />
    </Suspense>
  );
}

function money(value: number | null) {
  return value === null ? "Chưa có" : formatVnd(value);
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
  const frozen = contract.signStatus === "da_ky" || contract.effectStatus !== "chua_hieu_luc";
  const editable = contract.internalStatus === "nhap" || contract.internalStatus === "yeu_cau_chinh";
  const canEdit = hasAnyCapability(user, ["contracts.update", "contracts.create"]);
  return (
    <div className="space-y-4">
      <Link href={`/cong-trinh/${contract.project.id}`} className="text-sm font-semibold text-primary">{contract.project.code} · {contract.project.name}</Link>
      <div>
        <h1 className="text-2xl font-semibold">{contract.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {contract.code} · {contractKindLabel[contract.kind as keyof typeof contractKindLabel]} · {contract.customer.name}
        </p>
        <p className="mt-1 text-sm">
          {contractInternalLabel[contract.internalStatus as keyof typeof contractInternalLabel]} · {signLabel[contract.signStatus as keyof typeof signLabel]} · {effectLabel[contract.effectStatus as keyof typeof effectLabel]} · {executionLabel[contract.executionStatus as keyof typeof executionLabel]}
        </p>
        <p className="mt-1 text-sm text-muted">{priceBasisLabel[contract.priceBasis as keyof typeof priceBasisLabel]}{contract.priceNote ? ` · ${contract.priceNote}` : ""}</p>
        {contract.quotation ? <p className="mt-1 text-sm">Nguồn <Link className="font-semibold text-primary" href={`/bao-gia/${contract.quotation.id}?v=${contract.quotation.versionId}`}>{contract.quotation.code} phiên bản {contract.quotation.number}</Link></p> : <p className="mt-1 text-sm text-muted">Không qua báo giá trong hệ thống.</p>}
      </div>
      <section className={`${panelClass} p-4`}>
        <p className="text-sm">Tổng ký khai báo: {money(contract.declaredSignedTotal)}. Tổng dòng lá: {money(contract.lineSumSigned)}.</p>
        {contract.signedWarning ? <p className="mt-1 text-sm text-warning">{contract.signedWarning}</p> : null}
        {contract.canSeeAdmin ? (
          <p className="mt-2 text-sm">Tổng quản trị khai báo: {money(contract.declaredAdminTotal)}. Tổng dòng quản trị: {money(contract.lineSumAdmin)}. Không phải lợi nhuận.</p>
        ) : <p className="mt-2 text-sm text-muted">Giá quản trị chỉ hiện với quyền được cấp. Tài khoản quản trị không mặc định có quyền này.</p>}
        {contract.adminWarning ? <p className="mt-1 text-sm text-warning">{contract.adminWarning}</p> : null}
      </section>
      <ScopeTree
        contractId={contract.id}
        contractCode={contract.code}
        canEdit={canEdit}
        canAdmin={contract.canSeeAdmin}
        frozen={frozen}
        lines={contract.lines.map((line) => ({
          id: line.id,
          parentId: line.parentId,
          kind: line.kind,
          code: line.code,
          name: line.name,
          unit: line.unit,
          quantity: line.quantity,
          currentQuantity: line.currentQuantity,
          widthMm: line.widthMm,
          heightMm: line.heightMm,
          signedAmount: line.signedAmount,
          adminAmount: line.adminAmount,
        }))}
      />
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[18px] border border-line bg-white p-4 text-sm">
          <h2 className="font-semibold">Mốc</h2>
          {contract.milestones.length === 0 ? <p className="mt-2 text-muted">Chưa có mốc. Chưa đủ điều kiện thì chưa tự chốt ngày bắt đầu.</p> : (
            <ul className="mt-2 space-y-1">{contract.milestones.map((item) => <li key={item.id}>{item.name}{item.planOn ? ` · ${item.planOn}` : " · chưa có ngày"}</li>)}</ul>
          )}
        </div>
        <div className="rounded-[18px] border border-line bg-white p-4 text-sm">
          <h2 className="font-semibold">Lịch thanh toán</h2>
          <p className="mt-1 text-xs text-muted">Kế hoạch thu. Không trừ tạm ứng, không ghi đã thu, chưa có dữ liệu tài chính.</p>
          {contract.payments.length === 0 ? <p className="mt-2 text-muted">Chưa có đợt.</p> : (
            <ul className="mt-2 space-y-1">{contract.payments.map((item) => <li key={item.id}>{item.name} · {item.amount === null ? "Chưa có số tiền" : formatVnd(item.amount)}</li>)}</ul>
          )}
        </div>
      </section>
      <section className="rounded-[18px] border border-line bg-white p-4 text-sm text-muted">
        <p>Gia công: {contract.quantitySources.fabrication}.</p>
        <p>Thi công: {contract.quantitySources.installed}.</p>
        <p>Nghiệm thu: {contract.quantitySources.accepted}.</p>
      </section>
      <ContractBoard
        id={contract.id}
        revision={contract.revision}
        frozen={frozen}
        canEdit={canEdit}
        lines={contract.lines.map((line) => ({ id: line.id, kind: line.kind, code: line.code, name: line.name }))}
        changes={contract.changes}
        flags={{
          submit: editable && hasAnyCapability(user, ["contracts.submit", "contracts.create"]),
          withdraw: contract.internalStatus === "cho_duyet" && hasAnyCapability(user, ["contracts.submit", "contracts.update"]),
          approve: contract.internalStatus === "cho_duyet" && hasCapability(user, "contracts.approve") && contract.ownerId !== user.id,
          sign: contract.internalStatus === "da_duyet" && contract.signStatus === "chua_ky" && hasCapability(user, "contracts.sign"),
          effect: contract.signStatus === "da_ky" && contract.effectStatus === "chua_hieu_luc" && hasCapability(user, "contracts.effect"),
        }}
        draft={{
          name: contract.name,
          signedNumber: contract.signedNumber,
          priceBasis: contract.priceBasis,
          scopeText: contract.scopeText,
          paymentText: contract.paymentText,
          warrantyText: contract.warrantyText,
          declaredSignedTotal: contract.declaredSignedTotal,
        }}
      />
    </div>
  );
}
