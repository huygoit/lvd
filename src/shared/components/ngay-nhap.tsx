"use client";

import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { cn } from "cn";
import { hienNgay, LichNgay, raYmd, tuYmd } from "@/shared/components/lich-ngay";

type Props = {
  name?: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (ymd: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

export function NgayNhap({ name, id, value, defaultValue = "", onChange, required, disabled, className }: Props) {
  const coGiaTri = value !== undefined;
  const [ymd, setYmd] = useState(coGiaTri ? value : defaultValue);
  const [mo, setMo] = useState(false);
  const ngay = tuYmd(ymd);

  useEffect(() => {
    if (coGiaTri) setYmd(value);
  }, [coGiaTri, value]);

  function chon(ngayChon: Date) {
    const next = raYmd(ngayChon);
    setYmd(next);
    onChange?.(next);
    setMo(false);
  }

  return (
    <div>
      <input
        name={name}
        value={isHopLe(ymd) ? ymd : ""}
        required={required}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={() => undefined}
      />
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-expanded={mo}
        aria-required={required || undefined}
        onClick={() => { if (!disabled) setMo((current) => !current); }}
        className={cn(className, "inline-flex items-center justify-between gap-2 text-left")}
      >
        <span className={ngay ? "text-ink" : "text-muted"}>{ngay ? hienNgay(ngay) : "dd/mm/yyyy"}</span>
        <Calendar className="size-4 shrink-0 text-primary" aria-hidden />
      </button>
      {mo ? <LichNgay ngay={ngay} onChon={chon} /> : null}
    </div>
  );
}

function isHopLe(ymd: string) {
  return Boolean(tuYmd(ymd));
}
