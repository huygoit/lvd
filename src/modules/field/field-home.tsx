"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, PackageCheck, PackagePlus, Search, Trash2 } from "lucide-react";
import { ReceiveScreen } from "@/modules/field/field-receive";
import { ProgressScreen, type ProgressReportCard } from "@/modules/field/field-progress";
import { callApi } from "@/shared/client/api";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/cn";
import { NgayNhap } from "@/shared/components/ngay-nhap";

type ProjectChoice = { id: string; code: string; name: string; location: string };
type View = "home" | "yeu-cau" | "tao" | "xac-nhan" | "tien-do";

export type SupplyRequestCard = {
  id: string;
  code: string;
  neededOn: string;
  note: string;
  createdAt: string;
  requesterId: string;
  projectCode: string;
  projectName: string;
  lines: { name: string; unit: string; quantityMilli: number; note: string; materialCode: string }[];
};

type DraftLine = {
  key: string;
  name: string;
  unit: string;
  quantity: string;
  note: string;
  materialId: string;
  materialCode: string;
};

type MaterialHit = { id: string; code: string; name: string; unit: string; color: string };

const fieldInput = "h-12 w-full rounded-xl border border-line bg-white px-3 text-base text-ink outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20";

function qtyText(milli: number) {
  return (milli / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 3 });
}

function dayLabel(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("vi-VN");
}

export function FieldHome({
  givenName,
  actorId,
  projects,
  requests,
  progressReports,
  initialView,
  initialSlip,
  fullHome,
}: {
  givenName: string;
  actorId: string;
  projects: ProjectChoice[];
  requests: SupplyRequestCard[];
  progressReports: ProgressReportCard[];
  initialView: View;
  initialSlip: string;
  fullHome: boolean;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>(initialView);
  const [rows, setRows] = useState(requests);
  const [error, setError] = useState("");

  useEffect(() => {
    setRows(requests);
  }, [requests]);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  function open(next: View) {
    setView(next);
    setError("");
    const params = new URLSearchParams(window.location.search);
    params.delete("phieu");
    if (next === "home") params.delete("viec");
    else params.set("viec", next);
    const query = params.toString();
    router.replace(query ? `/hien-truong?${query}` : "/hien-truong", { scroll: false });
  }

  return (
    <div className="mx-auto w-full max-w-md">
      {view === "home" ? <Home givenName={givenName} onOpen={open} /> : null}
      {view === "xac-nhan" ? <ReceiveScreen slipId={initialSlip} onBack={fullHome ? () => open("home") : undefined} /> : null}
      {view === "tien-do" ? (
        <ProgressScreen
          actorId={actorId}
          projects={projects}
          reports={progressReports}
          onBack={() => open("home")}
        />
      ) : null}
      {view === "yeu-cau" ? (
        <RequestList
          rows={rows}
          actorId={actorId}
          error={error}
          onBack={() => open("home")}
          onCreate={() => open("tao")}
          onCancel={async (id) => {
            setError("");
            try {
              await callApi(`/api/hien-truong/yeu-cau/${id}`, { method: "DELETE" });
              setRows((current) => current.filter((row) => row.id !== id));
              router.refresh();
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Không hủy được phiếu.");
            }
          }}
        />
      ) : null}
      {view === "tao" ? (
        <RequestForm
          projects={projects}
          onBack={() => open("yeu-cau")}
          onSaved={(row) => {
            setRows((current) => [row, ...current]);
            router.refresh();
            open("yeu-cau");
          }}
        />
      ) : null}
    </div>
  );
}

function Home({ givenName, onOpen }: { givenName: string; onOpen: (view: View) => void }) {
  const actions = [
    {
      view: "xac-nhan" as const,
      title: "Xác nhận vật tư công trình",
      text: "Khi hàng tới, chụp ảnh và ghi số thực nhận.",
      icon: PackageCheck,
    },
    {
      view: "yeu-cau" as const,
      title: "Yêu cầu vật tư công trình",
      text: "Xin thêm hàng cho công trình. Phiếu gửi văn phòng, chưa trừ kho.",
      icon: PackagePlus,
    },
    {
      view: "tien-do" as const,
      title: "Báo cáo tiến độ công trình",
      text: "Ghi khối lượng đã làm theo từng hạng mục của công trình.",
      icon: ClipboardList,
    },
  ];
  return (
    <div className="space-y-4">
      <header className="rounded-[24px] bg-gradient-to-br from-[#0B1F44] to-[#1d4ed8] px-5 py-6 text-white shadow-[var(--shadow-card)]">
        <p className="text-sm text-white/75">Đội thi công</p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight">Xin chào, {givenName}</h1>
        <p className="mt-2 text-sm leading-5 text-white/80">Chọn một việc. Mỗi phiếu chỉ một công trình.</p>
      </header>
      <div className="space-y-3">
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.view}
              type="button"
              className="flex min-h-[92px] w-full items-center gap-4 rounded-[18px] border border-line bg-white px-4 py-4 text-left shadow-[var(--shadow-card)] active:scale-[0.99]"
              onClick={() => onOpen(item.view)}
            >
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="size-7" />
              </span>
              <span>
                <span className="block text-base font-semibold text-ink">{item.title}</span>
                <span className="mt-1 block text-sm leading-5 text-muted">{item.text}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RequestList({
  rows,
  actorId,
  error,
  onBack,
  onCreate,
  onCancel,
}: {
  rows: SupplyRequestCard[];
  actorId: string;
  error: string;
  onBack: () => void;
  onCreate: () => void;
  onCancel: (id: string) => Promise<void>;
}) {
  const [busyId, setBusyId] = useState("");
  return (
    <div className="space-y-4 pb-24">
      <BackButton onClick={onBack} />
      <div>
        <h1 className="text-2xl font-semibold text-ink">Yêu cầu vật tư</h1>
        <p className="mt-1 text-sm text-muted">Phiếu đã gửi. Văn phòng xử lý sau, kho chưa trừ.</p>
      </div>
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
      {rows.length === 0 ? (
        <p className="rounded-[18px] border border-dashed border-line bg-white px-4 py-10 text-center text-sm text-muted">Chưa có phiếu. Tạo yêu cầu cho một công trình.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-[18px] border border-line bg-white p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-primary">{row.code}</p>
                  <p className="mt-1 font-semibold text-ink">{row.projectName}</p>
                  <p className="text-xs text-muted">{row.projectCode} · {dayLabel(row.createdAt)}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">Đã gửi</span>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-ink">
                {row.lines.map((line, index) => (
                  <li key={`${row.id}-${index}`}>{line.materialCode ? `${line.materialCode} · ` : ""}{line.name} · {qtyText(line.quantityMilli)} {line.unit}</li>
                ))}
              </ul>
              {row.neededOn ? <p className="mt-2 text-sm text-muted">Cần hàng {dayLabel(row.neededOn)}</p> : null}
              {row.note ? <p className="mt-1 text-sm text-muted">{row.note}</p> : null}
              {row.requesterId === actorId ? (
                <button
                  type="button"
                  className="mt-3 text-sm font-semibold text-danger disabled:opacity-50"
                  disabled={busyId === row.id}
                  onClick={() => {
                    setBusyId(row.id);
                    void onCancel(row.id).finally(() => setBusyId(""));
                  }}
                >
                  {busyId === row.id ? "Đang hủy" : "Hủy phiếu"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <div className="sticky bottom-3 z-10">
        <Button type="button" className="h-12 w-full rounded-2xl text-base" onClick={onCreate}>Tạo yêu cầu</Button>
      </div>
    </div>
  );
}

function RequestForm({
  projects,
  onBack,
  onSaved,
}: {
  projects: ProjectChoice[];
  onBack: () => void;
  onSaved: (row: SupplyRequestCard) => void;
}) {
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState("");
  const [neededOn, setNeededOn] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [materialQuery, setMaterialQuery] = useState("");
  const [hits, setHits] = useState<MaterialHit[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = projects.find((item) => item.id === projectId) ?? null;
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("vi");
    if (!needle) return projects.slice(0, 8);
    return projects.filter((item) => `${item.code} ${item.name} ${item.location}`.toLocaleLowerCase("vi").includes(needle)).slice(0, 8);
  }, [projects, query]);

  useEffect(() => {
    const text = materialQuery.trim();
    if (text.length < 2) return;
    const control = new AbortController();
    const timer = window.setTimeout(() => {
      callApi<{ rows: MaterialHit[] }>(`/api/hien-truong/vat-tu?q=${encodeURIComponent(text)}`, { signal: control.signal })
        .then((body) => {
          if (!control.signal.aborted) setHits(body.rows);
        })
        .catch(() => {
          if (!control.signal.aborted) setHits([]);
        });
    }, 250);
    return () => {
      control.abort();
      window.clearTimeout(timer);
    };
  }, [materialQuery]);

  function addHit(hit: MaterialHit) {
    setLines((current) => [
      ...current,
      { key: crypto.randomUUID(), name: hit.name, unit: hit.unit, quantity: "1", note: "", materialId: hit.id, materialCode: hit.code },
    ]);
    setMaterialQuery("");
    setHits([]);
  }

  function addManual() {
    setLines((current) => [
      ...current,
      { key: crypto.randomUUID(), name: "", unit: "", quantity: "1", note: "", materialId: "", materialCode: "" },
    ]);
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const saved = await callApi<SupplyRequestCard>("/api/hien-truong/yeu-cau", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          neededOn,
          note,
          lines: lines.map((line) => ({
            name: line.name,
            unit: line.unit,
            quantity: line.quantity,
            note: line.note,
            materialId: line.materialId,
            materialCode: line.materialCode,
          })),
        }),
      });
      onSaved(saved);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không gửi được phiếu.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 pb-28">
      <BackButton onClick={onBack} />
      <div>
        <h1 className="text-2xl font-semibold text-ink">Tạo yêu cầu</h1>
        <p className="mt-1 text-sm text-muted">Chọn công trình, thêm vật tư, rồi gửi.</p>
      </div>
      <section className="space-y-3 rounded-[18px] border border-line bg-white p-4">
        <p className="text-sm font-semibold text-ink">Công trình</p>
        {selected ? (
          <div className="flex items-start justify-between gap-3 rounded-xl bg-primary/10 px-3 py-3">
            <div>
              <p className="font-semibold text-ink">{selected.name}</p>
              <p className="text-xs text-muted">{selected.code}{selected.location ? ` · ${selected.location}` : ""}</p>
            </div>
            <button type="button" className="text-sm font-semibold text-primary" onClick={() => setProjectId("")}>Đổi</button>
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
                <button key={item.id} type="button" className="w-full rounded-xl border border-line px-3 py-3 text-left" onClick={() => setProjectId(item.id)}>
                  <span className="block font-medium text-ink">{item.name}</span>
                  <span className="text-xs text-muted">{item.code}{item.location ? ` · ${item.location}` : ""}</span>
                </button>
              ))}
            </div>
          </>
        )}
        <label className="block text-sm font-medium text-ink">
          Ngày cần hàng
          <NgayNhap value={neededOn} onChange={setNeededOn} className={cn(fieldInput, "mt-1.5")} />
        </label>
      </section>
      <section className="space-y-3 rounded-[18px] border border-line bg-white p-4">
        <p className="text-sm font-semibold text-ink">Vật tư</p>
        <div className="relative">
          <Search className="pointer-events-none absolute top-3.5 left-3 size-5 text-muted" />
          <input
            value={materialQuery}
            onChange={(event) => {
              setMaterialQuery(event.target.value);
              if (event.target.value.trim().length < 2) setHits([]);
            }}
            placeholder="Tìm mã hoặc tên, từ 2 ký tự"
            className={cn(fieldInput, "pl-10")}
          />
        </div>
        {hits.length > 0 ? (
          <div className="space-y-2">
            {hits.map((hit) => (
              <button key={hit.id} type="button" className="w-full rounded-xl border border-line px-3 py-3 text-left" onClick={() => addHit(hit)}>
                <span className="block font-medium text-ink">{hit.name}</span>
                <span className="text-xs text-muted">{hit.code} · {hit.unit}{hit.color ? ` · ${hit.color}` : ""}</span>
              </button>
            ))}
          </div>
        ) : null}
        <button type="button" className="text-sm font-semibold text-primary" onClick={addManual}>Thêm dòng tự nhập</button>
        {lines.map((line) => (
          <article key={line.key} className="space-y-2 rounded-xl bg-soft p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {line.materialCode ? <p className="text-xs font-semibold text-primary">{line.materialCode}</p> : null}
                {line.materialId ? (
                  <p className="font-medium text-ink">{line.name}</p>
                ) : (
                  <input value={line.name} onChange={(event) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, name: event.target.value } : item))} placeholder="Tên vật tư" className={fieldInput} />
                )}
              </div>
              <button type="button" className="flex size-11 items-center justify-center text-danger" aria-label="Xóa dòng" onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}>
                <Trash2 className="size-5" />
              </button>
            </div>
            <div className="grid grid-cols-[1fr_88px] gap-2">
              <label className="text-xs text-muted">
                Số lượng
                <input inputMode="decimal" value={line.quantity} onChange={(event) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, quantity: event.target.value } : item))} className={cn(fieldInput, "mt-1")} />
              </label>
              <label className="text-xs text-muted">
                Đơn vị
                <input value={line.unit} readOnly={Boolean(line.materialId)} onChange={(event) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, unit: event.target.value } : item))} className={cn(fieldInput, "mt-1")} />
              </label>
            </div>
          </article>
        ))}
      </section>
      <label className="block text-sm font-medium text-ink">
        Ghi chú
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Ví dụ: giao trước buổi lắp" className={cn(fieldInput, "mt-1.5 h-24 py-3")} />
      </label>
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
      <div className="sticky bottom-3 z-10 grid grid-cols-[auto_1fr] gap-2 rounded-2xl bg-page/95 py-1">
        <Button type="button" variant="outline" className="h-12 rounded-2xl px-5" disabled={busy} onClick={onBack}>Đóng</Button>
        <Button type="button" className="h-12 rounded-2xl text-base" disabled={busy} onClick={() => void submit()}>{busy ? "Đang gửi" : "Gửi yêu cầu"}</Button>
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="text-sm font-semibold text-primary" onClick={onClick}>
      Về việc hôm nay
    </button>
  );
}
