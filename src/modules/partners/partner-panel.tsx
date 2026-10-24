"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { callApi } from "@/shared/client/api";
import { buttonGhost, buttonPrimary, Field, inputClass } from "@/shared/components/controls";
import { JobTitleField } from "@/modules/settings/job-title-field";

type Contact = {
  id: string;
  name: string;
  title: string;
  phone: string;
  email: string;
  isPrimary: boolean;
};

export function PartnerContactPanel({
  partnerId,
  contacts,
  titles = [],
  onChanged,
}: {
  partnerId: string;
  contacts: Contact[];
  titles?: string[];
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setBusy(true);
    setError("");
    try {
      await callApi(`/api/doi-tac/${partnerId}/lien-he`, {
        method: "POST",
        body: JSON.stringify({ ...data, isPrimary: data.isPrimary === "on" || contacts.length === 0 }),
      });
      form.reset();
      router.refresh();
      onChanged?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được liên hệ.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Xóa người liên hệ này?")) return;
    setError("");
    try {
      await callApi(`/api/doi-tac/lien-he/${id}`, { method: "DELETE" });
      router.refresh();
      onChanged?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không xóa được.");
    }
  }

  return (
    <section className="rounded-[18px] border border-line bg-white p-4 shadow-[var(--shadow-card)]">
      <h2 className="text-base font-semibold text-ink">Người liên hệ</h2>
      <ul className="mt-3 divide-y divide-line">
        {contacts.length === 0 ? <li className="py-2 text-sm text-muted">Chưa có người liên hệ.</li> : null}
        {contacts.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span>
              <span className="font-medium">{item.name}</span>
              {item.isPrimary ? <span className="ml-2 text-xs font-semibold text-primary">Chính</span> : null}
              <span className="mt-0.5 block text-muted">{[item.title, item.phone, item.email].filter(Boolean).join(" · ") || "Chưa có số"}</span>
            </span>
            <button type="button" className="text-sm font-semibold text-danger" onClick={() => remove(item.id)}>
              Xóa
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={onSubmit} className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Họ tên">
          <input name="name" className={inputClass} required placeholder="Nguyễn Văn A" />
        </Field>
        <JobTitleField name="title" label="Chức danh" titles={titles} />
        <Field label="Điện thoại">
          <input name="phone" className={inputClass} inputMode="tel" />
        </Field>
        <Field label="Email">
          <input name="email" type="email" className={inputClass} />
        </Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input name="isPrimary" type="checkbox" defaultChecked={contacts.length === 0} className="size-4 accent-primary" />
          Đặt làm liên hệ chính
        </label>
        <button className={`${buttonPrimary} sm:w-fit`} disabled={busy}>
          Thêm liên hệ
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </section>
  );
}

export function ArchivePartnerButton({ id, onDone }: { id: string; onDone?: () => void }) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function archive() {
    if (!window.confirm("Lưu trữ đối tác này? Hồ sơ cũ vẫn giữ.")) return;
    try {
      await callApi(`/api/doi-tac/${id}/luu-tru`, { method: "POST" });
      router.refresh();
      onDone?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu trữ được.");
    }
  }

  return (
    <span>
      <button type="button" className={buttonGhost} onClick={archive}>
        Lưu trữ
      </button>
      {error ? <span className="ml-2 text-sm text-danger">{error}</span> : null}
    </span>
  );
}
