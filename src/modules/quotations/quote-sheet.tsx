"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X } from "lucide-react";
import { callApi } from "@/shared/client/api";
import { ActionBadge } from "@/shared/components/action-badge";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";

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

export function QuoteSheet({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <Sheet open onOpenChange={(next) => { if (!next) router.push("/bao-gia"); }}>
      <SheetContent className="sm:w-full">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}
