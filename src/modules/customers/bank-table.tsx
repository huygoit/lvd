"use client";

import { Trash2 } from "lucide-react";
import { useId } from "react";
import { inputClass } from "@/shared/components/controls";
import { Button } from "@/shared/components/ui/button";

export type BankRow = {
  key: string;
  id?: string;
  bankName: string;
  accountNumber: string;
  isPrimary: boolean;
};

export function emptyBankRow(): BankRow {
  return { key: crypto.randomUUID(), bankName: "", accountNumber: "", isPrimary: false };
}

export function bankRowsFromSaved(
  accounts: { id: string; bankName: string; accountNumber: string; isPrimary: boolean }[],
  trailingBlank = false,
): BankRow[] {
  const rows: BankRow[] = accounts.map((row) => ({
    key: row.id,
    id: row.id,
    bankName: row.bankName,
    accountNumber: row.accountNumber,
    isPrimary: row.isPrimary,
  }));
  if (trailingBlank) rows.push(emptyBankRow());
  return rows;
}

export function bankRowsPayload(rows: BankRow[]) {
  return rows
    .filter((row) => row.bankName.trim() || row.accountNumber)
    .map((row) => ({
      id: row.id,
      bankName: row.bankName.trim(),
      accountNumber: row.accountNumber.replace(/\D/g, ""),
      isPrimary: row.isPrimary,
    }));
}

export function BankAccountTable({
  rows,
  onChange,
  readOnly = false,
}: {
  rows: BankRow[];
  onChange?: (rows: BankRow[]) => void;
  readOnly?: boolean;
}) {
  const radioName = useId();
  const shown = readOnly ? rows.filter((row) => row.bankName || row.accountNumber) : rows;

  function update(key: string, patch: Partial<BankRow>) {
    if (!onChange) return;
    onChange(
      rows.map((row) => {
        if (patch.isPrimary) return { ...row, isPrimary: row.key === key };
        return row.key === key ? { ...row, ...patch } : row;
      }),
    );
  }

  function remove(key: string) {
    if (!onChange) return;
    const next = rows.filter((row) => row.key !== key);
    if (next.length > 0 && !next.some((row) => row.isPrimary)) next[0] = { ...next[0], isPrimary: true };
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {shown.length === 0 ? <p className="text-sm text-muted">Chưa có tài khoản.</p> : null}
      {shown.map((row) => (
        <div key={row.key} className="flex items-center gap-2">
          {readOnly ? (
            <p className="min-w-0 flex-1 text-sm text-ink">
              {row.accountNumber} · {row.bankName}
              {row.isPrimary && shown.length > 1 ? " · Chính" : ""}
            </p>
          ) : (
            <>
              <input
                value={row.accountNumber}
                aria-label="Số tài khoản"
                placeholder="Số tài khoản"
                inputMode="numeric"
                maxLength={20}
                className={`${inputClass} sm:max-w-52`}
                onChange={(event) => update(row.key, { accountNumber: event.target.value.replace(/\D/g, "").slice(0, 20) })}
              />
              <input
                value={row.bankName}
                aria-label="Tên ngân hàng"
                placeholder="Ngân hàng"
                className={inputClass}
                onChange={(event) => update(row.key, { bankName: event.target.value })}
              />
              {shown.length > 1 ? (
                <label className="inline-flex shrink-0 items-center gap-1.5 text-sm text-ink">
                  <input
                    type="radio"
                    name={radioName}
                    checked={row.isPrimary}
                    aria-label="Tài khoản chính"
                    className="size-4 accent-primary"
                    onChange={() => update(row.key, { isPrimary: true })}
                  />
                  Chính
                </label>
              ) : null}
              {shown.length > 1 ? (
                <Button type="button" size="icon-sm" variant="ghost" className="shrink-0 text-danger hover:text-danger" aria-label="Xóa tài khoản" onClick={() => remove(row.key)}>
                  <Trash2 />
                </Button>
              ) : null}
            </>
          )}
        </div>
      ))}
      {readOnly ? null : (
        <button type="button" className="text-sm font-medium text-primary" onClick={() => onChange?.([...rows, emptyBankRow()])}>
          Thêm tài khoản
        </button>
      )}
    </div>
  );
}
