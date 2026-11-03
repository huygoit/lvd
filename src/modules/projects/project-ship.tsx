"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Factory, FileText, Truck, X } from "lucide-react";
import { callApi } from "@/shared/client/api";
import { GioNgayChon } from "@/shared/components/gio-ngay-chon";
import { formatStockQty } from "@/shared/catalog/stock";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { cn } from "@/shared/lib/cn";

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

type Contract = {
  id: string;
  code: string;
  name: string;
  status: string;
  statusLabel: string;
  partnerId: string;
  partnerName: string;
};

type Plan = { code: string; lines: PlanLine[]; workshops: Workshop[]; contracts: Contract[] };

type Dong = PlanLine & { chon: boolean; qty: string };

// Ô đang lỗi validate phía client — dùng scroll/focus.
type LoiO = "" | "luc" | "hopDong";

const o = "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-primary";
const oLoi = "h-10 w-full rounded-lg border border-danger bg-white px-3 text-sm text-ink outline-none focus:border-danger";

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
  const [hopDongId, setHopDongId] = useState("");
  const [luc, setLuc] = useState("");
  const [error, setError] = useState("");
  const [loiO, setLoiO] = useState<LoiO>("");
  const [saving, setSaving] = useState(false);

  const khoiLucRef = useRef<HTMLDivElement>(null);
  const gioRef = useRef<HTMLSelectElement>(null);
  const khoiHopDongRef = useRef<HTMLLabelElement>(null);
  const hopDongRef = useRef<HTMLSelectElement>(null);

  const hopTheoXuong = useMemo(
    () => (plan?.contracts ?? []).filter((item) => item.partnerId === xuong),
    [plan?.contracts, xuong],
  );

  useEffect(() => {
    if (!open) return;
    setPlan(null);
    setError("");
    setLoiO("");
    setNoi("cong_trinh");
    setHopDongId("");
    setLuc("");
    callApi<Plan>(`/api/cong-trinh/${projectId}/don-hang/${orderId}/giao`)
      .then((data) => {
        setPlan(data);
        const macDinhXuong = data.workshops.find((item) => item.ready)?.id ?? data.workshops[0]?.id ?? "";
        setXuong(macDinhXuong);
        const hop = data.contracts.filter((item) => item.partnerId === macDinhXuong);
        setHopDongId(hop.length === 1 ? hop[0].id : "");
        setRows(data.lines.map((line) => ({ ...line, chon: line.remaining > 0, qty: line.remaining > 0 ? so(line.remaining) : "" })));
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Không mở được phiếu giao."));
  }, [open, orderId, projectId]);

  function doiXuong(next: string) {
    setXuong(next);
    setLoiO((hien) => (hien === "hopDong" ? "" : hien));
    const hop = (plan?.contracts ?? []).filter((item) => item.partnerId === next);
    setHopDongId(hop.length === 1 ? hop[0].id : "");
  }

  // Cuộn tới khối lỗi rồi focus control đầu tiên.
  function nhayToiLoi(oLoiMoi: LoiO) {
    const khoi = oLoiMoi === "luc" ? khoiLucRef.current : khoiHopDongRef.current;
    const control = oLoiMoi === "luc" ? gioRef.current : hopDongRef.current;
    requestAnimationFrame(() => {
      khoi?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => control?.focus(), 280);
    });
  }

  async function gui() {
    setSaving(true);
    setError("");
    setLoiO("");
    try {
      if (!luc) {
        const msg = "Chọn giờ, phút và ngày hàng tới.";
        setError(msg);
        setLoiO("luc");
        nhayToiLoi("luc");
        return;
      }
      if (noi === "xuong" && !hopDongId) {
        const msg = "Chọn hợp đồng gia công cho phiếu giao này.";
        setError(msg);
        setLoiO("hopDong");
        nhayToiLoi("hopDong");
        return;
      }
      const lines = rows.filter((row) => row.chon && row.qty.trim()).map((row) => ({ lineId: row.lineId, qty: row.qty }));
      await callApi(`/api/cong-trinh/${projectId}/don-hang/${orderId}/giao`, {
        method: "POST",
        body: JSON.stringify({
          destination: noi,
          workshopId: xuong,
          fabricationContractId: hopDongId,
          expectedAt: luc,
          lines,
        }),
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
      <SheetContent className="z-[60] sm:w-[820px] sm:max-w-none">
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
            <div className="space-y-3 rounded-2xl border border-line bg-soft/40 p-4">
              <div>
                <p className="text-sm font-semibold text-ink">Giao ra xưởng gia công</p>
                <p className="mt-0.5 text-xs text-muted">Chọn xưởng rồi chọn hợp đồng đã ký / đang thực hiện để gắn phiếu vào đúng HĐ.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
                    <Factory className="size-3.5" aria-hidden />
                    Nhà xưởng nhận
                  </span>
                  {(plan?.workshops ?? []).length === 0 ? (
                    <p className="rounded-xl border border-dashed border-line bg-white px-3 py-2.5 text-sm text-muted">Chưa có đối tác vai trò xưởng gia công.</p>
                  ) : (
                    <select value={xuong} onChange={(event) => doiXuong(event.target.value)} className={o}>
                      {plan?.workshops.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}{item.ready ? "" : " · chưa có người nhận"}</option>
                      ))}
                    </select>
                  )}
                </label>
                <label ref={khoiHopDongRef} className="block space-y-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
                    <FileText className="size-3.5" aria-hidden />
                    Hợp đồng gia công
                  </span>
                  {!xuong ? (
                    <p className="rounded-xl border border-dashed border-line bg-white px-3 py-2.5 text-sm text-muted">Chọn nhà xưởng trước.</p>
                  ) : hopTheoXuong.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                      Xưởng này chưa có HĐ đã ký / đang thực hiện trên công trình.
                    </p>
                  ) : (
                    <>
                      <select
                        ref={hopDongRef}
                        value={hopDongId}
                        aria-invalid={loiO === "hopDong" || undefined}
                        onChange={(event) => {
                          setHopDongId(event.target.value);
                          setLoiO((hien) => (hien === "hopDong" ? "" : hien));
                          if (error) setError("");
                        }}
                        className={cn(loiO === "hopDong" ? oLoi : o)}
                      >
                        <option value="">Chọn hợp đồng…</option>
                        {hopTheoXuong.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.code} · {item.name || "Không tên"} · {item.statusLabel}
                          </option>
                        ))}
                      </select>
                      {loiO === "hopDong" ? (
                        <p className="text-xs text-danger">Chọn hợp đồng gia công cho phiếu giao này.</p>
                      ) : null}
                    </>
                  )}
                </label>
              </div>
            </div>
          ) : null}

          <div ref={khoiLucRef}>
            <span className={cn("text-xs font-medium", loiO === "luc" ? "text-danger" : "text-muted")}>Ngày giờ dự kiến hàng tới</span>
            <div className="mt-1">
              <GioNgayChon
                key={orderId}
                ref={gioRef}
                loi={loiO === "luc"}
                onChange={(value) => {
                  setLuc(value);
                  setLoiO((hien) => (hien === "luc" ? "" : hien));
                  if (error) setError("");
                }}
              />
            </div>
            {loiO === "luc" ? (
              <p className="mt-1.5 text-xs text-danger">Chọn giờ, phút và ngày hàng tới.</p>
            ) : null}
          </div>
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
        <SheetFooter className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" className="gap-1.5" onClick={onClose}>
            <X className="size-4" />
            Đóng
          </Button>
          <Button type="button" className="gap-1.5" onClick={() => void gui()} disabled={saving || !plan || (noi === "xuong" && (!xuong || hopTheoXuong.length === 0))}>
            <Truck className="size-4" />
            {saving ? "Đang giao" : "Giao hàng"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
