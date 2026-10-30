"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, ChevronLeft, PackageCheck, Truck } from "lucide-react";
import { callApi } from "@/shared/client/api";
import { formatStockQty } from "@/shared/catalog/stock";
import { Button } from "@/shared/components/ui/button";

type SlipLine = {
  id: string;
  code: string;
  name: string;
  unit: string;
  lengthMm: number;
  documentQty: number;
  receivedQty: number;
};

type SlipPhoto = { id: string; url: string };

type SlipDetail = {
  id: string;
  code: string;
  status: string;
  projectCode: string;
  projectName: string;
  sourceLabel: string;
  toKind: string;
  expectedAt: string;
  lines: SlipLine[];
  photos: SlipPhoto[];
};

type SlipCard = {
  id: string;
  code: string;
  status: string;
  projectCode: string;
  projectName: string;
  sourceLabel: string;
  toKind: string;
  expectedAt: string;
  lineCount: number;
  createdAt: string;
};

function khiNao(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
}

function dai(mm: number) {
  if (!mm) return "";
  const rounded = Math.round(mm / 10) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
  return `Dài ${text} m`;
}

function milliOf(value: string) {
  const raw = value.trim().replace(",", ".");
  if (!raw) return 0;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) return -1;
  return Math.round(amount * 1000);
}

function gioDen(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
}

export function ReceiveScreen({ slipId, onBack, noi = "cong_trinh" }: { slipId: string; onBack?: () => void; noi?: "cong_trinh" | "kho" | "xuong" }) {
  const router = useRouter();
  const [picked, setPicked] = useState(slipId);
  const [waiting, setWaiting] = useState<SlipCard[]>([]);
  const [recent, setRecent] = useState<SlipCard[]>([]);
  const [detail, setDetail] = useState<SlipDetail | null>(null);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (slipId) setPicked(slipId);
  }, [slipId]);

  useEffect(() => {
    let stop = false;
    callApi<{ waiting: SlipCard[]; recent: SlipCard[] }>(`/api/hien-truong/giao?noi=${noi}`)
      .then((data) => {
        if (stop) return;
        setWaiting(data.waiting);
        setRecent(data.recent);
      })
      .catch((caught) => {
        if (!stop) setError(caught instanceof Error ? caught.message : "Không tải được phiếu giao.");
      })
      .finally(() => {
        if (!stop) setLoading(false);
      });
    return () => {
      stop = true;
    };
  }, [noi]);

  useEffect(() => {
    if (!picked) {
      setDetail(null);
      return;
    }
    let stop = false;
    setLoading(true);
    setError("");
    callApi<SlipDetail>(`/api/hien-truong/giao/${picked}`)
      .then((row) => {
        if (stop) return;
        setDetail(row);
        const next: Record<string, string> = {};
        for (const line of row.lines) next[line.id] = formatStockQty(row.status === "da_nhan" ? line.receivedQty : line.documentQty);
        setQty(next);
      })
      .catch((caught) => {
        if (!stop) setError(caught instanceof Error ? caught.message : "Không mở được phiếu.");
      })
      .finally(() => {
        if (!stop) setLoading(false);
      });
    return () => {
      stop = true;
    };
  }, [picked]);

  function backToList() {
    setPicked("");
    setDetail(null);
    setError("");
    const params = new URLSearchParams(window.location.search);
    params.delete("phieu");
    const query = params.toString();
    router.replace(query ? `/hien-truong?${query}` : "/hien-truong", { scroll: false });
  }

  async function addPhoto(file: File | undefined) {
    if (!file || !detail) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.set("tep", file);
      const photo = await callApi<SlipPhoto>(`/api/hien-truong/giao/${detail.id}/anh`, { method: "POST", body });
      setDetail((current) => current ? { ...current, photos: [...current.photos, photo] } : current);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không gửi được ảnh.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!detail) return;
    setBusy(true);
    setError("");
    try {
      const saved = await callApi<SlipDetail>(`/api/hien-truong/giao/${detail.id}/nhan`, {
        method: "POST",
        body: JSON.stringify({ lines: detail.lines.map((line) => ({ id: line.id, received: qty[line.id] ?? "0" })) }),
      });
      setDetail(saved);
      setWaiting((current) => current.filter((row) => row.id !== saved.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không xác nhận được.");
    } finally {
      setBusy(false);
    }
  }

  if (picked) {
    const done = detail?.status === "da_nhan";
    const toiCongTrinh = !detail || (detail.toKind !== "kho" && detail.toKind !== "xuong");
    const mismatch = Boolean(detail && done && detail.lines.some((line) => line.receivedQty !== line.documentQty));
    const invalid = Boolean(detail && !done && detail.lines.some((line) => {
      const milli = milliOf(qty[line.id] ?? "");
      return milli < 0 || milli > line.documentQty;
    }));
    return (
      <div className="space-y-4 pb-4">
        <div className="flex items-center justify-between gap-3">
          <button type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-primary" onClick={backToList}>
            <ChevronLeft className="size-4" />
            Danh sách phiếu
          </button>
          {onBack ? (
            <button type="button" className="text-sm font-semibold text-primary" onClick={onBack}>
              Màn hình chính
            </button>
          ) : null}
        </div>
        {loading && !detail ? <p className="text-sm text-muted">Đang mở phiếu...</p> : null}
        {detail ? (
          <>
            <header className="bg-brand rounded-[24px] px-5 py-5 text-white shadow-[var(--shadow-card)]">
              <p className="text-sm text-white/75">{detail.code} · {detail.sourceLabel}</p>
              <h1 className="mt-1 text-2xl font-semibold leading-tight">{detail.projectName}</h1>
              <p className="mt-2 text-sm text-white/80">{detail.projectCode}. {detail.expectedAt ? `Dự kiến ${gioDen(detail.expectedAt)}. ` : ""}Hàng nhận rồi vẫn chưa phải đã lắp.</p>
            </header>
            {done ? (
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-900">
                <p className="flex items-center gap-2 font-semibold"><Check className="size-4" /> {detail.toKind === "kho" ? "Đã nhận hàng tại kho" : detail.toKind === "xuong" ? "Đã nhận hàng tại xưởng" : "Đã nhận hàng tại công trình"}</p>
                <p className="mt-1 text-sm">{mismatch ? "Có lệch số lượng." : "Số nhận khớp với phiếu."}</p>
              </div>
            ) : (
              <p className="rounded-2xl bg-primary/5 px-4 py-3 text-sm leading-6 text-ink">Vật tư đang được giao đến công trình. Xin vui lòng xác nhận khi nhận hàng.</p>
            )}
            {error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
            <div className="space-y-3">
              {detail.lines.map((line) => {
                const value = qty[line.id] ?? "";
                const milli = milliOf(value);
                const off = !done && milli >= 0 && milli !== line.documentQty;
                return (
                  <article key={line.id} className="rounded-2xl border border-line bg-white px-4 py-3 shadow-[var(--shadow-card)]">
                    <p className="text-xs font-semibold text-primary">{line.code}</p>
                    <p className="mt-0.5 font-medium text-ink">{line.name}</p>
                    <p className="mt-1 text-sm text-muted">
                      Trên phiếu {formatStockQty(line.documentQty)} {line.unit}
                      {line.lengthMm ? ` · ${dai(line.lengthMm)}` : ""}
                    </p>
                    {done ? (
                      <p className="mt-2 text-lg font-semibold tabular-nums text-ink">Thực nhận {formatStockQty(line.receivedQty)} {line.unit}</p>
                    ) : (
                      <label className="mt-3 block">
                        <span className="text-xs font-medium text-muted">Thực nhận ({line.unit})</span>
                        <input
                          inputMode="decimal"
                          value={value}
                          onChange={(event) => setQty((current) => ({ ...current, [line.id]: event.target.value }))}
                          className="mt-1 h-14 w-full rounded-2xl border border-line bg-soft px-4 text-right text-2xl font-semibold tabular-nums text-ink outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
                        />
                        {off ? <span className="mt-1 block text-xs font-medium text-amber-700">Lệch so với phiếu. Vẫn ghi nhận đúng số này.</span> : null}
                      </label>
                    )}
                  </article>
                );
              })}
            </div>
            {toiCongTrinh ? <section className="rounded-2xl border border-line bg-white p-4">
              <p className="text-sm font-semibold text-ink">Ảnh hàng</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {detail.photos.map((photo) => (
                  <img key={photo.id} src={photo.url} alt="Ảnh hàng nhận" className="aspect-square w-full rounded-xl object-cover" />
                ))}
              </div>
              {done ? null : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 text-sm font-semibold text-primary">
                    <Camera className="size-4" />
                    Chụp ảnh
                    <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => { void addPhoto(event.target.files?.[0]); event.currentTarget.value = ""; }} />
                  </label>
                  <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-line text-sm font-semibold text-ink">
                    Chọn ảnh
                    <input type="file" accept="image/*" className="sr-only" onChange={(event) => { void addPhoto(event.target.files?.[0]); event.currentTarget.value = ""; }} />
                  </label>
                </div>
              )}
            </section> : null}
            {done && onBack ? (
              <div className="sticky bottom-3">
                <Button type="button" className="h-12 w-full rounded-2xl text-base" onClick={onBack}>
                  Về màn hình chính
                </Button>
              </div>
            ) : null}
            {done ? null : (
              <div className="sticky bottom-3">
                <Button type="button" className="h-12 w-full rounded-2xl text-base" disabled={busy || invalid || (toiCongTrinh && detail.photos.length === 0)} onClick={() => void confirm()}>
                  {busy ? "Đang gửi" : "Xác nhận đã nhận"}
                </Button>
                {toiCongTrinh && detail.photos.length === 0 ? <p className="mt-2 text-center text-xs text-muted">Chụp hoặc chọn ít nhất một ảnh hàng.</p> : null}
              </div>
            )}
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {onBack ? (
        <button type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-primary" onClick={onBack}>
          <ChevronLeft className="size-4" />
          Về màn hình chính
        </button>
      ) : null}
      <header className="bg-brand rounded-[24px] px-5 py-6 text-white shadow-[var(--shadow-card)]">
        <p className="text-sm text-white/75">{noi === "kho" ? "Kho công ty" : noi === "xuong" ? "Xưởng" : "Công trình"}</p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight">Xác nhận vật tư</h1>
        <p className="mt-2 text-sm leading-5 text-white/80">{noi === "cong_trinh" ? "Khi hàng tới, chụp ảnh và ghi số thực nhận. Nhận hàng chưa phải đã lắp." : "Khi hàng tới, ghi số thực nhận."}</p>
      </header>
      {error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
      {loading ? <p className="text-sm text-muted">Đang tải phiếu...</p> : null}
      {!loading && waiting.length === 0 ? (
        <section className="rounded-[24px] border border-line bg-white px-5 py-8 text-center shadow-[var(--shadow-card)]">
          <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <PackageCheck className="size-8" />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-ink">Chưa có hàng đang giao</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Khi văn phòng bấm Giao hàng, phiếu sẽ hiện ở đây để bạn xác nhận.</p>
        </section>
      ) : null}
      <div className="space-y-3">
        {waiting.map((row) => (
          <button key={row.id} type="button" className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-left shadow-[var(--shadow-card)] active:scale-[0.99]" onClick={() => setPicked(row.id)}>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Truck className="size-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-ink">{row.projectName}</span>
              <span className="block text-xs text-muted">{row.code} · {row.sourceLabel} · {row.lineCount} dòng{row.expectedAt ? ` · Dự kiến ${gioDen(row.expectedAt)}` : ""}</span>
              <span className="block text-xs text-primary">{khiNao(row.createdAt)}</span>
            </span>
          </button>
        ))}
      </div>
      {recent.length ? (
        <section className="space-y-2">
          <p className="text-sm font-semibold text-ink">Đã nhận</p>
          {recent.map((row) => (
            <button key={row.id} type="button" className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-left" onClick={() => setPicked(row.id)}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Check className="size-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{row.projectName}</span>
                <span className="block text-xs text-muted">{row.code} · {khiNao(row.createdAt)}</span>
              </span>
            </button>
          ))}
        </section>
      ) : null}
    </div>
  );
}
