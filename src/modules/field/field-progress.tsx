"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { callApi } from "@/shared/client/api";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/cn";
import { NgayNhap } from "@/shared/components/ngay-nhap";
import { formatQuantityMilli } from "@/modules/projects/item-fields";

type ProjectChoice = { id: string; code: string; name: string; location: string };

export type ProgressReportCard = {
  id: string;
  code: string;
  reportedOn: string;
  note: string;
  createdAt: string;
  reporterId: string;
  projectCode: string;
  projectName: string;
  lines: { name: string; unit: string; plannedMilli: number; doneMilli: number }[];
};

type ProgressItem = {
  id: string;
  sortOrder: number;
  name: string;
  spec: string;
  unit: string;
  plannedMilli: number;
  lastDoneMilli: number | null;
  lastReportedOn: string;
};

type Draft = { quantity: string; note: string };

const fieldInput = "h-12 w-full rounded-xl border border-line bg-white px-3 text-base text-ink outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20";

function qtyText(milli: number) {
  return (milli / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 3 });
}

function dayLabel(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  return "";
}

function todayInput() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function ProgressScreen({
  actorId,
  projects,
  reports,
  onBack,
}: {
  actorId: string;
  projects: ProjectChoice[];
  reports: ProgressReportCard[];
  onBack: () => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(reports);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    setRows(reports);
  }, [reports]);

  if (creating) {
    return (
      <ProgressForm
        projects={projects}
        onBack={() => setCreating(false)}
        onSaved={(row) => {
          setRows((current) => [row, ...current]);
          setCreating(false);
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <button type="button" className="text-sm font-semibold text-primary" onClick={onBack}>Về việc hôm nay</button>
      <div>
        <h1 className="text-2xl font-semibold text-ink">Báo cáo tiến độ</h1>
        <p className="mt-1 text-sm text-muted">Ghi khối lượng đã làm theo hạng mục. Không đổi đơn giá hay hợp đồng.</p>
      </div>
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
      {rows.length === 0 ? (
        <p className="rounded-[18px] border border-dashed border-line bg-white px-4 py-10 text-center text-sm text-muted">Chưa có báo cáo. Chọn công trình và ghi hạng mục đã làm.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-[18px] border border-line bg-white p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-primary">{row.code}</p>
                  <p className="mt-1 font-semibold text-ink">{row.projectName}</p>
                  <p className="text-xs text-muted">{row.projectCode} · {dayLabel(row.reportedOn)}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{row.lines.length} hạng mục</span>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-ink">
                {row.lines.slice(0, 4).map((line, index) => (
                  <li key={`${row.id}-${index}`}>{line.name} · {qtyText(line.doneMilli)}/{qtyText(line.plannedMilli)} {line.unit}</li>
                ))}
                {row.lines.length > 4 ? <li className="text-muted">và {row.lines.length - 4} hạng mục nữa</li> : null}
              </ul>
              {row.note ? <p className="mt-2 text-sm text-muted">{row.note}</p> : null}
              {row.reporterId === actorId ? (
                <button
                  type="button"
                  className="mt-3 text-sm font-semibold text-danger disabled:opacity-50"
                  disabled={busyId === row.id}
                  onClick={() => {
                    setBusyId(row.id);
                    setError("");
                    void callApi(`/api/hien-truong/tien-do/${row.id}`, { method: "DELETE" })
                      .then(() => {
                        setRows((current) => current.filter((item) => item.id !== row.id));
                        router.refresh();
                      })
                      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Không hủy được báo cáo."))
                      .finally(() => setBusyId(""));
                  }}
                >
                  {busyId === row.id ? "Đang hủy" : "Hủy báo cáo"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <div className="sticky bottom-3 z-10">
        <Button type="button" className="h-12 w-full rounded-2xl text-base" onClick={() => setCreating(true)}>Báo cáo mới</Button>
      </div>
    </div>
  );
}

function ProgressForm({
  projects,
  onBack,
  onSaved,
}: {
  projects: ProjectChoice[];
  onBack: () => void;
  onSaved: (row: ProgressReportCard) => void;
}) {
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState("");
  const [reportedOn, setReportedOn] = useState(todayInput);
  const [note, setNote] = useState("");
  const [items, setItems] = useState<ProgressItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loadedId, setLoadedId] = useState("");
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = projects.find((item) => item.id === projectId) ?? null;
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("vi");
    const source = needle
      ? projects.filter((item) => `${item.code} ${item.name} ${item.location}`.toLocaleLowerCase("vi").includes(needle))
      : projects;
    return source.slice(0, 8);
  }, [projects, query]);

  useEffect(() => {
    if (!projectId) return;
    const control = new AbortController();
    setLoadError("");
    setItems([]);
    setDrafts({});
    callApi<{ items: ProgressItem[] }>(`/api/hien-truong/tien-do?cong-trinh=${encodeURIComponent(projectId)}`, { signal: control.signal })
      .then((body) => {
        if (control.signal.aborted) return;
        setItems(body.items);
        setLoadedId(projectId);
      })
      .catch((caught: unknown) => {
        if (control.signal.aborted) return;
        setLoadError(caught instanceof Error ? caught.message : "Không tải được hạng mục.");
        setLoadedId(projectId);
      });
    return () => control.abort();
  }, [projectId]);

  const waiting = Boolean(projectId) && loadedId !== projectId;

  function setQuantity(id: string, quantity: string) {
    setDrafts((current) => ({ ...current, [id]: { quantity, note: current[id]?.note ?? "" } }));
  }

  async function submit() {
    const lines = items.flatMap((item) => {
      const quantity = (drafts[item.id]?.quantity ?? "").trim();
      if (!quantity) return [];
      return [{ itemId: item.id, quantity, note: drafts[item.id]?.note ?? "" }];
    });
    setBusy(true);
    setError("");
    try {
      const saved = await callApi<ProgressReportCard>("/api/hien-truong/tien-do", {
        method: "POST",
        body: JSON.stringify({ projectId, reportedOn, note, lines }),
      });
      onSaved(saved);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không gửi được báo cáo.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 pb-28">
      <button type="button" className="text-sm font-semibold text-primary" onClick={onBack}>Về danh sách báo cáo</button>
      <div>
        <h1 className="text-2xl font-semibold text-ink">Báo cáo mới</h1>
        <p className="mt-1 text-sm text-muted">Nhập khối lượng đã làm tới hôm nay. Dòng để trống sẽ không ghi.</p>
      </div>
      <section className="space-y-3 rounded-[18px] border border-line bg-white p-4">
        <p className="text-sm font-semibold text-ink">Công trình</p>
        {selected ? (
          <div className="flex items-start justify-between gap-3 rounded-xl bg-primary/10 px-3 py-3">
            <div>
              <p className="font-semibold text-ink">{selected.name}</p>
              <p className="text-xs text-muted">{selected.code}{selected.location ? ` · ${selected.location}` : ""}</p>
            </div>
            <button type="button" className="text-sm font-semibold text-primary" onClick={() => { setProjectId(""); setLoadedId(""); setItems([]); setDrafts({}); }}>Đổi</button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute top-3.5 left-3 size-5 text-muted" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã, tên, địa chỉ" className={cn(fieldInput, "pl-10")} />
            </div>
            <div className="space-y-2">
              {filtered.length === 0 ? <p className="text-sm text-muted">Không thấy công trình.</p> : null}
              {filtered.map((item) => (
                <button key={item.id} type="button" className="w-full rounded-xl border border-line px-3 py-3 text-left" onClick={() => { setLoadedId(""); setProjectId(item.id); }}>
                  <span className="block font-medium text-ink">{item.name}</span>
                  <span className="text-xs text-muted">{item.code}{item.location ? ` · ${item.location}` : ""}</span>
                </button>
              ))}
            </div>
          </>
        )}
        <label className="block text-sm font-medium text-ink">
          Ngày báo cáo
          <NgayNhap value={reportedOn} onChange={setReportedOn} className={cn(fieldInput, "mt-1.5")} />
        </label>
      </section>
      {waiting ? <p className="text-sm text-muted">Đang tải hạng mục...</p> : null}
      {loadError ? <p className="text-sm text-danger" role="alert">{loadError}</p> : null}
      {selected && !waiting && !loadError && items.length === 0 ? (
        <p className="rounded-[18px] border border-dashed border-line bg-white px-4 py-8 text-center text-sm text-muted">Công trình chưa có hạng mục. Thêm hạng mục trong hồ sơ công trình trước.</p>
      ) : null}
      {(waiting ? [] : items).map((item) => {
        const draft = drafts[item.id]?.quantity ?? "";
        const typed = Number(draft.replace(",", "."));
        const shown = draft && Number.isFinite(typed) ? Math.round(typed * 1000) : item.lastDoneMilli ?? 0;
        const ratio = item.plannedMilli > 0 ? Math.min(100, Math.round((shown / item.plannedMilli) * 100)) : 0;
        const over = draft && Number.isFinite(typed) && Math.round(typed * 1000) > item.plannedMilli && item.plannedMilli > 0;
        return (
          <article key={item.id} className="space-y-3 rounded-[18px] border border-line bg-white p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{item.sortOrder}</span>
              <div className="min-w-0">
                <p className="font-semibold text-ink">{item.name}</p>
                {item.spec ? <p className="text-sm text-muted">{item.spec}</p> : null}
                <p className="mt-1 text-sm text-muted">Kế hoạch {qtyText(item.plannedMilli)} {item.unit}</p>
                {item.lastDoneMilli !== null ? (
                  <p className="text-sm text-muted">Lần trước {qtyText(item.lastDoneMilli)} {item.unit}{item.lastReportedOn ? ` · ${dayLabel(item.lastReportedOn)}` : ""}</p>
                ) : null}
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-soft">
              <div className={cn("h-full rounded-full", over ? "bg-danger" : "bg-primary")} style={{ width: `${ratio}%` }} />
            </div>
            <label className="block text-sm font-medium text-ink">
              Đã làm tới hôm nay ({item.unit})
              <input
                inputMode="decimal"
                value={draft}
                placeholder={item.lastDoneMilli !== null ? formatQuantityMilli(item.lastDoneMilli) : "0"}
                onChange={(event) => setQuantity(item.id, event.target.value)}
                className={cn(fieldInput, "mt-1.5")}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {item.lastDoneMilli !== null ? (
                <button type="button" className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink" onClick={() => setQuantity(item.id, formatQuantityMilli(item.lastDoneMilli ?? 0))}>
                  Như lần trước
                </button>
              ) : null}
              <button type="button" className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink" onClick={() => setQuantity(item.id, formatQuantityMilli(item.plannedMilli))}>
                Xong hết
              </button>
            </div>
            {over ? <p className="text-sm font-medium text-danger">Vượt khối lượng hạng mục. Vẫn gửi được, hợp đồng không tự tăng.</p> : null}
          </article>
        );
      })}
      {!waiting && items.length > 0 ? (
        <label className="block text-sm font-medium text-ink">
          Ghi chú chung
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Ví dụ: mưa, làm được cửa tầng 1" className={cn(fieldInput, "mt-1.5 h-24 py-3")} />
        </label>
      ) : null}
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
      <div className="sticky bottom-3 z-10 grid grid-cols-[auto_1fr] gap-2 bg-page/95 py-1">
        <Button type="button" variant="outline" className="h-12 rounded-2xl px-5" disabled={busy} onClick={onBack}>Đóng</Button>
        <Button type="button" className="h-12 rounded-2xl text-base" disabled={busy || !projectId} onClick={() => void submit()}>{busy ? "Đang gửi" : "Gửi báo cáo"}</Button>
      </div>
    </div>
  );
}
