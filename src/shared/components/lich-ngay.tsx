"use client";

import { DayPicker } from "react-day-picker";
import { vi } from "react-day-picker/locale/vi";
import "react-day-picker/style.css";
import "./gio-ngay-chon.css";
import { isYmd } from "@/shared/lib/dates";

const NAM_NAY = new Date().getFullYear();

export function LichNgay({ ngay, onChon }: { ngay?: Date; onChon: (ngay: Date) => void }) {
  return (
    <div className="lich-ngay mt-2 w-1/2 min-w-[18rem] max-w-full rounded-xl border border-line bg-white p-3">
      <DayPicker
        mode="single"
        required
        selected={ngay}
        onSelect={onChon}
        locale={vi}
        weekStartsOn={1}
        captionLayout="dropdown"
        navLayout="after"
        startMonth={new Date(NAM_NAY - 1, 0)}
        endMonth={new Date(NAM_NAY + 3, 11)}
        defaultMonth={ngay ?? new Date()}
      />
    </div>
  );
}

export function tuYmd(ymd: string) {
  if (!isYmd(ymd)) return undefined;
  const [nam, thang, ngay] = ymd.split("-").map(Number);
  return new Date(nam, thang - 1, ngay);
}

export function raYmd(ngay: Date) {
  const thang = String(ngay.getMonth() + 1).padStart(2, "0");
  const ngaySo = String(ngay.getDate()).padStart(2, "0");
  return `${ngay.getFullYear()}-${thang}-${ngaySo}`;
}

export function hienNgay(ngay: Date) {
  const ngaySo = String(ngay.getDate()).padStart(2, "0");
  const thang = String(ngay.getMonth() + 1).padStart(2, "0");
  return `${ngaySo}/${thang}/${ngay.getFullYear()}`;
}
