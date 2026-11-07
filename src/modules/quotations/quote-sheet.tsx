"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X } from "lucide-react";
import { callApi } from "@/shared/client/api";
import { ActionBadge } from "@/shared/components/action-badge";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent } from "@/shared/components/ui/sheet";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { cn } from "@/shared/lib/cn";
import { customerFollowLabel, internalLabel } from "@/modules/customers/labels";

const noiBoTone: Record<string, string> = {
  nhap: "border-slate-200/80 bg-slate-50 text-slate-700",
  cho_duyet: "border-amber-200/80 bg-amber-50 text-amber-900",
  da_duyet: "border-emerald-200/80 bg-emerald-50 text-emerald-800",
  yeu_cau_chinh: "border-orange-200/80 bg-orange-50 text-orange-900",
};

const khachTone: Record<string, string> = {
  chua_gui: "border-sky-200/80 bg-sky-50 text-sky-900",
  da_gui: "border-indigo-200/80 bg-indigo-50 text-indigo-900",
  dang_thuong_luong: "border-violet-200/80 bg-violet-50 text-violet-900",
  chap_thuan: "border-emerald-200/80 bg-emerald-50 text-emerald-800",
  tu_choi: "border-rose-200/80 bg-rose-50 text-rose-800",
  da_thay_the: "border-slate-200/80 bg-slate-50 text-slate-600",
};

function StatusPill({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide shadow-[0_1px_0_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {label}
    </span>
  );
}

/** Cặp badge trạng thái nội bộ + theo dõi khách — dùng trên header sheet báo giá. */
export function QuoteStatusBadges({
  internalStatus,
  customerStatus,
}: {
  internalStatus: string;
  customerStatus: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <StatusPill
        label={internalLabel[internalStatus as keyof typeof internalLabel] ?? internalStatus}
        className={noiBoTone[internalStatus] ?? noiBoTone.nhap}
      />
      <StatusPill
        label={customerFollowLabel[customerStatus as keyof typeof customerFollowLabel] ?? customerStatus}
        className={khachTone[customerStatus] ?? khachTone.chua_gui}
      />
    </div>
  );
}

export function QuoteRowActions({ id, code, canDelete }: { id: string; code: string; canDelete: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <ActionBadge onClick={() => router.push(`/bao-gia?mo=sua&id=${id}`)}>
        <Pencil className="size-3.5" aria-hidden /> Sửa
      </ActionBadge>
      {canDelete ? (
        <ActionBadge tone="danger" onClick={() => { setError(""); setOpen(true); }}>
          <Trash2 className="size-3.5" aria-hidden /> Xóa
        </ActionBadge>
      ) : null}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa báo giá</AlertDialogTitle>
            <AlertDialogDescription>{code} sẽ bị xóa cùng các phiên bản. Báo giá đã gắn hợp đồng thì không xóa được.</AlertDialogDescription>
          </AlertDialogHeader>
          {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}><X className="size-4" aria-hidden /> Hủy</Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                setError("");
                void callApi(`/api/bao-gia/${id}`, { method: "DELETE" })
                  .then(() => {
                    setOpen(false);
                    router.refresh();
                  })
                  .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Không xóa được báo giá."))
                  .finally(() => setBusy(false));
              }}
            >
              <Trash2 className="size-4" aria-hidden /> {busy ? "Đang xóa" : "Xóa"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Khung sheet báo giá — tiêu đề / badge / thuế VAT do editor tự vẽ trong header. */
export function QuoteSheet({ children }: { children: ReactNode }) {
  const router = useRouter();
  return (
    <Sheet open onOpenChange={(next) => { if (!next) router.push("/bao-gia"); }}>
      <SheetContent className="sm:w-full">{children}</SheetContent>
    </Sheet>
  );
}
