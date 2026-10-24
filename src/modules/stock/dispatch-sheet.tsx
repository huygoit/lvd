"use client";

import { useEffect, useState } from "react";
import { callApi } from "@/shared/client/api";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { inputClass } from "@/shared/components/controls";

type ProjectChoice = { id: string; code: string; name: string };
type Hit = { id: string; code: string; name: string; stockUnit: string; glass?: boolean };
type Draft = { materialId: string; code: string; name: string; unit: string; qty: string };

export function DispatchSheet({
  open,
  projects,
  onClose,
  onDone,
}: {
  open: boolean;
  projects: ProjectChoice[];
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [projectQuery, setProjectQuery] = useState("");
  const [projectId, setProjectId] = useState("");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [lines, setLines] = useState<Draft[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setProjectQuery("");
    setProjectId("");
    setQuery("");
    setHits([]);
    setLines([]);
    setError("");
  }, [open]);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void callApi<Hit[]>(`/api/kho/vat-tu?q=${encodeURIComponent(text)}`)
        .then((rows) => setHits(rows.filter((row) => !row.glass).slice(0, 8)))
        .catch(() => setHits([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const projectText = projectQuery.trim().toLocaleLowerCase("vi");
  const shown = projects.filter((item) => !projectText || `${item.code} ${item.name}`.toLocaleLowerCase("vi").includes(projectText)).slice(0, 6);
  const chosen = projects.find((item) => item.id === projectId);

  async function send() {
    setBusy(true);
    setError("");
    try {
      const saved = await callApi<{ code: string }>("/api/kho/giao", {
        method: "POST",
        body: JSON.stringify({ projectId, lines: lines.map((line) => ({ materialId: line.materialId, qty: line.qty })) }),
      });
      onDone(`Đã tạo ${saved.code}. Công trình sẽ nhận thông báo để xác nhận.`);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không giao được.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent className="z-[60] sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Giao từ kho đến công trình</SheetTitle>
          <SheetDescription>Hàng rời kho ngay và đang trên đường. Công trình xác nhận thì mới tính là đang ở công trình.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
          <label className="block text-sm">
            <span className="font-medium text-ink">Công trình</span>
            <input value={projectQuery} onChange={(event) => setProjectQuery(event.target.value)} placeholder="Tìm mã hoặc tên" className={`${inputClass} mt-1`} />
          </label>
          {chosen ? <p className="rounded-xl bg-primary/5 px-3 py-2 text-sm font-medium text-ink">{chosen.code} · {chosen.name}</p> : null}
          <div className="space-y-1">
            {shown.map((item) => (
              <button key={item.id} type="button" className={`block w-full rounded-xl px-3 py-2 text-left text-sm ${item.id === projectId ? "bg-primary/10 font-semibold text-primary" : "hover:bg-soft"}`} onClick={() => setProjectId(item.id)}>
                {item.code} · {item.name}
              </button>
            ))}
          </div>
          <label className="block text-sm">
            <span className="font-medium text-ink">Vật tư trong kho</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Gõ mã hoặc tên, từ 2 ký tự" className={`${inputClass} mt-1`} />
          </label>
          {hits.length ? (
            <div className="space-y-1">
              {hits.map((hit) => (
                <button
                  key={hit.id}
                  type="button"
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-soft"
                  onClick={() => {
                    setLines((current) => current.some((line) => line.materialId === hit.id) ? current : [...current, { materialId: hit.id, code: hit.code, name: hit.name, unit: hit.stockUnit, qty: "1" }]);
                    setQuery("");
                    setHits([]);
                  }}
                >
                  <span className="font-semibold text-primary">{hit.code}</span> {hit.name}
                </button>
              ))}
            </div>
          ) : null}
          <div className="space-y-2">
            {lines.map((line) => (
              <div key={line.materialId} className="flex items-center gap-2 rounded-2xl border border-line px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{line.code}</p>
                  <p className="truncate text-xs text-muted">{line.name}</p>
                </div>
                <input value={line.qty} onChange={(event) => setLines((current) => current.map((item) => item.materialId === line.materialId ? { ...item, qty: event.target.value } : item))} className="h-10 w-20 rounded-xl border border-line px-2 text-right text-sm tabular-nums" />
                <span className="w-10 text-xs text-muted">{line.unit}</span>
                <button type="button" className="text-xs font-semibold text-danger" onClick={() => setLines((current) => current.filter((item) => item.materialId !== line.materialId))}>Bỏ</button>
              </div>
            ))}
          </div>
        </div>
        <SheetFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Đóng</Button>
          <Button type="button" disabled={busy || !projectId || lines.length === 0} onClick={() => void send()}>{busy ? "Đang giao" : "Giao đến công trình"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
