"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { callApi, formDataOf } from "@/shared/client/api";
import { Field, inputClass } from "@/shared/components/controls";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/components/ui/button";
import { partnerRoleHint, partnerRoleLabel, partnerRoles, type PartnerRole } from "@/modules/partners/roles";
import { JobTitleField } from "@/modules/settings/job-title-field";

export type PartnerDraft = {
  code: string;
  name: string;
  shortName: string;
  taxCode: string;
  phone: string;
  email: string;
  website: string;
  bankName: string;
  accountNumber: string;
  address: string;
  representativeName: string;
  representativeTitle: string;
  note: string;
  roles: PartnerRole[];
  revision?: number;
};

type Warning = { kind: "doi_tac" | "khach_hang"; id: string; code: string; name: string };

export function PartnerForm({
  mode,
  initial,
  partnerId,
  titles = [],
  inSheet = false,
  onSaved,
  onClose,
  onOpenPartner,
}: {
  mode: "create" | "edit";
  initial: PartnerDraft;
  partnerId?: string;
  titles?: string[];
  inSheet?: boolean;
  onSaved?: () => void;
  onClose?: () => void;
  onOpenPartner?: (id: string) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState("");
  const [busy, setBusy] = useState(false);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [savedId, setSavedId] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savedId) return;
    const form = formDataOf(event);
    setBusy(true);
    setError("");
    setConflict("");
    const body = {
      code: String(form.get("code") ?? ""),
      name: String(form.get("name") ?? ""),
      shortName: String(form.get("shortName") ?? ""),
      taxCode: String(form.get("taxCode") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      website: String(form.get("website") ?? ""),
      bankName: String(form.get("bankName") ?? ""),
      accountNumber: String(form.get("accountNumber") ?? ""),
      address: String(form.get("address") ?? ""),
      representativeName: String(form.get("representativeName") ?? ""),
      representativeTitle: String(form.get("representativeTitle") ?? ""),
      note: String(form.get("note") ?? ""),
      revision: form.get("revision") ? Number(form.get("revision")) : undefined,
      roles: form.getAll("roles").map(String),
    };
    try {
      const result = await callApi<{ partner: { id: string }; warnings: Warning[] }>(
        mode === "create" ? "/api/doi-tac" : `/api/doi-tac/${partnerId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          body: JSON.stringify(body),
        },
      );
      if (result.warnings.length > 0) {
        setWarnings(result.warnings);
        setSavedId(result.partner.id);
        router.refresh();
        setBusy(false);
        return;
      }
      if (onSaved) onSaved();
      else router.push("/doi-tac");
    } catch (caught) {
      const details = (caught as { details?: { partnerId?: string } }).details;
      setConflict(details?.partnerId ?? "");
      setError(caught instanceof Error ? caught.message : "Không lưu được.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={inSheet ? "flex min-h-0 flex-1 flex-col" : "space-y-5 rounded-[18px] border border-line bg-white p-4 shadow-[var(--shadow-card)] sm:p-5"}>
      <div className={inSheet ? "min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4" : "space-y-5"}>
      <input type="hidden" name="revision" value={initial.revision ?? ""} />
      <fieldset>
        <legend className="text-sm font-medium text-ink">Vai trò</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {partnerRoles.map((role) => (
            <label
              key={role}
              className="flex cursor-pointer gap-3 rounded-xl border border-line px-3 py-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <input
                type="checkbox"
                name="roles"
                value={role}
                defaultChecked={initial.roles.includes(role)}
                className="mt-1 size-4 accent-primary"
              />
              <span>
                <span className="block text-sm font-semibold text-ink">{partnerRoleLabel[role]}</span>
                <span className="mt-0.5 block text-xs text-muted">{partnerRoleHint[role]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mã đối tác">
          <input
            name="code"
            defaultValue={initial.code}
            className={inputClass}
            required={mode === "edit"}
            placeholder={mode === "create" ? "Để trống sẽ tự sinh" : ""}
          />
        </Field>
        <Field label="Tên pháp nhân">
          <input name="name" defaultValue={initial.name} className={inputClass} required placeholder="Công ty TNHH ..." />
        </Field>
        <Field label="Tên gọi ngắn">
          <input name="shortName" defaultValue={initial.shortName} className={inputClass} placeholder="Tên hay dùng nội bộ" />
        </Field>
        <Field label="Mã số thuế">
          <input name="taxCode" defaultValue={initial.taxCode} className={inputClass} inputMode="numeric" placeholder="10 hoặc 13 số" />
        </Field>
        <Field label="Điện thoại">
          <input name="phone" defaultValue={initial.phone} className={inputClass} inputMode="tel" />
        </Field>
        <Field label="Email">
          <input name="email" type="email" defaultValue={initial.email} className={inputClass} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Website nhà cung cấp">
            <input name="website" defaultValue={initial.website} className={inputClass} placeholder="https://" />
          </Field>
        </div>
        <Field label="Tên ngân hàng">
          <input name="bankName" defaultValue={initial.bankName} className={inputClass} placeholder="Vietcombank" />
        </Field>
        <Field label="Số tài khoản">
          <input name="accountNumber" defaultValue={initial.accountNumber} className={inputClass} inputMode="numeric" placeholder="Chỉ nhập số" />
        </Field>
        <Field label="Người đại diện">
          <input name="representativeName" defaultValue={initial.representativeName} className={inputClass} />
        </Field>
        <JobTitleField name="representativeTitle" label="Chức danh" titles={titles} value={initial.representativeTitle} />
        <div className="sm:col-span-2">
          <Field label="Địa chỉ">
            <input name="address" defaultValue={initial.address} className={inputClass} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Ghi chú">
            <textarea name="note" defaultValue={initial.note} rows={2} className={cn(inputClass, "h-16 resize-none py-2")} />
          </Field>
        </div>
      </div>
      {warnings.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-ink">
          <p className="font-medium">Đã lưu. Có hồ sơ trùng tên, số điện thoại hoặc mã số thuế.</p>
          <ul className="mt-2 space-y-1">
            {warnings.map((item) => (
              <li key={`${item.kind}-${item.id}`}>
                {item.kind === "doi_tac" && onOpenPartner ? (
                  <button type="button" className="font-semibold text-primary" onClick={() => onOpenPartner(item.id)}>
                    {item.code} · {item.name}
                  </button>
                ) : (
                  <Link className="font-semibold text-primary" href={item.kind === "khach_hang" ? `/khach-hang/${item.id}` : `/doi-tac/${item.id}`}>
                    {item.code} · {item.name}
                  </Link>
                )}
                <span className="text-muted">{item.kind === "khach_hang" ? " · đang là khách hàng, hai hồ sơ vẫn tách riêng" : " · đối tác khác"}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
          {conflict ? (
            <>
              {" "}
              {onOpenPartner ? (
                <button type="button" className="font-semibold underline" onClick={() => onOpenPartner(conflict)}>Mở hồ sơ đã có</button>
              ) : (
                <Link className="font-semibold underline" href={`/doi-tac/${conflict}`}>Mở hồ sơ đã có</Link>
              )}
            </>
          ) : null}
        </p>
      ) : null}
      </div>
      <div className="sticky bottom-0 z-10 flex shrink-0 justify-end gap-2 border-t border-line bg-white px-5 py-3">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => (onClose ? onClose() : router.push("/doi-tac"))}
        >
          Đóng
        </Button>
        <Button type="submit" disabled={busy || Boolean(savedId)}>
          {busy ? "Đang lưu" : "Lưu"}
        </Button>
      </div>
    </form>
  );
}
