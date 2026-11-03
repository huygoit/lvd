"use client";

import { forwardRef, useState } from "react";
import { Calendar } from "lucide-react";
import { hienNgay, LichNgay } from "@/shared/components/lich-ngay";
import { cn } from "@/shared/lib/cn";

const GIO = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const PHUT = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

const o = "h-10 rounded-lg border bg-white px-2 text-sm text-ink outline-none focus:border-primary";

type Props = {
  onChange: (value: string) => void;
  // Viền đỏ khi form cha báo thiếu giờ/ngày.
  loi?: boolean;
};

export const GioNgayChon = forwardRef<HTMLSelectElement, Props>(function GioNgayChon({ onChange, loi = false }, ref) {
  const [moLich, setMoLich] = useState(false);
  const [gio, setGio] = useState("");
  const [phut, setPhut] = useState("");
  const [ngay, setNgay] = useState<Date | undefined>();

  const vien = loi ? "border-danger focus:border-danger" : "border-line";

  function bao(gioMoi: string, phutMoi: string, ngayMoi: Date | undefined) {
    if (!gioMoi || !phutMoi || !ngayMoi) {
      onChange("");
      return;
    }
    const thang = String(ngayMoi.getMonth() + 1).padStart(2, "0");
    const ngaySo = String(ngayMoi.getDate()).padStart(2, "0");
    onChange(`${ngayMoi.getFullYear()}-${thang}-${ngaySo}T${gioMoi}:${phutMoi}`);
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <select
          ref={ref}
          aria-label="Giờ"
          aria-invalid={loi || undefined}
          value={gio}
          onChange={(event) => {
            const next = event.target.value;
            setGio(next);
            bao(next, phut, ngay);
          }}
          className={cn(o, vien, "w-[4.5rem] shrink-0")}
        >
          <option value="">Giờ</option>
          {GIO.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <select
          aria-label="Phút"
          aria-invalid={loi || undefined}
          value={phut}
          onChange={(event) => {
            const next = event.target.value;
            setPhut(next);
            bao(gio, next, ngay);
          }}
          className={cn(o, vien, "w-[4.5rem] shrink-0")}
        >
          <option value="">Phút</option>
          {PHUT.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <button
          type="button"
          aria-expanded={moLich}
          aria-invalid={loi || undefined}
          onClick={() => setMoLich((current) => !current)}
          className={cn(o, vien, "flex min-w-0 flex-1 items-center justify-between gap-2 px-3 text-left")}
        >
          <span className={ngay ? "text-ink" : "text-muted"}>{ngay ? hienNgay(ngay) : "dd/mm/yyyy"}</span>
          <Calendar className={cn("size-4 shrink-0", loi ? "text-danger" : "text-primary")} aria-hidden />
        </button>
      </div>
      {moLich ? (
        <LichNgay
          ngay={ngay}
          onChon={(ngayChon) => {
            setNgay(ngayChon);
            bao(gio, phut, ngayChon);
            setMoLich(false);
          }}
        />
      ) : null}
    </div>
  );
});
