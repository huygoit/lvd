"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { callApi } from "@/shared/client/api";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";

export function QuoteRowActions({ id, code, canDelete }: { id: string; code: string; canDelete: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex justify-end gap-2">
      <Button type="button" size="sm" variant="outline" onClick={() => router.push(`/bao-gia?mo=sua&id=${id}`)}>
        <Pencil /> Sửa
      </Button>
      {canDelete ? (
        <Button type="button" size="sm" variant="outline" className="text-danger" onClick={() => { setError(""); setOpen(true); }}>
          Xóa
        </Button>
      ) : null}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa báo giá</AlertDialogTitle>
            <AlertDialogDescription>{code} sẽ bị xóa cùng các phiên bản. Báo giá đã gắn hợp đồng thì không xóa được.</AlertDialogDescription>
          </AlertDialogHeader>
          {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
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
              {busy ? "Đang xóa" : "Xóa"}
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
