"use client";

import { Save } from "lucide-react";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { callApi, formDataOf } from "@/shared/client/api";
import { buttonPrimary, Field, inputClass } from "@/shared/components/controls";
import { NgayNhap } from "@/shared/components/ngay-nhap";

/** Form rút gọn: tên hợp đồng + ngày ký. Các trường khác lấy từ quan hệ (công trình/khách/báo giá). */
export function ContractBoard({
  id,
  revision,
  canEdit,
  draft,
}: {
  id: string;
  revision: number;
  canEdit: boolean;
  draft: { name: string; signedOn: string };
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = formDataOf(event);
    setBusy(true);
    setError("");
    try {
      await callApi(`/api/hop-dong/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...Object.fromEntries(form.entries()), revision }),
      });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được.");
    } finally {
      setBusy(false);
    }
  }

  if (!canEdit) {
    return (
      <div className="rounded-[18px] border border-line bg-white p-4 text-sm text-muted">
        Bạn không có quyền sửa hợp đồng này.
      </div>
    );
  }

  return (
    <form onSubmit={onSave} className="grid gap-4 rounded-[18px] border border-line bg-white p-5 shadow-[var(--shadow-card)] sm:grid-cols-2">
      <Field label="Tên hợp đồng">
        <input name="name" defaultValue={draft.name} className={inputClass} required />
      </Field>
      <Field label="Ngày ký">
        <NgayNhap name="signedOn" defaultValue={draft.signedOn} className={inputClass} />
      </Field>
      {error ? <p className="sm:col-span-2 text-sm text-danger">{error}</p> : null}
      <div className="sm:col-span-2">
        <button type="submit" className={buttonPrimary} disabled={busy}>
          <Save className="size-4" aria-hidden /> {busy ? "Đang lưu…" : "Lưu"}
        </button>
      </div>
    </form>
  );
}
