"use client";

import { useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { callApi } from "@/shared/client/api";
import { nhanVatPercent, vatPercents } from "@/shared/catalog/vat";
import { buttonGhost, buttonPrimary, Field, inputClass } from "@/shared/components/controls";
import { loiTongPhanTramThanhToan, tongPhanTramThanhToan } from "@/modules/quotations/document";
import type { TieuChuanBaoGia } from "@/modules/settings/quote-standard";

type Dot = { key: string; content: string; value: string };

function blankDot(): Dot {
  return { key: crypto.randomUUID(), content: "", value: "" };
}

function fromDots(rows: { content: string; value: string }[]): Dot[] {
  if (!rows.length) return [blankDot()];
  return rows.map((row) => ({
    key: crypto.randomUUID(),
    content: row.content,
    value: String(row.value ?? "").replace(/\D/g, "").slice(0, 3),
  }));
}

export function QuoteStandardScreen({ initial }: { initial: TieuChuanBaoGia }) {
  const [greeting, setGreeting] = useState(initial.greeting);
  const [validityDays, setValidityDays] = useState(String(initial.validityDays));
  const [warrantyMonths, setWarrantyMonths] = useState(
    initial.warrantyMonths ? String(initial.warrantyMonths) : "",
  );
  const [taxPercent, setTaxPercent] = useState(initial.taxPercent);
  const [dots, setDots] = useState<Dot[]>(() => fromDots(initial.paymentMilestones));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const mocTt = useMemo(
    () => dots.map((row) => ({ content: row.content.trim(), value: row.value.trim() })),
    [dots],
  );
  const tongPhanTramTt = useMemo(() => tongPhanTramThanhToan(mocTt), [mocTt]);
  const loiPhanTramTt = useMemo(() => loiTongPhanTramThanhToan(mocTt), [mocTt]);

  async function luu() {
    setBusy(true);
    setError("");
    setOk("");
    try {
      if (loiPhanTramTt) throw new Error(loiPhanTramTt);
      const saved = await callApi<TieuChuanBaoGia>("/api/cai-dat/tieu-chuan-bao-gia", {
        method: "PUT",
        body: JSON.stringify({
          greeting,
          validityDays: Number(validityDays || 0),
          warrantyMonths: Number(warrantyMonths || 0),
          taxPercent,
          paymentMilestones: dots
            .filter((row) => row.content.trim() || row.value.trim())
            .map((row) => ({ content: row.content.trim(), value: row.value.trim() })),
        }),
      });
      setGreeting(saved.greeting);
      setValidityDays(String(saved.validityDays));
      setWarrantyMonths(saved.warrantyMonths ? String(saved.warrantyMonths) : "");
      setTaxPercent(saved.taxPercent);
      setDots(fromDots(saved.paymentMilestones));
      setOk("Đã lưu cấu hình tiêu chuẩn báo giá.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được cấu hình.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[18px] border border-line bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Lời chào báo giá</h2>
        <p className="mt-1 text-xs text-muted">Câu dẫn trên bản in, trước bảng hạng mục. Báo giá mới nhận snapshot câu này.</p>
        <textarea
          className={`${inputClass} mt-3 min-h-24 py-2`}
          value={greeting}
          rows={3}
          placeholder="Xin gửi báo giá với thông tin như sau:"
          onChange={(event) => setGreeting(event.target.value)}
        />
      </section>

      <section className="rounded-[18px] border border-line bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Thuế VAT & hiệu lực mặc định</h2>
        <p className="mt-1 text-xs text-muted">Giá trị này được nạp sẵn khi tạo báo giá mới; vẫn sửa được trên từng báo giá.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Field label="Thuế GTGT mặc định">
            <select className={inputClass} value={taxPercent} onChange={(event) => setTaxPercent(event.target.value)}>
              <option value="chua">Chưa bao gồm VAT</option>
              {vatPercents.map((muc) => (
                <option key={muc} value={String(muc)}>
                  {nhanVatPercent(muc)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Hiệu lực báo giá (số ngày)">
            <input
              className={inputClass}
              inputMode="numeric"
              value={validityDays}
              placeholder="15"
              onChange={(event) => setValidityDays(event.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </Field>
          <Field label="Bảo hành kỹ thuật (tháng)">
            <input
              className={inputClass}
              inputMode="numeric"
              value={warrantyMonths}
              placeholder="0"
              onChange={(event) => setWarrantyMonths(event.target.value.replace(/\D/g, "").slice(0, 3))}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-[18px] border border-line bg-white p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-ink">Điều kiện thương mại — đợt thanh toán</h2>
            <p className="mt-1 text-xs text-muted">Mẫu đợt mặc định khi tạo báo giá mới. Giá trị là số %.</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
            onClick={() => setDots((current) => [...current, blankDot()])}
          >
            <Plus className="size-4" aria-hidden />
            Thêm đợt
          </button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[560px] table-fixed border-collapse text-sm">
            <thead>
              <tr className="bg-soft text-xs text-muted">
                <th className="w-14 px-2 py-2 text-center font-medium">STT</th>
                <th className="px-2 py-2 text-left font-medium">Nội dung</th>
                <th className="w-36 px-2 py-2 text-right font-medium">Giá trị (%)</th>
                <th className="w-12 px-1 py-2" />
              </tr>
            </thead>
            <tbody>
              {dots.map((row, index) => (
                <tr key={row.key} className="border-t border-line/70">
                  <td className="px-2 py-1.5 text-center tabular-nums text-muted">{index + 1}</td>
                  <td className="px-2 py-1.5">
                    <input
                      className={`${inputClass} border-transparent px-0 shadow-none`}
                      value={row.content}
                      placeholder="Tạm ứng, ngay sau khi ký…"
                      onChange={(event) =>
                        setDots((current) =>
                          current.map((item) =>
                            item.key === row.key ? { ...item, content: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className={`${inputClass} border-transparent px-0 text-right shadow-none tabular-nums`}
                      inputMode="numeric"
                      value={row.value}
                      placeholder="40"
                      onChange={(event) => {
                        const digits = event.target.value.replace(/\D/g, "").slice(0, 3);
                        setDots((current) =>
                          current.map((item) => (item.key === row.key ? { ...item, value: digits } : item)),
                        );
                      }}
                    />
                  </td>
                  <td className="px-1 py-1.5 text-center">
                    <button
                      type="button"
                      className="inline-flex h-8 items-center justify-center px-1 text-danger"
                      title="Xóa đợt"
                      onClick={() => setDots((current) => current.filter((item) => item.key !== row.key))}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={`mt-2 text-xs ${loiPhanTramTt ? "font-medium text-danger" : "text-muted"}`}>
          {loiPhanTramTt || `Tổng tỷ lệ thanh toán: ${tongPhanTramTt}%`}
        </p>
      </section>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {ok ? <p className="text-sm font-medium text-emerald-700">{ok}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonPrimary} disabled={busy} onClick={() => void luu()}>
          <Save className="size-4" aria-hidden />
          Lưu cấu hình
        </button>
        <button
          type="button"
          className={buttonGhost}
          disabled={busy}
          onClick={() => {
            setGreeting(initial.greeting);
            setValidityDays(String(initial.validityDays));
            setWarrantyMonths(initial.warrantyMonths ? String(initial.warrantyMonths) : "");
            setTaxPercent(initial.taxPercent);
            setDots(fromDots(initial.paymentMilestones));
            setError("");
            setOk("");
          }}
        >
          Hoàn tác
        </button>
      </div>
    </div>
  );
}
