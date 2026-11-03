"use client";

import { useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export type ChungTuAnh = { id: string; url: string };

// Nội dung xem chứng từ nhận hàng — dùng chung đơn đặt hàng và HĐ gia công.
export function ChungTuSlide({
  code,
  photos,
  index,
  onIndex,
  onStep,
}: {
  code: string;
  photos: ChungTuAnh[];
  index: number;
  onIndex: (index: number) => void;
  onStep: (delta: number) => void;
}) {
  const [loiAnh, setLoiAnh] = useState(false);
  const hien = photos[index] ?? photos[0];
  const tong = photos.length;

  useEffect(() => {
    setLoiAnh(false);
  }, [hien?.id]);

  useEffect(() => {
    if (tong < 2) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onStep(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        onStep(1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tong, onStep]);

  if (!hien) return null;

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.18),transparent_55%)]" aria-hidden />
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5 py-4 pr-14">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-teal-200/80">Chứng từ nhận hàng</p>
          <p className="mt-0.5 truncate text-base font-semibold tabular-nums">{code}</p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium tabular-nums text-white/90 ring-1 ring-white/15">
          {index + 1} / {tong}
        </span>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center gap-3 px-3 py-4 sm:px-6">
        {tong > 1 ? (
          <button
            type="button"
            onClick={(event: ReactMouseEvent) => {
              event.preventDefault();
              onStep(-1);
            }}
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 transition hover:bg-white/25"
            aria-label="Ảnh trước"
          >
            <ChevronLeft className="size-6" />
          </button>
        ) : <span className="size-12 shrink-0" aria-hidden />}

        <div className="flex max-h-full min-h-0 w-full max-w-3xl flex-1 items-center justify-center">
          {loiAnh ? (
            <div className="flex min-h-[200px] w-full flex-col items-center justify-center gap-2 rounded-2xl bg-white/5 px-6 py-10 text-center ring-1 ring-white/15">
              <Images className="size-10 text-white/40" aria-hidden />
              <p className="text-sm font-medium">Không tải được ảnh chứng từ.</p>
            </div>
          ) : (
            <img
              key={hien.id}
              src={hien.url}
              alt={`Chứng từ ${code} · ảnh ${index + 1}`}
              className="max-h-[min(70vh,760px)] w-auto max-w-full rounded-2xl object-contain shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/20"
              onError={() => setLoiAnh(true)}
              draggable={false}
            />
          )}
        </div>

        {tong > 1 ? (
          <button
            type="button"
            onClick={(event: ReactMouseEvent) => {
              event.preventDefault();
              onStep(1);
            }}
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 transition hover:bg-white/25"
            aria-label="Ảnh sau"
          >
            <ChevronRight className="size-6" />
          </button>
        ) : <span className="size-12 shrink-0" aria-hidden />}
      </div>

      {tong > 1 ? (
        <div className="relative z-10 flex shrink-0 justify-center gap-2 overflow-x-auto border-t border-white/10 px-5 py-4">
          {photos.map((anh, i) => (
            <button
              key={anh.id}
              type="button"
              onClick={() => onIndex(i)}
              className={cn(
                "size-14 shrink-0 overflow-hidden rounded-xl ring-2 transition",
                i === index ? "scale-105 ring-teal-300" : "ring-white/20 opacity-70 hover:opacity-100",
              )}
              aria-label={`Xem ảnh ${i + 1}`}
              aria-current={i === index}
            >
              <img src={anh.url} alt="" className="size-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
