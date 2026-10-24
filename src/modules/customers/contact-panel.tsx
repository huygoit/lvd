"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { callApi } from "@/shared/client/api";
import { buttonGhost, buttonPrimary, Field, inputClass } from "@/shared/components/controls";

type Contact = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  isPrimary: boolean;
};

export function ContactPanel({
  customerId,
  contacts,
  onChanged,
}: {
  customerId: string;
  contacts: Contact[];
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
      await callApi(`/api/khach-hang/${customerId}/lien-he`, {
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
      await callApi(`/api/lien-he/${id}`, { method: "DELETE" });
      router.refresh();
      onChanged?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không xóa được.");
    }
  }

  return (
    <section className="rounded-[18px] border border-line bg-white p-4">
      <h2 className="text-base font-semibold text-ink">Người liên hệ</h2>
      <ul className="mt-3 divide-y divide-line">
        {contacts.length === 0 ? <li className="py-2 text-sm text-muted">Chưa có người liên hệ.</li> : null}
        {contacts.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span>
              <span className="font-medium">{item.name}</span>
              {item.isPrimary ? <span className="ml-2 text-xs text-primary">Chính</span> : null}
              <span className="mt-0.5 block text-muted">
                {[item.role, item.phone, item.email].filter(Boolean).join(" · ") || "Chưa có số"}
              </span>
            </span>
            <button type="button" className="text-sm font-semibold text-danger" onClick={() => remove(item.id)}>
              Xóa
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={onSubmit} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Họ tên">
          <input name="name" className={inputClass} required placeholder="Nguyễn Văn A" />
        </Field>
        <Field label="Điện thoại">
          <input
            name="phone"
            className={inputClass}
            inputMode="numeric"
            maxLength={12}
            placeholder="Chỉ nhập số"
            onInput={(event) => {
              const input = event.currentTarget;
              input.value = input.value.replace(/\D/g, "").slice(0, 12);
            }}
          />
        </Field>
        <button className={buttonPrimary} disabled={busy}>
          Thêm liên hệ
        </button>
        <label className="flex items-center gap-2 text-sm sm:col-span-3">
          <input name="isPrimary" type="checkbox" defaultChecked={contacts.length === 0} />
          Đặt làm liên hệ chính
        </label>
      </form>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </section>
  );
}

export function ArchiveButton({ id, onDone }: { id: string; onDone?: () => void }) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function archive() {
    if (!window.confirm("Lưu trữ khách này? Hồ sơ cũ vẫn giữ, không tạo công trình mới.")) return;
    try {
      await callApi(`/api/khach-hang/${id}/luu-tru`, { method: "POST" });
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
