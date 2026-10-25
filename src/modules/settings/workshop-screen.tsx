"use client";

import { useState } from "react";
import { callApi } from "@/shared/client/api";
import { Button } from "@/shared/components/ui/button";

type Workshop = { id: string; name: string; userId: string };
type Person = { id: string; name: string };

const o = "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-primary";

export function WorkshopScreen({ workshops, users }: { workshops: Workshop[]; users: Person[] }) {
  const [rows, setRows] = useState(workshops);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function luu(row: Workshop) {
    setBusy(row.id);
    setError("");
    try {
      await callApi("/api/cai-dat/xuong", { method: "PUT", body: JSON.stringify({ id: row.id, userId: row.userId }) });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được người nhận.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-3">
      {error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
      {rows.length === 0 ? <p className="rounded-[18px] border border-dashed border-line bg-soft px-4 py-8 text-center text-sm text-muted">Chưa có đối tác nào mang vai trò xưởng gia công.</p> : null}
      {rows.map((row) => (
        <div key={row.id} className="grid items-center gap-3 rounded-[18px] border border-line bg-white px-4 py-4 sm:grid-cols-[1fr_240px_auto]">
          <div>
            <p className="text-sm font-semibold text-ink">{row.name}</p>
            <p className="mt-1 text-xs text-muted">Một người liên hệ. Giao đúng xưởng thì người này nhận thông báo.</p>
          </div>
          <select className={o} value={row.userId} onChange={(event) => setRows((current) => current.map((item) => item.id === row.id ? { ...item, userId: event.target.value } : item))}>
            <option value="">Chưa gán</option>
            {users.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
          <Button type="button" variant="outline" disabled={busy === row.id} onClick={() => void luu(row)}>{busy === row.id ? "Đang lưu" : "Lưu"}</Button>
        </div>
      ))}
    </div>
  );
}
