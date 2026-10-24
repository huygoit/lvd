"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { inputClass, selectClass } from "@/shared/components/controls";
import { cn } from "@/shared/lib/cn";
import { callApi } from "@/shared/client/api";
import {
  formatStockQty,
  glassStates,
  isGlassState,
  isMovablePlace,
  kgReceiveStates,
  stockPlaces,
  stockSlipKinds,
  theoryGrams,
  type GlassState,
  type KgReceiveState,
  type StockSlipKind,
} from "@/shared/catalog/stock";

export type SlipLine = {
  id?: string;
  materialId: string;
  code: string;
  name: string;
  unit: string;
  documentQty: number;
  receivedQty: number;
  note: string;
  priceBasis?: string;
  gramsPerMeter?: number | null;
  gramsPerBar?: number | null;
  receiveState?: string;
  barCount?: number;
  lengthMm?: number | null;
  invoiceGrams?: number;
  weighedGrams?: number;
  theoryGrams?: number;
};

export type SlipDraft = {
  id: string;
  code: string;
  kind: string;
  status: string;
  slipNo: string;
  partnerId: string;
  projectId: string;
  fromKind: string;
  fromRef: string;
  toKind: string;
  toRef: string;
  reason: string;
  note: string;
  revision: number;
  lines: SlipLine[];
};

export type PartyOption = { id: string; code: string; name: string };

type DraftLine = {
  key: string;
  materialId: string;
  code: string;
  name: string;
  unit: string;
  priceBasis: string;
  gramsPerMeter: number | null;
  gramsPerBar: number | null;
  documentQty: string;
  receivedQty: string;
  note: string;
  receiveState: KgReceiveState;
  barCount: string;
  lengthM: string;
  invoiceKg: string;
  weighedKg: string;
};

type Hit = {
  id: string;
  code: string;
  name: string;
  stockUnit: string;
  priceBasis: string;
  gramsPerMeter: number | null;
  gramsPerBar: number | null;
  barLengthMm: number | null;
  glass: boolean;
};

function qtyText(value: number) {
  return value ? formatStockQty(value) : "";
}

function stored(text: string) {
  const value = Number(String(text).trim().replace(",", "."));
  return Number.isFinite(value) && value > 0 ? Math.round(value * 1000) : 0;
}

export function SlipForm({
  mode,
  initial,
  projects,
  partners,
  onClose,
  onSaved,
  onError,
  error,
}: {
  mode: "them" | "sua";
  initial?: SlipDraft;
  projects: PartyOption[];
  partners: PartyOption[];
  onClose: () => void;
  onSaved: (id: string) => void;
  onError: (message: string) => void;
  error: string;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<StockSlipKind>((initial?.kind as StockSlipKind) || "nhap");
  const [partnerId, setPartnerId] = useState(initial?.partnerId ?? "");
  const [projectId, setProjectId] = useState(initial?.projectId ?? "");
  const [fromKind, setFromKind] = useState(initial?.fromKind || "kho");
  const [fromRef, setFromRef] = useState(initial?.fromRef ?? "");
  const [toKind, setToKind] = useState(initial?.toKind || "cong_trinh");
  const [toRef, setToRef] = useState(initial?.toRef ?? "");
  const [slipNo, setSlipNo] = useState(initial?.slipNo ?? "");
  const [glassFrom, setGlassFrom] = useState(initial?.kind === "kinh" && isGlassState(initial.fromKind) ? initial.fromKind : "");
  const [glassTo, setGlassTo] = useState<GlassState>(initial?.kind === "kinh" && isGlassState(initial.toKind) ? initial.toKind : "da_dat");
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [lines, setLines] = useState<DraftLine[]>(
    initial?.lines.map((line, index) => ({
      key: `${line.materialId}-${index}`,
      materialId: line.materialId,
      code: line.code,
      name: line.name,
      unit: line.unit,
      priceBasis: line.priceBasis || "sl",
      gramsPerMeter: line.gramsPerMeter ?? null,
      gramsPerBar: line.gramsPerBar ?? null,
      documentQty: qtyText(line.documentQty),
      receivedQty: qtyText(line.receivedQty),
      note: line.note,
      receiveState: line.receiveState === "da_xac_nhan" ? "da_xac_nhan" : "tam_nhap",
      barCount: qtyText(line.barCount || 0),
      lengthM: line.lengthMm ? formatStockQty(line.lengthMm) : "",
      invoiceKg: qtyText(line.invoiceGrams || 0),
      weighedKg: qtyText(line.weighedGrams || 0),
    })) ?? [],
  );
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [askPost, setAskPost] = useState(false);

  async function look(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setHits([]);
      return;
    }
    try {
      const rows = await callApi<Hit[]>(`/api/kho/vat-tu?q=${encodeURIComponent(value.trim())}${kind === "kinh" ? "&kinh=1" : ""}`);
      setHits(rows);
    } catch {
      setHits([]);
    }
  }

  function addHit(hit: Hit) {
    if (kind === "kinh" && !hit.glass) {
      onError("Mã này không phải kính tấm.");
      return;
    }
    if (lines.some((line) => line.materialId === hit.id)) {
      onError("Vật tư này đã có trên phiếu.");
      return;
    }
    setLines([
      ...lines,
      {
        key: hit.id,
        materialId: hit.id,
        code: hit.code,
        name: hit.name,
        unit: hit.stockUnit,
        priceBasis: hit.priceBasis,
        gramsPerMeter: hit.gramsPerMeter,
        gramsPerBar: hit.gramsPerBar,
        documentQty: "",
        receivedQty: "",
        note: "",
        receiveState: "tam_nhap",
        barCount: "",
        lengthM: hit.barLengthMm ? formatStockQty(hit.barLengthMm) : "",
        invoiceKg: "",
        weighedKg: "",
      },
    ]);
    setQuery("");
    setHits([]);
    onError("");
  }

  function payload() {
    return {
      kind,
      partnerId,
      projectId,
      fromKind: kind === "kinh" ? glassFrom : fromKind,
      fromRef,
      toKind: kind === "kinh" ? glassTo : toKind,
      toRef,
      slipNo,
      reason,
      note,
      revision: initial?.revision,
      lines: lines.map((line) => ({
        materialId: line.materialId,
        documentQty: line.documentQty,
        receivedQty: line.receivedQty,
        note: line.note,
        receiveState: line.priceBasis === "kg" ? line.receiveState : "",
        barCount: line.barCount,
        lengthM: line.lengthM,
        invoiceKg: line.invoiceKg,
        weighedKg: line.weighedKg,
      })),
    };
  }

  async function save(post: boolean) {
    setBusy(true);
    onError("");
    try {
      const saved = mode === "them"
        ? await callApi<{ id: string }>("/api/kho/phieu", { method: "POST", body: JSON.stringify(payload()) })
        : await callApi<{ id: string }>(`/api/kho/phieu/${initial?.id}`, { method: "PATCH", body: JSON.stringify(payload()) });
      if (file) {
        const body = new FormData();
        body.set("file", file);
        body.set("entityType", "phieu_kho");
        body.set("entityId", saved.id);
        await callApi("/api/tep", { method: "POST", body });
      }
      if (post) await callApi(`/api/kho/phieu/${saved.id}/ghi-so`, { method: "POST" });
      router.refresh();
      onSaved(saved.id);
    } catch (caught) {
      setAskPost(false);
      onError(caught instanceof Error ? caught.message : "Không lưu được.");
      setBusy(false);
    }
  }

  const hint = stockSlipKinds.find((item) => item.code === kind)?.hint ?? "";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {stockSlipKinds.filter((item) => item.code !== "giao_hang").map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => setKind(item.code)}
              className={cn(
                "rounded-xl border px-3 py-2 text-left",
                kind === item.code ? "border-primary bg-primary/5" : "border-line bg-white hover:bg-soft",
              )}
            >
              <span className="block text-sm font-semibold text-ink">{item.label}</span>
              <span className="mt-0.5 block text-xs text-muted">{item.hint}</span>
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">{hint}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {kind === "nhap" || kind === "giao_thang" || kind === "tra_hong" || kind === "chuyen" || kind === "kinh" ? (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Nhà cung cấp</span>
              <select value={partnerId} onChange={(event) => setPartnerId(event.target.value)} className={selectClass}>
                <option value="">Chọn nhà cung cấp</option>
                {partners.map((item) => <option key={item.id} value={item.id}>{item.code}{item.name && item.name !== item.code ? ` · ${item.name}` : ""}</option>)}
              </select>
            </label>
          ) : null}
          {kind === "giao_thang" || kind === "xuat_lap" || kind === "kinh" ? (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Công trình</span>
              <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className={selectClass}>
                <option value="">Chọn công trình</option>
                {projects.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}
              </select>
            </label>
          ) : null}
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Số phiếu nhà cung cấp</span>
            <input value={slipNo} onChange={(event) => setSlipNo(event.target.value)} className={inputClass} />
          </label>
        </div>
        {kind === "kinh" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Từ trạng thái</span>
              <select value={glassFrom} onChange={(event) => setGlassFrom(event.target.value)} className={selectClass}>
                <option value="">Mới đặt</option>
                {glassStates.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Sang trạng thái</span>
              <select value={glassTo} onChange={(event) => { if (isGlassState(event.target.value)) setGlassTo(event.target.value); }} className={selectClass}>
                {glassStates.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
              </select>
            </label>
          </div>
        ) : null}
        {kind === "chuyen" || kind === "tra_hong" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <PlaceField label={kind === "tra_hong" ? "Lấy từ" : "Chỗ đi"} kind={fromKind} refId={fromRef} projects={projects} partners={partners} onKind={setFromKind} onRef={setFromRef} />
            {kind === "chuyen" ? <PlaceField label="Chỗ đến" kind={toKind} refId={toRef} projects={projects} partners={partners} onKind={setToKind} onRef={setToRef} /> : null}
          </div>
        ) : null}
        {kind === "tra_hong" || (kind === "kinh" && glassTo === "vo") ? (
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Lý do</span>
            <input value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass} />
          </label>
        ) : null}
        <div>
          <span className="mb-1 block text-sm font-medium">Thêm vật tư</span>
          <input value={query} onChange={(event) => look(event.target.value)} placeholder={kind === "kinh" ? "Gõ mã kính" : "Gõ mã hoặc tên"} className={inputClass} />
          {hits.length > 0 ? (
            <ul className="mt-1 overflow-hidden rounded-md border border-line bg-white">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-soft" onClick={() => addHit(hit)}>
                    <span className="font-semibold text-primary">{hit.code}</span>
                    <span className="text-ink"> · {hit.name}</span>
                    <span className="text-muted"> · {hit.stockUnit}{hit.glass ? " · kính" : ""}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-soft text-left text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Vật tư</th>
                <th className="px-3 py-2 font-medium">ĐVT</th>
                <th className="px-3 py-2 font-medium">SL chứng từ</th>
                <th className="px-3 py-2 font-medium">{kind === "kinh" ? "SL phần này" : "SL thực nhận"}</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-muted">Chưa có dòng. Tìm vật tư phía trên để thêm.</td></tr>
              ) : null}
              {lines.map((line) => {
                const kg = line.priceBasis === "kg";
                const theory = kg
                  ? theoryGrams(stored(line.barCount), stored(line.lengthM) || null, line.gramsPerMeter, line.gramsPerBar)
                  : 0;
                const patch = (next: Partial<DraftLine>) => setLines(lines.map((item) => item.key === line.key ? { ...item, ...next } : item));
                return (
                  <Fragment key={line.key}>
                    <tr className="border-t border-line">
                      <td className="px-3 py-2">
                        <p className="font-medium text-ink">{line.code}</p>
                        <p className="text-xs text-muted">{line.name}</p>
                      </td>
                      <td className="px-3 py-2 text-muted">{line.unit}</td>
                      {kg ? (
                        <td colSpan={2} className="px-3 py-2 text-xs text-muted">Kho theo thanh, tiền theo kg</td>
                      ) : (
                        <>
                          <td className="px-3 py-2">
                            <input value={line.documentQty} onChange={(event) => patch({ documentQty: event.target.value })} className={`${inputClass} w-28`} inputMode="decimal" />
                          </td>
                          <td className="px-3 py-2">
                            <input value={line.receivedQty} onChange={(event) => patch({ receivedQty: event.target.value })} className={`${inputClass} w-28`} inputMode="decimal" />
                          </td>
                        </>
                      )}
                      <td className="px-3 py-2 text-right">
                        <button type="button" className="text-sm font-medium text-danger" onClick={() => setLines(lines.filter((item) => item.key !== line.key))}>Bỏ</button>
                      </td>
                    </tr>
                    {kg ? (
                      <tr className="border-t border-dashed border-line bg-soft/60">
                        <td colSpan={5} className="px-3 py-3">
                          <div className="grid gap-2 sm:grid-cols-3">
                            <label className="text-xs">
                              <span className="mb-1 block font-medium text-muted">Số thanh</span>
                              <input value={line.barCount} onChange={(event) => patch({ barCount: event.target.value })} className={inputClass} inputMode="decimal" />
                            </label>
                            <label className="text-xs">
                              <span className="mb-1 block font-medium text-muted">Dài (m)</span>
                              <input value={line.lengthM} onChange={(event) => patch({ lengthM: event.target.value })} className={inputClass} inputMode="decimal" />
                            </label>
                            <p className="text-xs">
                              <span className="mb-1 block font-medium text-muted">Kg/m</span>
                              <span className="flex h-9 items-center font-medium text-ink">{line.gramsPerMeter ? formatStockQty(line.gramsPerMeter) : "—"}</span>
                            </p>
                            <p className="text-xs">
                              <span className="mb-1 block font-medium text-muted">Kg lý thuyết</span>
                              <span className="flex h-9 items-center font-medium text-ink">{theory ? formatStockQty(theory) : "—"}</span>
                            </p>
                            <label className="text-xs">
                              <span className="mb-1 block font-medium text-muted">Kg hóa đơn</span>
                              <input value={line.invoiceKg} onChange={(event) => patch({ invoiceKg: event.target.value })} className={inputClass} inputMode="decimal" />
                            </label>
                            <label className="text-xs">
                              <span className="mb-1 block font-medium text-muted">Kg cân</span>
                              <input value={line.weighedKg} onChange={(event) => patch({ weighedKg: event.target.value })} className={inputClass} inputMode="decimal" />
                            </label>
                            <label className="text-xs sm:col-span-3">
                              <span className="mb-1 block font-medium text-muted">Trạng thái nhận</span>
                              <select value={line.receiveState} onChange={(event) => patch({ receiveState: event.target.value === "da_xac_nhan" ? "da_xac_nhan" : "tam_nhap" })} className={selectClass}>
                                {kgReceiveStates.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
                              </select>
                            </label>
                          </div>
                          {line.receiveState === "tam_nhap" ? <p className="mt-2 text-xs text-muted">Tạm nhập theo hóa đơn chưa cộng tồn.</p> : null}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Ảnh phiếu</span>
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block w-full text-sm text-muted" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Ghi chú</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} className={cn(inputClass, "h-16 py-2")} />
        </label>
      </div>
      <div className="sticky bottom-0 z-10 shrink-0 border-t border-line bg-white px-5 py-3">
        {error ? <p role="alert" className="mb-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Đóng</Button>
          <Button type="button" variant="outline" onClick={() => save(false)} disabled={busy}>{busy ? "Đang lưu" : "Lưu nháp"}</Button>
          <Button type="button" onClick={() => setAskPost(true)} disabled={busy}>Ghi sổ</Button>
        </div>
      </div>
      <AlertDialog open={askPost} onOpenChange={(next) => { if (!busy) setAskPost(next); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ghi sổ phiếu</AlertDialogTitle>
            <AlertDialogDescription>
              Phiếu sẽ cộng trừ tồn theo số lượng thực nhận. Sau khi ghi sổ không sửa và không xóa được.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Hủy</AlertDialogCancel>
            <Button type="button" disabled={busy} onClick={() => save(true)}>{busy ? "Đang ghi sổ" : "Ghi sổ"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PlaceField({
  label,
  kind,
  refId,
  projects,
  partners,
  onKind,
  onRef,
}: {
  label: string;
  kind: string;
  refId: string;
  projects: PartyOption[];
  partners: PartyOption[];
  onKind: (value: string) => void;
  onRef: (value: string) => void;
}) {
  const movable = stockPlaces.filter((item) => item.usable);
  return (
    <div className="grid gap-2">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">{label}</span>
        <select value={isMovablePlace(kind) ? kind : "kho"} onChange={(event) => { onKind(event.target.value); onRef(""); }} className={selectClass}>
          {movable.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
        </select>
      </label>
      {kind === "cong_trinh" ? (
        <select value={refId} onChange={(event) => onRef(event.target.value)} className={selectClass}>
          <option value="">Chọn công trình</option>
          {projects.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}
        </select>
      ) : null}
      {kind === "ncc" || kind === "xuong" ? (
        <select value={refId} onChange={(event) => onRef(event.target.value)} className={selectClass}>
          <option value="">{kind === "xuong" ? "Xưởng nội bộ" : "Chọn nhà cung cấp"}</option>
          {partners.map((item) => <option key={item.id} value={item.id}>{item.code}{item.name && item.name !== item.code ? ` · ${item.name}` : ""}</option>)}
        </select>
      ) : null}
    </div>
  );
}
