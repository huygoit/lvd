"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { routes } from "@/shared/config/routes";
import { cn, focusRing } from "@/shared/lib/cn";
import { NgayNhap } from "@/shared/components/ngay-nhap";
import type { PeriodPreset, Person, ResolvedFilters } from "@/modules/dashboard/types";

const presets: Array<[PeriodPreset, string]> = [
  ["hom-nay", "Hôm nay"],
  ["7-ngay", "7 ngày"],
  ["30-ngay", "30 ngày"],
  ["thang-nay", "Tháng này"],
  ["tuy-chon", "Tùy chọn"],
];

export function FilterBar({ filters, owners }: { filters: ResolvedFilters; owners: Person[] | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [preset, setPreset] = useState(filters.preset);
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);
  const [error, setError] = useState<string | null>(null);

  function go(next: ResolvedFilters) {
    const params = new URLSearchParams();
    params.set("ky", next.preset);
    if (next.preset === "tuy-chon") {
      params.set("tu", next.from);
      params.set("den", next.to);
    }
    if (next.ownerId) params.set("phu-trach", next.ownerId);
    startTransition(() => {
      router.replace(`${routes.home}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="rounded-[14px] bg-[#0B1F44]/45 p-3 ring-1 ring-white/15" aria-busy={pending}>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1">
          <label htmlFor="ky" className="mb-1 block text-[11px] font-medium text-white/80">
            Khoảng ngày
          </label>
          <select
            id="ky"
            className={cn("h-11 w-full rounded-[12px] border-0 bg-white px-3 text-sm text-ink", focusRing)}
            value={preset}
            onChange={(event) => {
              const next = event.target.value as PeriodPreset;
              setPreset(next);
              setError(null);
              if (next !== "tuy-chon") go({ ...filters, preset: next });
            }}
          >
            {presets.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {owners ? (
          <div className="min-w-40 flex-1">
            <label htmlFor="phu-trach" className="mb-1 block text-[11px] font-medium text-white/80">
              Người phụ trách
            </label>
            <select
              id="phu-trach"
              className={cn("h-11 w-full rounded-[12px] bg-white px-3 text-sm text-ink", focusRing)}
              value={filters.ownerId ?? ""}
              onChange={(event) => go({ ...filters, preset, ownerId: event.target.value || null })}
            >
              <option value="">Tất cả</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
      {preset === "tuy-chon" ? (
        <form
          className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            if (!from || !to || from > to) {
              setError("Chọn ngày bắt đầu không muộn hơn ngày kết thúc.");
              return;
            }
            setError(null);
            go({ ...filters, preset: "tuy-chon", from, to });
          }}
        >
          <div>
            <label htmlFor="tu" className="mb-1 block text-[11px] font-medium text-white/80">
              Từ ngày
            </label>
            <NgayNhap id="tu" value={from} onChange={setFrom} className={cn("h-11 w-full rounded-[12px] bg-white px-3 text-sm text-ink", focusRing)} />
          </div>
          <div>
            <label htmlFor="den" className="mb-1 block text-[11px] font-medium text-white/80">
              Đến ngày
            </label>
            <NgayNhap id="den" value={to} onChange={setTo} className={cn("h-11 w-full rounded-[12px] bg-white px-3 text-sm text-ink", focusRing)} />
          </div>
          <button type="submit" className={cn("mt-5 inline-flex h-11 items-center justify-center rounded-[12px] bg-white px-4 text-sm font-semibold text-navy", focusRing)}>
            Áp dụng
          </button>
        </form>
      ) : null}
      {error ? <p className="mt-2 text-xs text-amber-100">{error}</p> : null}
      {pending ? <p className="mt-2 text-xs text-white/80">Đang cập nhật...</p> : null}
    </div>
  );
}
