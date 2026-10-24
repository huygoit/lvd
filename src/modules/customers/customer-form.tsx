"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { callApi, formDataOf } from "@/shared/client/api";
import { buttonGhost, buttonPrimary, Field, inputClass } from "@/shared/components/controls";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/cn";
import { customerTypeLabel } from "@/modules/customers/labels";
import { BankAccountTable, bankRowsFromSaved, bankRowsPayload, emptyBankRow, type BankRow } from "@/modules/customers/bank-table";

export type CustomerDraft = {
  type: string;
  name: string;
  shortName: string;
  taxCode: string;
  phone: string;
  fax: string;
  altPhone: string;
  email: string;
  address: string;
  invoiceName: string;
  invoiceTaxCode: string;
  invoiceAddress: string;
  invoiceEmail: string;
  representativeName: string;
  representativeTitle: string;
  executorName: string;
  executorTitle: string;
  ownerId: string;
  source: string;
  note: string;
  revision?: number;
};

type Warning = { id: string; code: string; name: string };
type SavedAccount = { id: string; bankName: string; accountNumber: string; isPrimary: boolean };

export function CustomerForm({
  mode,
  initial,
  customerId,
  savedAccounts = [],
  inSheet = false,
  onSaved,
  onClose,
  onOpenCustomer,
  onAccountsChanged,
}: {
  mode: "create" | "edit";
  initial: CustomerDraft;
  customerId?: string;
  savedAccounts?: SavedAccount[];
  inSheet?: boolean;
  onSaved?: () => void;
  onClose?: () => void;
  onOpenCustomer?: (id: string) => void;
  onAccountsChanged?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState("");
  const [busy, setBusy] = useState(false);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [savedId, setSavedId] = useState("");
  const [intent, setIntent] = useState("save");
  const savedBankKey = savedAccounts.map((row) => `${row.id}|${row.bankName}|${row.accountNumber}|${row.isPrimary ? 1 : 0}`).join(";");
  const [banks, setBanks] = useState<BankRow[]>(() => moTaiKhoan(savedAccounts));
  const boQuaLanDau = useRef(true);

  useEffect(() => {
    if (boQuaLanDau.current) {
      boQuaLanDau.current = false;
      return;
    }
    setBanks(moTaiKhoan(savedAccounts));
  }, [savedBankKey]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = formDataOf(event);
    const nextIntent = String(form.get("intent") || "save");
    if (savedId) {
      if (onSaved) onSaved();
      else go(savedId, nextIntent);
      return;
    }
    setIntent(nextIntent);
    setBusy(true);
    setError("");
    setConflict("");
    const body = { ...Object.fromEntries(form.entries()), bankAccounts: bankRowsPayload(banks) };
    try {
      const result = await callApi<{ customer: { id: string }; warnings: Warning[] }>(
        mode === "create" ? "/api/khach-hang" : `/api/khach-hang/${customerId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          body: JSON.stringify(body),
        },
      );
      if (result.warnings.length > 0) {
        setWarnings(result.warnings);
        if (mode === "create") setSavedId(result.customer.id);
        router.refresh();
        onAccountsChanged?.();
        setBusy(false);
        return;
      }
      if (onSaved) onSaved();
      else if (mode === "edit" && customerId) router.push(`/khach-hang/${customerId}`);
      else go(result.customer.id, nextIntent);
    } catch (caught) {
      const details = (caught as { details?: { customerId?: string } }).details;
      setConflict(details?.customerId ?? "");
      setError(caught instanceof Error ? caught.message : "Không lưu được.");
      setBusy(false);
    }
  }

  function go(id: string, next: string) {
    if (next === "quote") router.push(`/bao-gia/moi?khach=${id}`);
    else if (next === "project") router.push(`/cong-trinh/moi?khach=${id}`);
    else router.push(`/khach-hang/${id}`);
  }

  function openWarning(id: string) {
    if (onOpenCustomer) onOpenCustomer(id);
  }

  return (
    <form onSubmit={onSubmit} className={inSheet ? "flex min-h-0 flex-1 flex-col" : "space-y-4 rounded-[18px] border border-line bg-white p-4 sm:p-5"}>
      <div className={inSheet ? "min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4" : "space-y-4"}>
      <input type="hidden" name="revision" value={initial.revision ?? ""} />
      <input type="hidden" name="ownerId" value={initial.ownerId} />
      <input type="hidden" name="invoiceName" value={initial.invoiceName} />
      <div className="flex flex-wrap gap-5" role="radiogroup" aria-label="Loại khách hàng">
        {Object.entries(customerTypeLabel).map(([value, label]) => (
          <label key={value} className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name="type"
              value={value}
              defaultChecked={initial.type === value}
              required
              className="size-4 accent-primary"
            />
            {label}
          </label>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tên khách hàng">
          <input name="name" defaultValue={initial.name} className={inputClass} required autoFocus />
        </Field>
        <Field label="Địa chỉ liên lạc">
          <input name="address" defaultValue={initial.address} className={inputClass} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Email liên lạc">
          <input name="email" type="email" defaultValue={initial.email} className={inputClass} />
        </Field>
        <SoDienThoai name="altPhone" label="Số điện thoại liên lạc" value={initial.altPhone} />
      </div>
      <section className="space-y-3 rounded-xl border border-line bg-soft p-3">
        <h2 className="text-sm font-semibold text-ink">Thông tin ký kết hợp đồng và xuất hóa đơn</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Mã số thuế">
            <input
              name="taxCode"
              defaultValue={initial.taxCode.replace(/\D/g, "")}
              className={inputClass}
              inputMode="numeric"
              maxLength={13}
              placeholder="10 hoặc 13 số"
              onInput={(event) => {
                const input = event.currentTarget;
                input.value = input.value.replace(/\D/g, "").slice(0, 13);
              }}
            />
          </Field>
          <Field label="Địa chỉ đăng ký kinh doanh">
            <input name="invoiceAddress" defaultValue={initial.invoiceAddress} className={inputClass} />
          </Field>
          <SoDienThoai name="phone" label="Số điện thoại" value={initial.phone} />
          <SoDienThoai name="fax" label="Số fax" value={initial.fax} />
          <Field label="Người đại diện">
            <input name="representativeName" defaultValue={initial.representativeName} className={inputClass} />
          </Field>
          <Field label="Chức vụ">
            <input name="representativeTitle" defaultValue={initial.representativeTitle} className={inputClass} />
          </Field>
          <Field label="Người thực hiện hợp đồng">
            <input name="executorName" defaultValue={initial.executorName} className={inputClass} />
          </Field>
          <Field label="Chức vụ">
            <input name="executorTitle" defaultValue={initial.executorTitle} className={inputClass} />
          </Field>
        </div>
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-ink">Tài khoản ngân hàng</h2>
        <BankAccountTable rows={banks} onChange={setBanks} />
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Email nhận hóa đơn">
          <input name="invoiceEmail" type="email" defaultValue={initial.invoiceEmail} className={inputClass} />
        </Field>
        <Field label="Ghi chú">
          <textarea name="note" defaultValue={initial.note} rows={1} className={cn(inputClass, "min-h-9 resize-none py-1.5")} />
        </Field>
      </div>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}{" "}
          {conflict ? (
            onOpenCustomer ? (
              <button type="button" className="font-semibold underline" onClick={() => onOpenCustomer(conflict)}>
                Mở hồ sơ đã có
              </button>
            ) : (
              <Link className="font-semibold underline" href={`/khach-hang/${conflict}`}>
                Mở hồ sơ đã có
              </Link>
            )
          ) : null}
        </p>
      ) : null}
      {warnings.length > 0 ? (
        <div className="rounded-[12px] bg-amber-50 p-3 text-sm text-amber-950">
          <p>Đã lưu. Có hồ sơ gần giống, kiểm tra trước khi tiếp tục:</p>
          <ul className="mt-2 space-y-1">
            {warnings.map((item) => (
              <li key={item.id}>
                {onOpenCustomer ? (
                  <button type="button" className="font-semibold underline" onClick={() => openWarning(item.id)}>
                    {item.code} · {item.name}
                  </button>
                ) : (
                  <Link className="font-semibold underline" href={`/khach-hang/${item.id}`}>
                    {item.code} · {item.name}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          {savedId && !inSheet ? (
            <button type="button" className={`${buttonPrimary} mt-3`} onClick={() => go(savedId, intent)}>
              Vẫn tiếp tục
            </button>
          ) : null}
        </div>
      ) : null}
      {!inSheet ? (
        <div className="flex flex-wrap gap-2">
          {mode === "create" ? (
            <>
              <button name="intent" value="quote" className={buttonPrimary} disabled={busy}>
                Lưu và lập báo giá
              </button>
              <button name="intent" value="project" className={buttonGhost} disabled={busy}>
                Lưu và tạo công trình
              </button>
              <button name="intent" value="save" className={buttonGhost} disabled={busy}>
                Chỉ lưu
              </button>
            </>
          ) : (
            <button name="intent" value="save" className={buttonPrimary} disabled={busy}>
              Lưu thay đổi
            </button>
          )}
        </div>
      ) : null}
      </div>
      {inSheet ? (
        <div className="sticky bottom-0 z-10 flex shrink-0 justify-end gap-2 border-t border-line bg-white px-5 py-3">
          <Button type="button" variant="outline" disabled={busy} onClick={() => (onClose ? onClose() : router.push("/khach-hang"))}>
            Đóng
          </Button>
          <Button type="submit" disabled={busy || Boolean(savedId)}>
            {busy ? "Đang lưu" : "Lưu"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

function moTaiKhoan(accounts: { id: string; bankName: string; accountNumber: string; isPrimary: boolean }[]) {
  const rows = bankRowsFromSaved(accounts);
  return rows.length > 0 ? rows : [emptyBankRow()];
}

function SoDienThoai({ name, label, value }: { name: string; label: string; value: string }) {
  return (
    <Field label={label}>
      <input
        name={name}
        defaultValue={value.replace(/\D/g, "")}
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
  );
}
