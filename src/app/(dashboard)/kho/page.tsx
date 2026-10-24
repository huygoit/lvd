import { Suspense } from "react";
import type { Metadata } from "next";
import { hasCapability } from "@/shared/auth/types";
import { requireUser } from "@/shared/auth/session";
import { rethrowPage } from "@/shared/page";
import { isStockSlipKind } from "@/shared/catalog/stock";
import { StockBoard } from "@/modules/stock/stock-board";
import { getSlip, listBalances, listPendingKg, listSlips, listStockOptions } from "@/modules/stock/service";

export const metadata: Metadata = { title: "Kho vật tư" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải kho...</p>}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const query = await searchParams;
  const view = one(query.muc) === "phieu" ? "phieu" : "ton";
  const q = one(query.q);
  const kind = one(query.loai);
  const place = one(query.cho);
  const includeClosed = one(query.het) === "1";
  const page = Number(one(query.trang) || 1);
  const mo = one(query.mo);
  const hoSo = one(query["ho-so"]);
  const canCreate = hasCapability(user, "inventory.create");
  const canUpdate = hasCapability(user, "inventory.update") || canCreate;
  const initialMode = mo === "them" && canCreate ? "them" : (mo === "sua" && canUpdate && hoSo) || (mo === "xem" && hoSo) ? mo : null;
  try {
    const [options, balances, slips, pending] = await Promise.all([
      listStockOptions(user),
      listBalances(user, { q: view === "ton" ? q : "", place, includeClosed }),
      listSlips(user, { q: view === "phieu" ? q : "", kind: isStockSlipKind(kind) ? kind : "", page }),
      listPendingKg(user),
    ]);
    const opened = hoSo && initialMode && initialMode !== "them" ? await getSlip(user, hoSo) : null;
    const pages = Math.max(1, Math.ceil(slips.total / slips.pageSize));
    return (
      <StockBoard
        view={view}
        balances={balances.rows}
        pending={pending}
        slips={slips.rows}
        opened={opened}
        projects={options.projects}
        partners={options.partners}
        q={q}
        kind={isStockSlipKind(kind) ? kind : ""}
        place={place}
        includeClosed={includeClosed}
        page={slips.page}
        pages={pages}
        total={view === "ton" ? balances.total : slips.total}
        canCreate={canCreate}
        canUpdate={canUpdate}
        initialMode={initialMode === "them" || initialMode === "sua" || initialMode === "xem" ? initialMode : null}
        initialId={hoSo}
      />
    );
  } catch (error) {
    rethrowPage(error);
  }
}
