"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn, focusRing } from "@/shared/lib/cn";

export function RetryButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className={cn("inline-flex h-11 items-center rounded-[12px] bg-primary px-4 text-sm font-semibold text-white", focusRing)}
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? "Đang thử lại" : "Thử lại"}
    </button>
  );
}
