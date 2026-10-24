"use client";

import { useEffect, useRef, useState } from "react";
import { callApi } from "@/shared/client/api";
import { BankAccountTable, bankRowsFromSaved, bankRowsPayload, type BankRow } from "@/modules/customers/bank-table";

type Account = {
  id: string;
  bankName: string;
  accountNumber: string;
  isPrimary: boolean;
};

function snapshot(rows: { id?: string; bankName: string; accountNumber: string; isPrimary: boolean }[]) {
  return rows.map((row) => `${row.id ?? ""}|${row.bankName}|${row.accountNumber}|${row.isPrimary ? 1 : 0}`).join(";");
}

export function BankPanel({
  customerId,
  accounts,
  onChanged,
}: {
  customerId: string;
  accounts: Account[];
  onChanged?: () => void;
}) {
  const [rows, setRows] = useState<BankRow[]>(() => bankRowsFromSaved(accounts));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const savedKey = snapshot(accounts);
  const boQuaLanDau = useRef(true);

  useEffect(() => {
    if (boQuaLanDau.current) {
      boQuaLanDau.current = false;
      return;
    }
    setRows(bankRowsFromSaved(accounts));
  }, [savedKey]);

  async function persist(next: BankRow[]) {
    const payload = bankRowsPayload(next);
    if (snapshot(payload) === savedKey) return;
    setBusy(true);
    setError("");
    try {
      await callApi(`/api/khach-hang/${customerId}/tai-khoan`, {
        method: "PUT",
        body: JSON.stringify({ accounts: payload }),
      });
      onChanged?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được tài khoản.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="space-y-2"
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) return;
        void persist(rows);
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">Tài khoản ngân hàng</h2>
        {busy ? <span className="text-xs text-muted">Đang lưu</span> : null}
      </div>
      <BankAccountTable
        rows={rows}
        onChange={(next) => {
          setRows(next);
          const before = bankRowsPayload(rows);
          const after = bankRowsPayload(next);
          const removed = after.length < before.length;
          const primaryChanged = before.some((row) => {
            const match = after.find((item) => (row.id && item.id === row.id) || item.accountNumber === row.accountNumber);
            return Boolean(match && match.isPrimary !== row.isPrimary);
          });
          if (removed || primaryChanged) void persist(next);
        }}
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </section>
  );
}
