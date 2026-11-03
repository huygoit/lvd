"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

// Badge action mỏng trên lưới danh sách — cùng cảm giác tab Đơn đặt hàng.
const base =
  "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40";

const tones = {
  soft: "bg-soft text-ink hover:bg-line/60",
  primary: "bg-primary/10 text-primary hover:bg-primary/15",
  danger: "bg-danger/5 text-danger hover:bg-danger/10",
} as const;

export type ActionBadgeTone = keyof typeof tones;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ActionBadgeTone;
  children: ReactNode;
};

export function ActionBadge({ tone = "soft", className, type = "button", children, ...props }: Props) {
  return (
    <button type={type} className={cn(base, tones[tone], className)} {...props}>
      {children}
    </button>
  );
}

// Viền khung danh sách — đồng bộ với thẻ đơn đặt hàng.
export const listPanelClass = "overflow-x-auto rounded-2xl border border-line bg-white";
