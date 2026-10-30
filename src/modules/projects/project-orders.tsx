"use client";

import { useEffect, useRef, useState } from "react";
import { AppWindow, Boxes, Download, FileUp, FolderOpen, Ruler } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { measureUnits } from "@/shared/catalog/units";
import { ProjectShip } from "@/modules/projects/project-ship";
import { callApi } from "@/shared/client/api";
import { formatUnitPrice } from "@/modules/projects/item-fields";
import { cn } from "@/shared/lib/cn";

type Line = {
  id: string;
  materialCode: string;
  name: string;
  spec: string;
  unit: string;
  colorCode: string;
  barCount: string;
  lengthM: string;
  widthMm: string;
  heightMm: string;
  kgPerM: string;
  totalKg: string;
  quantity: string;
  unitPrice: string;
  vatPercent: string;
  isNew: boolean;
};

type Order = {
  id: string;
  code: string;
  kind: "nhom" | "bo_cai" | "kinh";
  kindLabel: string;
  statusLabel: string;
  supplierName: string;
  supplierCode: string;
  supplierAddress: string;
  supplierPhone: string;
  supplierBankName: string;
  supplierAccountNumber: string;
  supplierWebsite: string;
  supplierEmail: string;
  supplierTaxCode: string;
  supplierRepresentativeName: string;
  supplierRepresentativeTitle: string;
  supplierIsNew: boolean;
  headerNote: string;
  fileName: string;
  createdOn: string;
  amount: number;
  status: string;
  delivery: string;
  canShip: boolean;
  shipped: boolean;
  lines: Line[];
};

type RawLine = Omit<Line, "barCount" | "lengthM" | "widthMm" | "heightMm" | "kgPerM" | "totalKg" | "quantity" | "unitPrice" | "vatPercent"> & {
  barCount: number;
  lengthM: number;
  widthMm: number;
  heightMm: number;
  kgPerM: number;
  totalKg: number;
  quantity: number;
  unitPrice: number;
  vatPercent: number;
};

const stages = [
  { id: "tai", label: "Đang tải tệp", pct: 20 },
  { id: "doc", label: "Đang bóc tách dữ liệu", pct: 55 },
  { id: "doi", label: "Đang đối chiếu danh mục", pct: 80 },
  { id: "xong", label: "Đã đọc xong", pct: 100 },
];

function numText(value: number) {
  if (!value) return "";
  const rounded = Math.round(value * 1000) / 1000;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
}

function toLine(line: RawLine): Line {
  return {
    ...line,
    barCount: numText(line.barCount),
    lengthM: numText(line.lengthM),
    widthMm: numText(line.widthMm),
    heightMm: numText(line.heightMm),
    kgPerM: numText(line.kgPerM),
    totalKg: numText(line.totalKg),
    quantity: numText(line.quantity),
    unitPrice: line.unitPrice ? formatUnitPrice(line.unitPrice) : "",
    vatPercent: numText(line.vatPercent),
  };
}

const kindMeta = {
  nhom: { icon: Ruler, hint: "Thanh, kg/m, giá theo kg", tone: "bg-primary/10 text-primary" },
  kinh: { icon: AppWindow, hint: "Rộng, cao, số tấm, m², đơn giá", tone: "bg-primary/10 text-primary" },
  bo_cai: { icon: Boxes, hint: "Số lượng, đơn giá, VAT", tone: "bg-success/10 text-success" },
} as const;

function glassM2(line: Line) {
  const width = Number(line.widthMm.replace(/[.,\s]/g, ""));
  const height = Number(line.heightMm.replace(/[.,\s]/g, ""));
  const sheets = Number(line.quantity.replace(/\s/g, "").replace(",", "."));
  if (!width || !height || !sheets) return null;
  return Math.round((width * height * sheets) / 10_000) / 100;
}

function glassArea(line: Line) {
  const area = glassM2(line);
  if (area === null) return "—";
  return area.toFixed(2).replace(/\.?0+$/, "").replace(".", ",");
}

function glassMoney(line: Line) {
  const area = glassM2(line);
  const price = Number(line.unitPrice.replace(/\./g, "")) || 0;
  if (area === null || !price) return null;
  return Math.round((Math.round(area * 100) * price) / 100);
}

function orderStats(order: Order) {
  if (order.kind === "kinh") {
    let sheets = 0;
    let area = 0;
    for (const line of order.lines) {
      sheets += Number(line.quantity.replace(/\s/g, "").replace(",", ".")) || 0;
      const text = glassArea(line);
      if (text !== "—") area += Number(text.replace(",", "."));
    }
    const rounded = Math.round(area * 100) / 100;
    let amount = 0;
    let coGia = false;
    for (const line of order.lines) {
      const tien = glassMoney(line);
      if (tien === null) continue;
      amount += tien;
      coGia = true;
    }
    return [
      ["Tấm", String(sheets)],
      ["m²", rounded.toFixed(2).replace(/\.?0+$/, "").replace(".", ",")],
      ["Tổng tiền", coGia ? `${formatUnitPrice(amount)} ₫` : "—"],
    ];
  }
  if (order.kind === "nhom") {
    let bars = 0;
    let kg = 0;
    for (const line of order.lines) {
      bars += Number(line.barCount.replace(/[^\d]/g, "")) || 0;
      kg += Number(line.totalKg.replace(/\s/g, "").replace(",", ".")) || 0;
    }
    const rounded = Math.round(kg * 1000) / 1000;
    return [
      ["Dòng", String(order.lines.length)],
      ["Thanh", String(bars)],
      ["Tổng kg", Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",")],
    ];
  }
  let qty = 0;
  let amount = 0;
  for (const line of order.lines) {
    const count = Number(line.quantity.replace(/\s/g, "").replace(",", ".")) || 0;
    const price = Number(line.unitPrice.replace(/\./g, "")) || 0;
    qty += count;
    amount += count * price;
  }
  return [
    ["Dòng", String(order.lines.length)],
    ["Số lượng", String(qty)],
    ["Thành tiền", formatUnitPrice(Math.round(amount))],
  ];
}

const cell = "w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm outline-none hover:border-line focus:border-primary focus:bg-white";
const num = cn(cell, "px-3 text-right tabular-nums");
const numHead = "px-3 py-2 text-right font-medium tabular-nums";

function NameInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);

  function show(input: HTMLInputElement) {
    if (!value.trim() || input.scrollWidth <= input.clientWidth + 1) {
      setTip(null);
      return;
    }
    const box = input.getBoundingClientRect();
    setTip({ x: box.left, y: box.bottom + 6 });
  }

  return (
    <>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onMouseEnter={(event) => show(event.currentTarget)}
        onMouseLeave={() => setTip(null)}
        className={cn(cell, "min-w-0 truncate")}
      />
      {tip ? (
        <span className="pointer-events-none fixed z-[80] max-w-md rounded-lg bg-ink px-2.5 py-1.5 text-xs leading-5 text-white shadow-lg" style={{ left: tip.x, top: tip.y }}>
          {value}
        </span>
      ) : null}
    </>
  );
}

export function ProjectOrders({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");
  const [stage, setStage] = useState("");
  const [current, setCurrent] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Order | null>(null);
  const [toast, setToast] = useState("");
  const [pendingShip, setPendingShip] = useState<Order | null>(null);
  const henTat = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (henTat.current) window.clearTimeout(henTat.current);
    };
  }, []);

  function bao(text: string) {
    setToast(text);
    if (henTat.current) window.clearTimeout(henTat.current);
    henTat.current = window.setTimeout(() => setToast(""), 2000);
  }

  function baoThanhCong() {
    bao("Lưu đơn hàng thành công!");
  }

  function load() {
    return callApi<Order[]>(`/api/cong-trinh/${projectId}/don-hang`).then(setOrders);
  }

  useEffect(() => {
    let cancelled = false;
    setOrders(null);
    callApi<Order[]>(`/api/cong-trinh/${projectId}/don-hang`)
      .then((rows) => { if (!cancelled) setOrders(rows); })
      .catch((caught: unknown) => { if (!cancelled) setError(caught instanceof Error ? caught.message : "Không tải được đơn hàng."); });
    return () => { cancelled = true; };
  }, [projectId]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setStage("tai");
    try {
      const body = new FormData();
      body.set("tep", file);
      const response = await fetch(`/api/cong-trinh/${projectId}/don-hang`, { method: "POST", body });
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Không đọc được tiến trình.");
      const decoder = new TextDecoder();
      let buffer = "";
      let opened = false;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const payload = part.replace(/^data:\s*/, "");
          if (!payload) continue;
          const event = JSON.parse(payload) as { stage?: string; message?: string; order?: Order & { lines: RawLine[] } };
          if (event.stage) setStage(event.stage);
          if (event.stage === "loi") throw new Error(event.message || "Không bóc tách được tệp.");
          if (event.stage === "xong" && event.order) {
            opened = true;
            setCurrent({ ...event.order, lines: event.order.lines.map(toLine) });
            await load();
          }
        }
      }
      if (!opened) throw new Error("Không bóc tách được tệp.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không bóc tách được tệp.");
    } finally {
      setStage("");
    }
  }

  async function save() {
    if (!current) return;
    setSaving(true);
    setError("");
    try {
      const saved = await callApi<Order & { lines: RawLine[] }>(`/api/cong-trinh/${projectId}/don-hang/${current.id}`, {
        method: "PATCH",
        body: JSON.stringify({
            supplierName: current.supplierName,
            supplierAddress: current.supplierAddress,
            supplierPhone: current.supplierPhone,
            supplierBankName: current.supplierBankName,
            supplierAccountNumber: current.supplierAccountNumber,
            supplierWebsite: current.supplierWebsite,
            supplierEmail: current.supplierEmail,
            supplierTaxCode: current.supplierTaxCode,
            supplierRepresentativeName: current.supplierRepresentativeName,
            supplierRepresentativeTitle: current.supplierRepresentativeTitle,
            headerNote: current.headerNote,
            lines: current.lines.map((line) => ({
            materialCode: line.materialCode,
            name: line.name,
            spec: line.spec,
            unit: line.unit,
            colorCode: line.colorCode,
            widthMm: line.widthMm,
            heightMm: line.heightMm,
            barCount: line.barCount,
            lengthM: line.lengthM,
            kgPerM: line.kgPerM,
            totalKg: line.totalKg,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            vatPercent: line.vatPercent,
          })),
        }),
      });
      await load();
      setCurrent(null);
      baoThanhCong();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được đơn.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setSaving(true);
    try {
      await callApi(`/api/cong-trinh/${projectId}/don-hang/${id}`, { method: "DELETE" });
      if (current?.id === id) setCurrent(null);
      setPendingDelete(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không xóa được đơn.");
      setPendingDelete(null);
    } finally {
      setSaving(false);
    }
  }

  async function taiTep(orderId: string, fileName: string) {
    setError("");
    try {
      const response = await fetch(`/api/cong-trinh/${projectId}/don-hang/${orderId}/tep`);
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message || "Không tải được tệp.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || "don-hang.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không tải được tệp.");
    }
  }

  function patch(index: number, partial: Partial<Line>) {
    setCurrent((order) => order ? { ...order, lines: order.lines.map((line, i) => i === index ? { ...line, ...partial } : line) } : order);
  }

  const active = stages.find((item) => item.id === stage);
  const nhom = current?.kind === "nhom";
  const KindIcon = current ? kindMeta[current.kind].icon : FileUp;

  return (
    <div className="space-y-4">
      {toast ? (
        <p role="status" className="pointer-events-none fixed bottom-20 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-[linear-gradient(135deg,#047857_0%,#059669_55%,#34d399_100%)] px-5 py-2.5 text-sm font-medium text-white shadow-[0_10px_24px_rgba(4,120,87,0.35)]">
          {toast}
        </p>
      ) : null}
      <Sheet open={current !== null} onOpenChange={(next) => { if (!next) setCurrent(null); }}>
        <SheetContent className="z-[60] sm:w-3/4">
          {current ? (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <span className={cn("flex size-10 items-center justify-center rounded-xl", kindMeta[current.kind].tone)}>
                    <KindIcon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <SheetTitle>{current.code} · {current.kindLabel}</SheetTitle>
                    <SheetDescription>{current.fileName || "Chưa có tệp"}{current.status === "da_luu" ? "" : ` · ${current.statusLabel}`}</SheetDescription>
                  </div>
                  {current.fileName ? (
                    <button
                      type="button"
                      onClick={() => void taiTep(current.id, current.fileName)}
                      className="ml-auto inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-primary hover:bg-soft"
                    >
                      <Download className="size-4" />
                      Tải về
                    </button>
                  ) : null}
                </div>
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {error ? <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p> : null}
        <div className={cn("grid gap-3", orderStats(current).length > 3 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
          {orderStats(current).map(([label, value]) => (
            <article key={label} className="rounded-2xl border border-line bg-white px-4 py-3">
              <p className="text-xs text-muted">{label}</p>
              <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
            </article>
          ))}
        </div>
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className={cn("w-full text-sm", current.kind === "kinh" ? "min-w-[980px]" : "table-fixed")}>
            <thead>
              <tr className="border-b border-line bg-soft text-left text-muted">
                {current.kind === "kinh" ? (
                  <>
                    <th className="px-3 py-2 font-medium">Ký hiệu</th>
                    <th className="px-3 py-2 font-medium">Loại kính</th>
                    <th className={numHead}>Rộng</th>
                    <th className={numHead}>Cao</th>
                    <th className={numHead}>Số tấm</th>
                    <th className={numHead}>m²</th>
                    <th className={numHead}>Đơn giá</th>
                    <th className={numHead}>Thành tiền</th>
                    <th className="px-3 py-2 font-medium">Theo nhà</th>
                    <th className="px-3 py-2 font-medium">Ghi chú</th>
                  </>
                ) : (
                  <>
                    <th className="w-28 px-3 py-2 font-medium">Mã</th>
                    <th className="px-3 py-2 font-medium">Tên</th>
                    {nhom ? <th className="w-20 whitespace-nowrap px-3 py-2 font-medium">Mã màu</th> : <th className="w-44 px-3 py-2 font-medium">Mô tả</th>}
                    {nhom ? <th className={cn(numHead, "w-14")}>Thanh</th> : <th className="w-24 px-3 py-2 font-medium">Đvt</th>}
                    {nhom ? <th className={cn(numHead, "w-16")}>Dài (m)</th> : <th className={cn(numHead, "w-24")}>Số lượng</th>}
                    {nhom ? <th className={cn(numHead, "w-16")}>Kg/m</th> : <th className={cn(numHead, "w-28")}>Đơn giá</th>}
                    {nhom ? <th className={cn(numHead, "w-24")}>Tổng kg</th> : <th className={cn(numHead, "w-20")}>VAT %</th>}
                    {nhom ? <th className={cn(numHead, "w-24")}>Giá/kg</th> : null}
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {current.lines.map((line, index) => current.kind === "kinh" ? (
                <tr key={line.id || index} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 align-top"><input value={line.materialCode} onChange={(event) => patch(index, { materialCode: event.target.value })} className={cell} /></td>
                  <td className="px-3 py-2 align-top">
                    <input value={line.name} onChange={(event) => patch(index, { name: event.target.value })} className={cell} />
                    {line.isNew ? <span className="px-2 text-xs text-primary">Sẽ thêm loại kính, tính theo m²</span> : null}
                  </td>
                  <td className="align-top"><input value={line.widthMm} onChange={(event) => patch(index, { widthMm: event.target.value })} className={num} /></td>
                  <td className="align-top"><input value={line.heightMm} onChange={(event) => patch(index, { heightMm: event.target.value })} className={num} /></td>
                  <td className="align-top"><input value={line.quantity} onChange={(event) => patch(index, { quantity: event.target.value })} className={num} /></td>
                  <td className="px-3 py-2 align-top text-right text-muted tabular-nums">{glassArea(line)}</td>
                  <td className="align-top"><input value={line.unitPrice} inputMode="numeric" onChange={(event) => patch(index, { unitPrice: event.target.value })} className={num} /></td>
                  <td className="px-3 py-2 align-top text-right font-medium tabular-nums">{glassMoney(line) === null ? "—" : formatUnitPrice(glassMoney(line) ?? 0)}</td>
                  <td className="px-3 py-2 align-top"><input value={line.colorCode} onChange={(event) => patch(index, { colorCode: event.target.value })} className={cell} /></td>
                  <td className="px-3 py-2 align-top"><input value={line.spec} onChange={(event) => patch(index, { spec: event.target.value })} className={cell} /></td>
                </tr>
              ) : (
                <tr key={line.id || index} className="border-b border-line last:border-0">
                  <td className="min-w-0 px-3 py-2 align-top">
                    <input value={line.materialCode} onChange={(event) => patch(index, { materialCode: event.target.value })} className={cn(cell, "min-w-0")} />
                    {line.isNew ? <span className="px-2 text-xs text-primary">Sẽ thêm vào danh mục</span> : null}
                  </td>
                  <td className="min-w-0 px-3 py-2 align-top">
                    <NameInput value={line.name} onChange={(name) => patch(index, { name })} />
                  </td>
                  <td className="min-w-0 px-3 py-2 align-top"><input value={nhom ? line.colorCode : line.spec} onChange={(event) => patch(index, nhom ? { colorCode: event.target.value } : { spec: event.target.value })} className={cn(cell, "min-w-0")} /></td>
                  <td className="align-top">
                    {nhom ? <input value={line.barCount} onChange={(event) => patch(index, { barCount: event.target.value })} className={num} /> : (
                      <select value={line.unit} onChange={(event) => patch(index, { unit: event.target.value })} className={cell}>
                        <option value="">Chọn</option>
                        {measureUnits.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="align-top"><input value={nhom ? line.lengthM : line.quantity} onChange={(event) => patch(index, nhom ? { lengthM: event.target.value } : { quantity: event.target.value })} className={num} /></td>
                  <td className="align-top"><input value={nhom ? line.kgPerM : line.unitPrice} onChange={(event) => patch(index, nhom ? { kgPerM: event.target.value } : { unitPrice: event.target.value })} className={num} /></td>
                  <td className="align-top"><input value={nhom ? line.totalKg : line.vatPercent} onChange={(event) => patch(index, nhom ? { totalKg: event.target.value } : { vatPercent: event.target.value })} className={num} /></td>
                  {nhom ? <td className="align-top"><input value={line.unitPrice} onChange={(event) => patch(index, { unitPrice: event.target.value })} className={num} /></td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
                </div>
                {canEdit ? (
                  <SheetFooter className="flex justify-end gap-2">
                    <Button type="button" variant="outline" className="text-danger" onClick={() => setPendingDelete(current)} disabled={saving}>Xóa đơn</Button>
                    <Button type="button" onClick={() => void save()} disabled={saving}>{saving ? "Đang lưu" : "Lưu đơn"}</Button>
                  </SheetFooter>
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
      <section className="overflow-hidden rounded-2xl border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-white"><FileUp className="size-5" /></span>
            <div>
              <p className="text-base font-semibold text-ink">Đọc đơn từ PDF</p>
              <p className="text-sm text-muted">Chọn file. Đọc xong mở bảng để sửa, bấm lưu mới ghi danh mục.</p>
            </div>
          </div>
          {canEdit ? (
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white">
              <FolderOpen className="size-4" aria-hidden />
              Nạp đơn hàng từ PDF
              <input type="file" accept="application/pdf" className="sr-only" onChange={(event) => { void onFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
            </label>
          ) : null}
        </div>
        <div className="grid border-t border-line sm:grid-cols-3">
          {(Object.keys(kindMeta) as (keyof typeof kindMeta)[]).map((key) => {
            const item = kindMeta[key];
            const Icon = item.icon;
            return (
              <div key={key} className="flex items-center gap-3 border-line px-5 py-3 sm:border-r sm:last:border-r-0">
                <span className={cn("flex size-9 items-center justify-center rounded-xl", item.tone)}><Icon className="size-4" /></span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{key === "nhom" ? "Nhôm" : key === "kinh" ? "Kính" : "Bộ, cái"}</span>
                  <span className="text-xs text-muted">{item.hint}</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>
      {active ? (
        <div className="rounded-2xl border border-line bg-white px-5 py-4">
          <div className="flex items-center justify-between text-sm">
            <p className="font-semibold text-ink">{active.label}</p>
            <p className="text-muted">{active.pct}%</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-soft">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${active.pct}%` }} />
          </div>
        </div>
      ) : null}
      {error && !current ? <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p> : null}
      <div className="grid gap-3">
        {!orders ? <p className="rounded-2xl border border-line bg-white px-4 py-8 text-sm text-muted">Đang tải đơn hàng...</p> : null}
        {orders && orders.length === 0 ? <p className="rounded-2xl border border-dashed border-line bg-soft px-4 py-12 text-center text-sm text-muted">Chưa có đơn hàng.</p> : null}
        {orders?.map((order) => {
          const item = kindMeta[order.kind];
          const Icon = item.icon;
          return (
            <div key={order.id} className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3">
              <button
                type="button"
                onClick={() => setCurrent({ ...order, lines: (order.lines as unknown as RawLine[]).map(toLine) })}
                className="flex min-w-0 flex-1 items-center gap-4 text-left"
              >
                <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", item.tone)}><Icon className="size-5" /></span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">{order.code} · {order.supplierName || "Chưa rõ nhà cung cấp"}</span>
                  <span className="text-xs text-muted">{order.kindLabel} · {order.lines.length} dòng · {order.createdOn}</span>
                </span>
              </button>
              <span className="w-36 shrink-0 text-right text-sm font-semibold tabular-nums text-ink">{order.amount > 0 ? `${formatUnitPrice(order.amount)} ₫` : "—"}</span>
              <span className="flex w-24 shrink-0 justify-center">
                {order.delivery === "cho_nhan" ? <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">Đang giao</span> : null}
                {order.delivery === "da_nhan" ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">Đã nhận</span> : null}
                {order.status !== "da_luu" ? <span className="rounded-full bg-soft px-2.5 py-1 text-xs font-medium text-ink">{order.statusLabel}</span> : null}
              </span>
              <span className="flex w-64 shrink-0 justify-end gap-2">
                <span title={order.fileName ? "Tải tệp đơn hàng" : "Đơn chưa có tệp"} className={order.fileName ? "" : "cursor-not-allowed"}>
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={!order.fileName} onClick={() => void taiTep(order.id, order.fileName)}>
                    <Download className="size-4" />
                    Tải về
                  </Button>
                </span>
                {canEdit ? (
                  <span title={order.status !== "da_luu" ? "Lưu đơn trước khi giao" : order.canShip ? "Giao phần còn lại" : "Đơn đã giao hết"} className={order.status === "da_luu" && order.canShip ? "" : "cursor-not-allowed"}>
                    <Button type="button" variant="outline" size="sm" disabled={order.status !== "da_luu" || !order.canShip} onClick={() => { setError(""); setPendingShip(order); }}>Giao hàng</Button>
                  </span>
                ) : null}
                {canEdit ? (
                  <span title={order.shipped ? "Đơn đã giao, không xóa được" : "Xóa đơn hàng"} className={order.shipped ? "cursor-not-allowed" : ""}>
                    <Button type="button" variant="outline" size="sm" className="text-danger" disabled={order.shipped} onClick={() => setPendingDelete(order)}>Xóa</Button>
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
      <ProjectShip
        projectId={projectId}
        orderId={pendingShip?.id ?? ""}
        open={pendingShip !== null}
        onClose={() => setPendingShip(null)}
        onDone={(message) => { setPendingShip(null); void load(); bao(message); }}
      />
      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa đơn hàng</AlertDialogTitle>
            <AlertDialogDescription>Đơn {pendingDelete?.code} sẽ bị xóa. Vật tư và nhà cung cấp đã tạo trong danh mục vẫn giữ.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingDelete(null)}>Hủy</Button>
            <Button type="button" onClick={() => void remove()} disabled={saving}>Xóa</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
