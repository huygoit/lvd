"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { routes } from "@/shared/config/routes";
import { cn, focusRing } from "@/shared/lib/cn";

export function RefreshButton({ query, updatedLabel }: { query: string; updatedLabel: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [note, setNote] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function refresh() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState("loading");
    try {
      const response = await fetch(`/api/dashboard${query ? `?${query}` : ""}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (response.status === 401) {
        window.location.href = routes.login;
        return;
      }
      if (!response.ok) throw new Error("loi");
      setState("idle");
      setNote(null);
      router.refresh();
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setState("error");
      setNote(`Làm mới chưa thành công. Đang hiển thị dữ liệu lúc ${updatedLabel}.`);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={refresh}
        disabled={state === "loading"}
        className={cn("inline-flex h-11 items-center gap-2 rounded-[12px] bg-white/10 px-3 text-sm font-medium text-white ring-1 ring-white/25", focusRing)}
      >
        <RefreshCw className={cn("size-4", state === "loading" && "animate-spin")} />
        {state === "loading" ? "Đang làm mới" : "Làm mới"}
      </button>
      {note ? (
        <p className="mt-2 text-xs text-amber-100" role="alert">
          {note}
        </p>
      ) : null}
    </div>
  );
}
