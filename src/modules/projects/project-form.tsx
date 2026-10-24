"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { callApi, formDataOf } from "@/shared/client/api";
import { Field, inputClass } from "@/shared/components/controls";
import { NgayNhap } from "@/shared/components/ngay-nhap";
import { Button } from "@/shared/components/ui/button";
import { SheetFooter } from "@/shared/components/ui/sheet";
import { projectStageLabel } from "@/modules/customers/labels";

type Customer = { id: string; code: string; name: string };
type Staff = { id: string; name: string };

export type ProjectDraft = {
  id: string;
  customerId: string;
  name: string;
  location: string;
  venture: string;
  bidPackage: string;
  startedOn: string;
  endedOn: string;
  vatPercent: number | null;
  ownerId: string;
  note: string;
  stage: string;
  revision: number | null;
};

export function ProjectForm({
  mode,
  customers,
  staff,
  initial,
  canQuote,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  customers: Customer[];
  staff: Staff[];
  initial: ProjectDraft;
  canQuote: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(initial.customerId);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = formDataOf(event);
    const intent = String(form.get("intent") || "save");
    setBusy(true);
    setError("");
    const body = Object.fromEntries(form.entries());
    try {
      if (mode === "create") {
        const created = await callApi<{ id: string }>("/api/cong-trinh", { method: "POST", body: JSON.stringify(body) });
        if (intent === "quote") {
          router.push(`/bao-gia/moi?khach=${String(body.customerId)}&cong-trinh=${created.id}`);
          return;
        }
        onSaved();
        return;
      }
      await callApi(`/api/cong-trinh/${initial.id}`, { method: "PATCH", body: JSON.stringify(body) });
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {mode === "create" && customers.length === 0 ? (
          <p className="text-sm text-ink">
            Chưa có khách đang sử dụng.{" "}
            <Link className="font-semibold text-primary" href="/khach-hang/moi">
              Thêm khách trước
            </Link>
          </p>
        ) : (
          <>
            <input type="hidden" name="revision" value={initial.revision ?? ""} />
            <Field label="Khách hàng">
              <select
                name="customerId"
                className={inputClass}
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                disabled={mode === "edit"}
                required
              >
                <option value="">Chọn khách</option>
                {customers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} · {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tên công trình">
              <input name="name" defaultValue={initial.name} className={inputClass} required autoFocus placeholder="Nhà phố Nguyễn Trãi" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Dự án">
                <input name="venture" defaultValue={initial.venture} className={inputClass} placeholder="Tên dự án" />
              </Field>
              <Field label="Gói thầu">
                <input name="bidPackage" defaultValue={initial.bidPackage} className={inputClass} placeholder="Tên gói thầu" />
              </Field>
              <Field label="Địa chỉ công trình">
                <input name="location" defaultValue={initial.location} className={inputClass} placeholder="Số nhà, đường, phường" />
              </Field>
              <Field label="Ngày bắt đầu">
                <NgayNhap name="startedOn" defaultValue={initial.startedOn} className={inputClass} />
              </Field>
              <Field label="Ngày kết thúc">
                <NgayNhap name="endedOn" defaultValue={initial.endedOn} className={inputClass} />
              </Field>
              <Field label="Người phụ trách">
                <select name="ownerId" defaultValue={initial.ownerId} className={inputClass}>
                  {staff.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              {mode === "edit" ? (
                <Field label="Giai đoạn">
                  <select name="stage" defaultValue={initial.stage} className={inputClass}>
                    {Object.entries(projectStageLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Thuế GTGT (VAT)">
                <ThueGtgt defaultValue={initial.vatPercent} />
              </Field>
            </div>
            <Field label="Ghi chú">
              <textarea name="note" defaultValue={initial.note} className={`${inputClass} h-24 py-2`} />
            </Field>
          </>
        )}
      </div>
      {error ? <p className="px-5 pb-2 text-sm text-danger" role="alert">{error}</p> : null}
      <SheetFooter className="flex flex-wrap justify-end gap-2 bg-white">
        <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Đóng</Button>
        {mode === "create" && customers.length > 0 && canQuote ? (
          <Button type="submit" name="intent" value="quote" variant="outline" disabled={busy}>Lưu và lập báo giá</Button>
        ) : null}
        {mode === "edit" || customers.length > 0 ? (
          <Button type="submit" name="intent" value="save" disabled={busy}>{busy ? "Đang lưu" : "Lưu"}</Button>
        ) : null}
      </SheetFooter>
    </form>
  );
}

function ThueGtgt({ defaultValue }: { defaultValue: number | null }) {
  const [digits, setDigits] = useState(defaultValue === null ? "" : String(defaultValue));
  return (
    <input
      name="vatPercent"
      value={digits}
      inputMode="numeric"
      placeholder=""
      onChange={(event) => {
        const raw = event.target.value;
        if (raw !== "" && !/^\d+$/.test(raw)) return;
        setDigits(raw.replace(/^0+/, "").slice(0, 10));
      }}
      className={inputClass}
    />
  );
}
