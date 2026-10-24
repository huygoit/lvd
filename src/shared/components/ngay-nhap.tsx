"use client";

import { useEffect, useState } from "react";
import { formatYmd, isYmd, maskNgay, parseNgay } from "@/shared/lib/dates";

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
  const [text, setText] = useState(() => hien(coGiaTri ? value : defaultValue));
  const [dangGo, setDangGo] = useState(false);

  useEffect(() => {
    if (!coGiaTri || dangGo) return;
    setText((prev) => {
      if (prev !== "" && !parseNgay(prev)) return prev;
      return hien(value);
    });
  }, [coGiaTri, dangGo, value]);

  function doi(raw: string, input: HTMLInputElement) {
    const next = maskNgay(raw);
    setText(next);
    input.setCustomValidity(loi(next, Boolean(required)));
    const ymd = parseNgay(next);
    if (ymd || next === "") onChange?.(ymd);
  }

  return (
    <>
      {name ? <input type="hidden" name={name} value={parseNgay(text)} /> : null}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="31/10/2026"
        disabled={disabled}
        required={required}
        className={className}
        value={text}
        onFocus={() => setDangGo(true)}
        onBlur={(event) => {
          setDangGo(false);
          const next = event.currentTarget.value;
          event.currentTarget.setCustomValidity(loi(next, Boolean(required)));
          const ymd = parseNgay(next);
          if (ymd || next === "") onChange?.(ymd);
        }}
        onInvalid={(event) => event.currentTarget.setCustomValidity(loi(event.currentTarget.value, Boolean(required)))}
        onChange={(event) => doi(event.target.value, event.currentTarget)}
      />
    </>
  );
}

function hien(ymd: string) {
  return isYmd(ymd) ? formatYmd(ymd) : "";
}

function loi(text: string, required: boolean) {
  const digits = text.replace(/\D/g, "");
  if (!digits) return required ? "Cần nhập ngày." : "";
  if (parseNgay(text)) return "";
  if (digits.length < 8) return "Nhập đủ ngày/tháng/năm, ví dụ 31/10/2026.";
  return "Ngày không có trên lịch. Ví dụ 31/10/2026.";
}
