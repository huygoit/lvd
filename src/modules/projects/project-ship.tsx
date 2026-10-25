"use client";

import { useEffect, useState } from "react";
import { callApi } from "@/shared/client/api";
import { maskGioNgay, parseGioNgay } from "@/shared/lib/dates";
import { formatStockQty } from "@/shared/catalog/stock";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";

type PlanLine = {
  lineId: string;
  code: string;
  name: string;
  unit: string;
  lengthMm: number;
  ordered: number;
  site: number;
  kho: number;
  xuong: number;
  shipping: number;
  remaining: number;
};

type Workshop = { id: string; name: string; ready: boolean };

type Plan = { code: string; lines: PlanLine[]; workshops: Workshop[] };

type Dong = PlanLine & { chon: boolean; qty: string };

const o = "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-primary";

function so(milli: number) {
  return formatStockQty(milli);
}

function dai(mm: number) {
  if (!mm) return "";
  const met = Math.round(mm / 10) / 100;
  return Number.isInteger(met) ? `${met} m` : `${String(met).replace(".", ",")} m`;
}

export function ProjectShip({
  projectId,
  orderId,
  open,
  onClose,
  onDone,
}: {
  projectId: string;
  orderId: string;
  open: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [rows, setRows] = useState<Dong[]>([]);
  const [noi, setNoi] = useState<"cong_trinh" | "kho" | "xuong">("cong_trinh");
  const [xuong, setXuong] = useState("");
  const [gio, setGio] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPlan(null);
    setError("");
    setNoi("cong_trinh");
    setGio("");
    callApi<Plan>(`/api/cong-trinh/${projectId}/don-hang/${orderId}/giao`)
      .then((data) => {
        setPlan(data);
        setXuong(data.workshops.find((item) => item.ready)?.id ?? data.workshops[0]?.id ?? "");
        setRows(data.lines.map((line) => ({ ...line, chon: line.remaining > 0, qty: line.remaining > 0 ? so(line.remaining) : "" })));
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Không mở được phiếu giao."));
  }, [open, orderId, projectId]);

  async function gui() {
    setSaving(true);
    setError("");
    try {
      const expectedAt = parseGioNgay(gio);
      if (!expectedAt) throw new Error("Nhập giờ và ngày theo dạng 14:30 25/10/2026.");
      const lines = rows.filter((row) => row.chon && row.qty.trim()).map((row) => ({ lineId: row.lineId, qty: row.qty }));
      await callApi(`/api/cong-trinh/${projectId}/don-hang/${orderId}/giao`, {
        method: "POST",
        body: JSON.stringify({ destination: noi, workshopId: xuong, expectedAt, lines }),
      });
      const nhan = noi === "kho" ? "kho công ty" : noi === "xuong" ? "xưởng" : "công trình";
      onDone(`Đã báo ${nhan} nhận hàng`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không giao được hàng.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent className="z-[60] sm:w-[760px]">
        <SheetHeader>
          <SheetTitle>Giao hàng {plan ? plan.code : ""}</SheetTitle>
          <SheetDescription>Chọn mã, số lượng lần này và nơi hàng đến. Số gợi ý là phần còn chưa giao.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
          <div className="grid gap-2 sm:grid-cols-3">
            {([
              ["cong_trinh", "Công trình"],
              ["kho", "Kho công ty"],
              ["xuong", "Nhà xưởng"],
            ] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setNoi(id)} className={id === noi ? "h-11 rounded-xl border border-primary bg-primary/10 text-sm font-semibold text-primary" : "h-11 rounded-xl border border-line bg-white text-sm font-medium text-ink"}>
                {label}
              </button>
            ))}
          </div>
          {noi === "xuong" ? (
            <label className="block">
              <span className="text-xs font-medium text-muted">Nhà xưởng nhận</span>
              {(plan?.workshops ?? []).length === 0 ? (
                <p className="mt-1 rounded-xl border border-line bg-soft px-3 py-2 text-sm text-muted">Chưa có đối tác nào mang vai trò xưởng gia công.</p>
              ) : (
                <select value={xuong} onChange={(event) => setXuong(event.target.value)} className={`mt-1 ${o}`}>
                  {plan?.workshops.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}{item.ready ? "" : " · chưa có người nhận"}</option>
                  ))}
                </select>
              )}
            </label>
          ) : null}
          <label className="block">
            <span className="text-xs font-medium text-muted">Ngày giờ dự kiến hàng tới</span>
            <input inputMode="numeric" autoComplete="off" placeholder="14:30 25/10/2026" value={gio} onChange={(event) => setGio(maskGioNgay(event.target.value))} className={`mt-1 ${o}`} />
          </label>
          {!plan ? <p className="text-sm text-muted">Đang tải các mã trên đơn...</p> : null}
          {plan && rows.length === 0 ? <p className="text-sm text-muted">Đơn chưa có mã vật tư để giao.</p> : null}
          <div className="space-y-2">
            {rows.map((row) => (
              <label key={row.lineId} className="grid gap-3 rounded-2xl border border-line bg-white px-3 py-3 sm:grid-cols-[auto_1fr_120px]">
                <input type="checkbox" checked={row.chon} disabled={row.remaining <= 0} onChange={(event) => setRows((current) => current.map((item) => item.lineId === row.lineId ? { ...item, chon: event.target.checked } : item))} className="mt-1 size-4" />
                <span>
                  <span className="block text-sm font-semibold text-ink">{row.code} · {row.name}</span>
                  <span className="mt-1 block text-xs text-muted">
                    Đặt {so(row.ordered)} {row.unit}
                    {row.lengthMm ? ` · ${dai(row.lengthMm)}` : ""}
                    {row.site > 0 ? ` · Công trình ${so(row.site)}` : ""}
                    {row.kho > 0 ? ` · Kho ${so(row.kho)}` : ""}
                    {row.xuong > 0 ? ` · Xưởng ${so(row.xuong)}` : ""}
                    {row.shipping > 0 ? ` · Đang giao ${so(row.shipping)}` : ""}
                    {` · Còn ${so(row.remaining)}`}
                  </span>
                </span>
                <input
                  inputMode="decimal"
                  value={row.qty}
                  disabled={!row.chon || row.remaining <= 0}
                  onChange={(event) => setRows((current) => current.map((item) => item.lineId === row.lineId ? { ...item, qty: event.target.value } : item))}
                  className="h-10 rounded-lg border border-line px-3 text-right text-sm font-semibold tabular-nums outline-none focus:border-primary disabled:bg-soft"
                />
              </label>
            ))}
          </div>
        </div>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={onClose}>Đóng</Button>
          <Button type="button" onClick={() => void gui()} disabled={saving || !plan}>{saving ? "Đang giao" : "Giao hàng"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
