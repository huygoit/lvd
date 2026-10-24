"use client";

import { useState } from "react";
import { cn, focusRing } from "@/shared/lib/cn";

type Field = { name: string; label: string; required?: boolean };

export function CreateForm({
  title,
  description,
  endpoint,
  fields,
}: {
  title: string;
  description: string;
  endpoint: string;
  fields: Field[];
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    const missing = fields.find((field) => field.required && String(formData.get(field.name) ?? "").trim() === "");
    if (missing) {
      setMessage(`Cần nhập ${missing.label.toLocaleLowerCase("vi-VN")}.`);
      return;
    }
    setPending(true);
    setMessage(null);
    const payload = Object.fromEntries(fields.map((field) => [field.name, String(formData.get(field.name) ?? "")]));
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    setMessage(body?.message ?? "Không gửi được yêu cầu.");
    setPending(false);
  }

  return (
    <form action={onSubmit} className="max-w-xl rounded-[18px] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      <div className="mt-5 space-y-4">
        {fields.map((field) => (
          <label key={field.name} className="block text-sm font-medium text-ink">
            {field.label}
            <input name={field.name} className={cn("mt-1 h-11 w-full rounded-[12px] border border-line px-3 text-sm font-normal", focusRing)} />
          </label>
        ))}
      </div>
      <button type="submit" disabled={pending} className={cn("mt-5 inline-flex h-11 items-center rounded-[12px] bg-primary px-4 text-sm font-semibold text-white", focusRing)}>
        {pending ? "Đang gửi" : "Ghi nhận"}
      </button>
      {message ? (
        <p className="mt-4 text-sm text-ink" role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}
