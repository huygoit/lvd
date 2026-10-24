"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass, selectClass } from "@/shared/components/controls";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/cn";
import { callApi } from "@/shared/client/api";
import { measureInput } from "@/modules/materials/labels";
import { isMaterialGroup, materialGroups, materialNatures, materialPriceBases } from "@/shared/catalog/materials";
import { measureUnits } from "@/shared/catalog/units";

export type MaterialDraft = {
  id: string;
  code: string;
  name: string;
  groupName: string;
  supplierCode: string;
  supplierItemCode: string;
  otherCode: string;
  spec: string;
  color: string;
  stockUnit: string;
  priceBasis: string;
  barLengthMm: number | null;
  gramsPerMeter: number | null;
  gramsPerBar: number | null;
  taxBps: number;
  referencePrice: number | null;
  invoiceName: string;
  nature: string;
  note: string;
  revision: number;
};

export function MaterialForm({
  mode,
  initial,
  onClose,
  onSaved,
}: {
  mode: "them" | "sua";
  initial?: MaterialDraft;
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [basis, setBasis] = useState(initial?.priceBasis || "sl");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      if (mode === "them") await callApi("/api/vat-tu", { method: "POST", body: JSON.stringify(body) });
      else await callApi(`/api/vat-tu/${initial?.id}`, { method: "PATCH", body: JSON.stringify(body) });
      router.refresh();
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được.");
      setBusy(false);
    }
  }

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {initial ? <input type="hidden" name="revision" value={initial.revision} /> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Mã vật tư</span>
            <input name="code" required defaultValue={initial?.code ?? ""} className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Nhóm</span>
            <select name="groupName" defaultValue={initial?.groupName ?? ""} className={selectClass}>
              <option value="">Chưa có nhóm</option>
              {initial?.groupName && !isMaterialGroup(initial.groupName) ? <option value={initial.groupName}>{initial.groupName}</option> : null}
              {materialGroups.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Tên vật tư</span>
          <input name="name" required defaultValue={initial?.name ?? ""} className={inputClass} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Tính chất</span>
            <select name="nature" defaultValue={initial?.nature ?? "vat_tu"} className={selectClass}>
              {materialNatures.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Đơn vị tính</span>
            <select name="stockUnit" required defaultValue={initial?.stockUnit || "cái"} className={selectClass}>
              {measureUnits.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Mã nhà cung cấp</span>
            <input name="supplierCode" defaultValue={initial?.supplierCode ?? ""} className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Mã hàng của nhà cung cấp</span>
            <input name="supplierItemCode" defaultValue={initial?.supplierItemCode ?? ""} className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Mã khác</span>
            <input name="otherCode" defaultValue={initial?.otherCode ?? ""} className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Màu</span>
            <input name="color" defaultValue={initial?.color ?? ""} className={inputClass} />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Quy cách</span>
          <input name="spec" defaultValue={initial?.spec ?? ""} className={inputClass} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Tính tiền theo</span>
            <select name="priceBasis" value={basis} onChange={(event) => setBasis(event.target.value)} className={selectClass}>
              {materialPriceBases.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Thuế suất (%)</span>
            <input name="taxPercent" required defaultValue={initial ? String(initial.taxBps / 100) : "10"} className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Đơn giá tham chiếu</span>
            <input name="referencePrice" inputMode="numeric" defaultValue={initial?.referencePrice ?? ""} className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Tên trên hóa đơn</span>
            <input name="invoiceName" defaultValue={initial?.invoiceName ?? ""} className={inputClass} />
          </label>
        </div>
        {basis === "kg" ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Dài thanh (m)</span>
              <input name="barLengthM" defaultValue={measureInput(initial?.barLengthMm ?? null)} className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Kg/m</span>
              <input name="kgPerM" defaultValue={measureInput(initial?.gramsPerMeter ?? null)} className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Kg/thanh</span>
              <input name="kgPerBar" defaultValue={measureInput(initial?.gramsPerBar ?? null)} className={inputClass} />
            </label>
          </div>
        ) : null}
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Ghi chú</span>
          <textarea name="note" defaultValue={initial?.note ?? ""} className={cn(inputClass, "h-16 py-2")} />
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
      <div className="sticky bottom-0 z-10 flex shrink-0 justify-end gap-2 border-t border-line bg-white px-5 py-3">
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Đóng</Button>
        <Button type="submit" disabled={busy}>{busy ? "Đang lưu" : "Lưu"}</Button>
      </div>
    </form>
  );
}
