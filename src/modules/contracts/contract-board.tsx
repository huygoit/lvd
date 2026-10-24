"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { callApi, formDataOf } from "@/shared/client/api";
import { buttonGhost, buttonPrimary, Field, inputClass, selectClass } from "@/shared/components/controls";
import { NgayNhap } from "@/shared/components/ngay-nhap";
import { changeStatusLabel, paymentBasisLabel, priceBasisLabel } from "@/modules/contracts/labels";

type Line = { id: string; kind: string; code: string; name: string };

export function ContractBoard({
  id,
  revision,
  frozen,
  canEdit,
  lines,
  changes,
  flags,
  draft,
}: {
  id: string;
  revision: number;
  frozen: boolean;
  canEdit: boolean;
  lines: Line[];
  changes: { id: string; title: string; status: string }[];
  flags: { submit: boolean; withdraw: boolean; approve: boolean; sign: boolean; effect: boolean };
  draft: { name: string; signedNumber: string; priceBasis: string; scopeText: string; paymentText: string; warrantyText: string; declaredSignedTotal: number | null };
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(url: string, body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      await callApi(url, { method: "POST", body: JSON.stringify(body) });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được.");
    } finally {
      setBusy(false);
    }
  }

  function onCreate(url: string) {
    return async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = formDataOf(event);
      const body = Object.fromEntries(form.entries());
      await send(url, body);
      event.currentTarget.reset();
    };
  }

  return (
    <div className="space-y-4">
      {canEdit && !frozen ? (
        <form
          className="grid gap-3 rounded-[18px] border border-line bg-white p-4 sm:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = formDataOf(event);
            setBusy(true);
            setError("");
            try {
              await callApi(`/api/hop-dong/${id}`, { method: "PATCH", body: JSON.stringify({ ...Object.fromEntries(form.entries()), revision }) });
              router.refresh();
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Không lưu được.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Tên">
            <input name="name" defaultValue={draft.name} className={inputClass} />
          </Field>
          <Field label="Số ký trên công trình">
            <input name="signedNumber" defaultValue={draft.signedNumber} className={inputClass} />
          </Field>
          <Field label="Cơ sở giá">
            <select name="priceBasis" defaultValue={draft.priceBasis} className={selectClass}>
              {Object.entries(priceBasisLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Tổng ký khai báo">
            <input name="declaredSignedTotal" defaultValue={draft.declaredSignedTotal ?? ""} className={inputClass} inputMode="numeric" placeholder="Chưa có thì để trống" />
          </Field>
          <Field label="Phạm vi">
            <textarea name="scopeText" defaultValue={draft.scopeText} className={`${inputClass} h-20 py-2`} />
          </Field>
          <Field label="Thanh toán">
            <textarea name="paymentText" defaultValue={draft.paymentText} className={`${inputClass} h-20 py-2`} />
          </Field>
          <div className="sm:col-span-2">
            <button className={buttonGhost} disabled={busy}>Lưu nháp</button>
          </div>
        </form>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {flags.submit ? <button type="button" className={buttonPrimary} disabled={busy} onClick={() => send(`/api/hop-dong/${id}/hanh-dong`, { action: "gui-duyet" })}>Gửi duyệt</button> : null}
        {flags.withdraw ? <button type="button" className={buttonGhost} disabled={busy} onClick={() => send(`/api/hop-dong/${id}/hanh-dong`, { action: "rut-nhap" })}>Rút về nháp</button> : null}
        {flags.approve ? <button type="button" className={buttonPrimary} disabled={busy} onClick={() => send(`/api/hop-dong/${id}/hanh-dong`, { action: "duyet" })}>Duyệt nội bộ</button> : null}
        {flags.approve ? <button type="button" className={buttonGhost} disabled={busy} onClick={() => send(`/api/hop-dong/${id}/hanh-dong`, { action: "yeu-cau-sua" })}>Yêu cầu chỉnh</button> : null}
      </div>
      {flags.sign ? (
        <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); const form = formDataOf(event); void send(`/api/hop-dong/${id}/hanh-dong`, { action: "ghi-ky", signedOn: String(form.get("signedOn") ?? "") }); }}>
          <Field label="Ngày ký">
            <NgayNhap name="signedOn" className={inputClass} required />
          </Field>
          <button className={buttonPrimary} disabled={busy}>Ghi nhận đã ký</button>
        </form>
      ) : null}
      {flags.effect ? (
        <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); const form = formDataOf(event); void send(`/api/hop-dong/${id}/hanh-dong`, { action: "ghi-hieu-luc", effectiveOn: String(form.get("effectiveOn") ?? "") }); }}>
          <Field label="Ngày hiệu lực">
            <NgayNhap name="effectiveOn" className={inputClass} required />
          </Field>
          <button className={buttonGhost} disabled={busy}>Ghi nhận hiệu lực</button>
        </form>
      ) : null}
      {canEdit ? (
        <form onSubmit={onCreate(`/api/hop-dong/${id}/moc`)} className="flex flex-wrap items-end gap-2">
          <Field label="Mốc nội bộ">
            <input name="name" className={inputClass} placeholder="Chốt bản vẽ" required />
          </Field>
          <Field label="Kế hoạch">
            <NgayNhap name="planOn" className={inputClass} />
          </Field>
          <button className={buttonGhost} disabled={busy}>Thêm mốc</button>
        </form>
      ) : null}
      {canEdit && !frozen ? (
        <form onSubmit={onCreate(`/api/hop-dong/${id}/thanh-toan`)} className="flex flex-wrap items-end gap-2">
          <Field label="Đợt thu">
            <input name="name" className={inputClass} placeholder="Tạm ứng" required />
          </Field>
          <Field label="Cơ sở">
            <select name="basis" className={selectClass} defaultValue="chua_xac_nhan">
              {Object.entries(paymentBasisLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Số tiền">
            <input name="amount" className={inputClass} inputMode="numeric" />
          </Field>
          <button className={buttonGhost} disabled={busy}>Thêm đợt</button>
        </form>
      ) : null}
      {canEdit ? (
        <form onSubmit={onCreate(`/api/hop-dong/${id}/phat-sinh`)} className="grid gap-3 sm:grid-cols-2">
          <Field label="Phát sinh">
            <input name="title" className={inputClass} required placeholder="Tăng cửa nhà G" />
          </Field>
          <Field label="Ký hiệu">
            <select name="lineId" className={selectClass} defaultValue="">
              <option value="">Không gắn dòng</option>
              {lines.map((line) => <option key={line.id} value={line.id}>{line.code ? `${line.code} · ` : ""}{line.name}</option>)}
            </select>
          </Field>
          <Field label="Chênh số bộ">
            <input name="deltaQuantity" className={inputClass} placeholder="Dương hoặc âm" />
          </Field>
          <Field label="Lý do">
            <input name="reason" className={inputClass} />
          </Field>
          <div className="sm:col-span-2">
            <button className={buttonGhost} disabled={busy}>Tạo phát sinh</button>
          </div>
        </form>
      ) : null}
      {flags.approve ? changes.filter((item) => item.status === "nhap" || item.status === "cho_duyet").map((item) => (
        <button key={item.id} type="button" className={buttonGhost} disabled={busy} onClick={() => send(`/api/hop-dong/${id}/hanh-dong`, { action: "chap-thuan-phat-sinh", changeId: item.id })}>
          Chấp thuận nội bộ: {item.title}
        </button>
      )) : null}
      {flags.effect ? changes.filter((item) => item.status === "chap_thuan").map((item) => (
        <button key={item.id} type="button" className={buttonPrimary} disabled={busy} onClick={() => send(`/api/hop-dong/${id}/hanh-dong`, { action: "hieu-luc-phu-luc", changeId: item.id })}>
          Ghi hiệu lực phụ lục: {item.title}
        </button>
      )) : null}
      {changes.length > 0 ? (
        <ul className="text-sm text-muted">
          {changes.map((item) => <li key={item.id}>{item.title} · {changeStatusLabel[item.status as keyof typeof changeStatusLabel]}</li>)}
        </ul>
      ) : null}
      <p className="text-xs text-muted">Bản nháp số {revision}. Chấp thuận nội bộ chưa tăng giá trị hợp đồng hay công nợ.</p>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
