"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, ChevronDown, HardHat, Package, TriangleAlert, Truck, Wrench } from "lucide-react";
import { formatStockQty } from "@/shared/catalog/stock";
import { callApi } from "@/shared/client/api";
import { cn } from "@/shared/lib/cn";

type Slip = {
  id: string;
  code: string;
  kindLabel: string;
  postedOn: string;
  partnerName: string;
  documentQty: number;
  receivedQty: number;
  mismatch: boolean;
};

type SavedOrder = {
  key: string;
  code: string;
  orderedOn: string;
  supplierName: string;
  qty: number;
  lengthMm: number;
};

type MaterialRow = {
  materialId: string;
  code: string;
  name: string;
  unit: string;
  glass: boolean;
  site: number;
  installed: number;
  broken: number;
  ordered: number;
  made: number;
  held: number;
  shipping: number;
  orderQty: number;
  mismatch: boolean;
  slips: Slip[];
  orders: SavedOrder[];
};

type View = {
  materials: MaterialRow[];
  counts: { site: number; installed: number; broken: number; away: number };
};

const filters = [
  { id: "site", label: "Đang ở công trình", hint: "Còn hàng chưa lắp", icon: Building2, tone: "text-primary bg-primary/10" },
  { id: "installed", label: "Đã lắp", hint: "Không còn dùng được", icon: Wrench, tone: "text-success bg-success/10" },
  { id: "broken", label: "Hỏng, vỡ", hint: "Cần xử lý", icon: TriangleAlert, tone: "text-danger bg-danger/10" },
  { id: "away", label: "Ở NCC hoặc xưởng", hint: "Kể cả hàng đang giao", icon: Truck, tone: "text-primary bg-primary/10" },
] as const;

type FilterId = (typeof filters)[number]["id"];

function qtyText(value: number) {
  return value > 0 ? formatStockQty(value) : "—";
}

function lengthText(mm: number) {
  if (!mm) return "";
  const meters = Math.round(mm) / 1000;
  const rounded = Math.round(meters * 1000) / 1000;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
}

function matches(row: MaterialRow, filter: FilterId) {
  if (filter === "site") return row.site > 0;
  if (filter === "installed") return row.installed > 0;
  if (filter === "broken") return row.broken > 0;
  return row.ordered + row.made + row.held + row.orderQty + row.shipping > 0;
}

function awayText(row: MaterialRow) {
  const order = row.orderQty > 0 ? `Đơn hàng ${formatStockQty(row.orderQty)}` : "";
  const shipping = row.shipping > 0 ? `Đang giao ${formatStockQty(row.shipping)}` : "";
  if (!row.glass) {
    const held = row.held > 0 ? qtyText(row.held) : "";
    return [shipping, held, order].filter(Boolean).join(" · ") || "—";
  }
  const parts = [
    shipping,
    row.ordered > 0 ? `Đã đặt ${formatStockQty(row.ordered)}` : "",
    row.made > 0 ? `Đã sản xuất ${formatStockQty(row.made)}` : "",
    row.held > 0 ? `NCC giữ ${formatStockQty(row.held)}` : "",
    order,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

export function ProjectMaterials({ projectId }: { projectId: string }) {
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterId>("site");
  const [openId, setOpenId] = useState("");

  useEffect(() => {
    let cancelled = false;
    setView(null);
    setError("");
    callApi<View>(`/api/cong-trinh/${projectId}/vat-tu`)
      .then((data) => {
        if (!cancelled) setView(data);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Không tải được vật tư.");
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const rows = view?.materials.filter((row) => matches(row, filter)) ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {filters.map((item) => {
          const Icon = item.icon;
          const active = filter === item.id;
          const count = view?.counts[item.id];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                "rounded-xl border bg-white px-4 py-3 text-left transition",
                active ? "border-primary shadow-[0_0_0_3px_rgba(29,78,216,0.12)]" : "border-line hover:border-primary/40",
              )}
            >
              <span className={cn("flex size-9 items-center justify-center rounded-lg", item.tone)}>
                <Icon className="size-4" />
              </span>
              <p className="mt-3 text-sm text-muted">{item.label}</p>
              <p className="mt-1 text-[28px] font-semibold leading-none text-ink">{count ?? "—"}</p>
              <p className="mt-1 text-xs text-muted">{item.hint} · số mã</p>
            </button>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex items-start gap-3 border-b border-line px-4 py-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Package className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink">LVD cấp vật tư</h2>
            <p className="text-xs text-muted">Hàng công ty đưa vào công trình. Tới nơi vẫn là đang giữ, bấm dòng để xem phiếu.</p>
          </div>
        </div>
        {error ? <p className="px-4 py-6 text-sm text-danger" role="alert">{error}</p> : null}
        {!error && !view ? <p className="px-4 py-8 text-sm text-muted">Đang tải vật tư...</p> : null}
        {view && !error ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line bg-soft text-left text-muted">
                  <th className="px-4 py-2 font-medium">Mã</th>
                  <th className="px-4 py-2 font-medium">Tên</th>
                  <th className="px-4 py-2 font-medium">Đvt</th>
                  <th className="px-4 py-2 text-right font-medium">SL</th>
                  <th className="px-4 py-2 text-right font-medium">Ở công trình</th>
                  <th className="px-4 py-2 text-right font-medium">Đã lắp</th>
                  <th className="px-4 py-2 text-right font-medium">Hỏng</th>
                  <th className="px-4 py-2 font-medium">Chưa về</th>
                </tr>
              </thead>
              <tbody>
                {view.materials.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted">Chưa có vật tư nào ghi nhận cho công trình này.</td>
                  </tr>
                ) : null}
                {view.materials.length > 0 && rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted">Không có mã nào trong nhóm này.</td>
                  </tr>
                ) : null}
                {rows.map((row) => {
                  const open = openId === row.materialId;
                  return (
                    <FragmentRow key={row.materialId} row={row} open={open} onToggle={() => setOpenId(open ? "" : row.materialId)} />
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-dashed border-line bg-soft px-4 py-8">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-primary">
            <HardHat className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink">NCC lo vật tư và gia công</h2>
            <p className="mt-1 text-sm text-muted">Chưa có dữ liệu từ phân hệ gia công.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function FragmentRow({ row, open, onToggle }: { row: MaterialRow; open: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className="border-b border-line last:border-0">
        <td className="px-4 py-3 align-top font-medium text-ink">{row.code}</td>
        <td className="px-4 py-3 align-top">
          <button type="button" onClick={onToggle} className="flex items-start gap-2 text-left">
            <ChevronDown className={cn("mt-0.5 size-4 shrink-0 text-muted transition", open && "rotate-180")} />
            <span>
              <span className="font-medium text-ink">{row.name}</span>
              {row.glass ? <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Kính</span> : null}
              {row.mismatch ? <span className="ml-2 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">Lệch</span> : null}
            </span>
          </button>
        </td>
        <td className="px-4 py-3 align-top text-muted">{row.unit}</td>
        <td className="px-4 py-3 align-top text-right font-medium tabular-nums text-ink">{qtyText(row.orderQty)}</td>
        <td className="px-4 py-3 align-top text-right font-medium text-ink">{qtyText(row.site)}</td>
        <td className="px-4 py-3 align-top text-right">{qtyText(row.installed)}</td>
        <td className={cn("px-4 py-3 align-top text-right", row.broken > 0 && "font-medium text-danger")}>{qtyText(row.broken)}</td>
        <td className="px-4 py-3 align-top text-muted">{awayText(row)}</td>
      </tr>
      {open ? (
        <tr className="border-b border-line bg-soft/70">
          <td colSpan={8} className="space-y-3 px-4 py-3">
            {row.orders.length ? (
              <div>
                <p className="mb-2 text-xs font-semibold text-muted">Đơn đã lưu</p>
                <ul className="space-y-2">
                  {row.orders.map((order) => (
                    <li key={order.key} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-white px-3 py-2 text-sm">
                      <span className="font-semibold text-ink">{order.code}</span>
                      <span>{order.orderedOn}</span>
                      {order.supplierName ? <span>{order.supplierName}</span> : null}
                      <span>{formatStockQty(order.qty)} {row.unit}</span>
                      {order.lengthMm ? <span>Dài {lengthText(order.lengthMm)} m</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {row.slips.length === 0 ? <p className="text-sm text-muted">Chưa có phiếu.</p> : (
              <div>
                <p className="mb-2 text-xs font-semibold text-muted">Phiếu</p>
              <ul className="space-y-2">
                {row.slips.map((slip) => (
                  <li key={slip.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-white px-3 py-2 text-sm">
                    <Link href={`/kho?muc=phieu&mo=xem&ho-so=${slip.id}`} className="font-semibold text-primary">{slip.code}</Link>
                    <span className="text-muted">{slip.kindLabel}</span>
                    <span>{slip.postedOn || "—"}</span>
                    {slip.partnerName ? <span>{slip.partnerName}</span> : null}
                    <span>Chứng từ {formatStockQty(slip.documentQty)}</span>
                    <span>Thực nhận {formatStockQty(slip.receivedQty)}</span>
                    {slip.mismatch ? <span className="font-medium text-danger">Lệch</span> : null}
                  </li>
                ))}
              </ul>
              </div>
            )}
          </td>
        </tr>
      ) : null}
    </>
  );
}
