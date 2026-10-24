"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { callApi } from "@/shared/client/api";
import { buttonPrimary, inputClass, panelClass, selectClass } from "@/shared/components/controls";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { CustomerForm, type CustomerDraft } from "@/modules/customers/customer-form";
import { CustomerOverview } from "@/modules/customers/customer-overview";
import { customerTypeLabel } from "@/modules/customers/labels";

type Mode = "them" | "sua" | "xem";

type Row = {
  id: string;
  code: string;
  name: string;
  type: string;
  phone: string;
  email: string;
  status: string;
  ownerName: string;
  contactName: string;
};

type Detail = CustomerDraft & {
  id: string;
  code: string;
  status: string;
  createdAt: string;
  contacts: { id: string; name: string; role: string; phone: string; email: string; isPrimary: boolean }[];
  bankAccounts: { id: string; bankName: string; accountNumber: string; isPrimary: boolean }[];
  projects: { id: string; code: string; name: string; stage: string }[];
  quotations: { id: string; code: string; status: string; total: number }[];
};

function blank(ownerId: string): CustomerDraft {
  return {
    type: "doanh_nghiep",
    name: "",
    shortName: "",
    taxCode: "",
    phone: "",
    fax: "",
    altPhone: "",
    email: "",
    address: "",
    invoiceName: "",
    invoiceTaxCode: "",
    invoiceAddress: "",
    invoiceEmail: "",
    representativeName: "",
    representativeTitle: "",
    executorName: "",
    executorTitle: "",
    ownerId,
    source: "",
    note: "",
  };
}

function listHref(q: string, type: string, ownerId: string, status: string, page?: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (type) params.set("loai", type);
  if (ownerId) params.set("phu-trach", ownerId);
  if (status && status !== "dang_dung") params.set("trang-thai", status);
  if (page && page > 1) params.set("trang", String(page));
  const query = params.toString();
  return query ? `/khach-hang?${query}` : "/khach-hang";
}

export function CustomerBoard({
  countLabel,
  q,
  type,
  ownerId,
  status,
  page,
  pages,
  rows,
  currentUserId,
  canCreate,
  canUpdate,
  canDelete,
  canQuote,
  canProject,
  initialMode,
  initialId,
}: {
  countLabel: string;
  q: string;
  type: string;
  ownerId: string;
  status: string;
  page: number;
  pages: number;
  rows: Row[];
  currentUserId: string;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canQuote: boolean;
  canProject: boolean;
  initialMode: Mode | null;
  initialId: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(initialMode);
  const [targetId, setTargetId] = useState(initialId);
  const [formKey, setFormKey] = useState(0);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loadError, setLoadError] = useState("");
  const [tick, setTick] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if ((mode !== "sua" && mode !== "xem") || !targetId) return;
    const control = new AbortController();
    setDetail(null);
    setLoadError("");
    callApi<Detail>(`/api/khach-hang/${targetId}`, { signal: control.signal })
      .then((row) => {
        if (!control.signal.aborted) setDetail(row);
      })
      .catch((error: unknown) => {
        if (control.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : "Không tải được hồ sơ.");
      });
    return () => control.abort();
  }, [mode, targetId, tick]);

  function openMode(next: Mode | null, id = "") {
    setMode(next);
    setTargetId(id);
    if (next === "them") setFormKey((value) => value + 1);
    const params = new URLSearchParams(window.location.search);
    if (next) params.set("mo", next);
    else params.delete("mo");
    if (id && next && next !== "them") params.set("ho-so", id);
    else params.delete("ho-so");
    const query = params.toString();
    router.replace(query ? `/khach-hang?${query}` : "/khach-hang", { scroll: false });
  }

  function saved() {
    router.refresh();
    openMode(null);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await callApi(`/api/khach-hang/${pendingDelete.id}`, { method: "DELETE" });
      if (targetId === pendingDelete.id) openMode(null);
      setPendingDelete(null);
      router.refresh();
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "Không xóa được.");
    } finally {
      setDeleting(false);
    }
  }

  const sheetTitle = mode === "them" ? "Thêm khách hàng" : mode === "sua" ? "Sửa khách hàng" : detail?.name || "Hồ sơ khách hàng";
  const sheetText = mode === "them" || mode === "sua"
    ? ""
    : detail
        ? `${detail.code}${detail.status === "luu_tru" ? " · Đã lưu trữ" : ""}`
        : "Đang mở hồ sơ.";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Khách hàng</h1>
          <p className="mt-1 text-sm text-muted">{countLabel}. Bấm mã hoặc tên để xem.</p>
        </div>
        {canCreate ? (
          <button type="button" className={buttonPrimary} onClick={() => openMode("them")}>Thêm khách hàng mới</button>
        ) : null}
      </div>
      <form className="flex flex-wrap gap-2" action="/khach-hang">
        <input name="q" defaultValue={q} placeholder="Tên, mã, điện thoại, thuế" className={`${inputClass} max-w-sm`} />
        <select name="loai" defaultValue={type} className={`${selectClass} max-w-[180px]`}>
          <option value="">Mọi loại</option>
          {Object.entries(customerTypeLabel).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select name="trang-thai" defaultValue={status} className={`${selectClass} max-w-[180px]`}>
          <option value="dang_dung">Đang sử dụng</option>
          <option value="luu_tru">Đã lưu trữ</option>
        </select>
        <button className={buttonPrimary}>Lọc</button>
      </form>
      <div className={panelClass}>
        <Table>
          <TableHeader>
            <TableRow className="bg-soft hover:bg-soft">
              <TableHead>Mã</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted">Chưa có khách phù hợp.</TableCell>
              </TableRow>
            ) : null}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <button type="button" className="font-semibold text-primary" onClick={() => openMode("xem", row.id)}>
                    {row.code}
                  </button>
                </TableCell>
                <TableCell className="whitespace-normal">
                  <button type="button" className="text-left font-medium text-ink" onClick={() => openMode("xem", row.id)}>
                    {row.name}
                  </button>
                  <p className="text-xs text-muted">{[row.phone, row.contactName].filter(Boolean).join(" · ")}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{customerTypeLabel[row.type as keyof typeof customerTypeLabel] ?? row.type}</Badge>
                </TableCell>
                <TableCell className="text-muted">{row.email || "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {canUpdate ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => openMode("sua", row.id)}>
                        <Pencil /> Sửa
                      </Button>
                    ) : null}
                    {canDelete ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-danger hover:text-danger"
                        onClick={() => {
                          setDeleteError("");
                          setPendingDelete(row);
                        }}
                      >
                        <Trash2 /> Xóa
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {pages > 1 ? (
        <div className="flex gap-2">
          {Array.from({ length: pages }, (_, index) => (
            <Link
              key={index}
              className={index + 1 === page ? buttonPrimary : "inline-flex h-11 items-center px-3 text-sm font-semibold text-primary"}
              href={listHref(q, type, ownerId, status, index + 1)}
            >
              {index + 1}
            </Link>
          ))}
        </div>
      ) : null}

      <Sheet open={mode !== null} onOpenChange={(open) => { if (!open) openMode(null); }}>
        <SheetContent className={mode === "xem" ? "sm:w-2/3" : "sm:w-3/4"}>
          <SheetHeader>
            <SheetTitle>{sheetTitle}</SheetTitle>
            {sheetText ? <SheetDescription>{sheetText}</SheetDescription> : <SheetDescription className="sr-only">{sheetTitle}</SheetDescription>}
          </SheetHeader>
          {mode === "them" && canCreate ? (
            <CustomerForm
              key={`them-${formKey}`}
              mode="create"
              initial={blank(currentUserId)}
              inSheet
              onSaved={saved}
              onClose={() => openMode(null)}
              onOpenCustomer={(id) => openMode("xem", id)}
            />
          ) : null}
          {mode === "sua" && canUpdate && !(detail && detail.id === targetId) ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 px-5 py-4">
                {loadError ? <p className="text-sm text-danger">{loadError}</p> : <p className="text-sm text-muted">Đang tải hồ sơ...</p>}
              </div>
              <div className="sticky bottom-0 z-10 flex shrink-0 justify-end border-t border-line bg-white px-5 py-3">
                <Button type="button" variant="outline" onClick={() => openMode(null)}>Đóng</Button>
              </div>
            </div>
          ) : null}
          {mode === "sua" && canUpdate && detail && detail.id === targetId ? (
            <CustomerForm
              key={`${detail.id}-${detail.revision}`}
              mode="edit"
              customerId={detail.id}
              inSheet
              onSaved={saved}
              onClose={() => openMode(null)}
              onOpenCustomer={(id) => openMode("xem", id)}
              savedAccounts={detail.bankAccounts}
              onAccountsChanged={() => setTick((value) => value + 1)}
              initial={{
                type: detail.type,
                name: detail.name,
                shortName: detail.shortName,
                taxCode: detail.taxCode,
                phone: detail.phone,
                fax: detail.fax,
                altPhone: detail.altPhone,
                email: detail.email,
                address: detail.address,
                invoiceName: detail.invoiceName,
                invoiceTaxCode: detail.invoiceTaxCode,
                invoiceAddress: detail.invoiceAddress,
                invoiceEmail: detail.invoiceEmail,
                representativeName: detail.representativeName,
                representativeTitle: detail.representativeTitle,
                executorName: detail.executorName,
                executorTitle: detail.executorTitle,
                ownerId: detail.ownerId,
                source: detail.source,
                note: detail.note,
                revision: detail.revision,
              }}
            />
          ) : null}
          {mode === "xem" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                {loadError ? <p className="text-sm text-danger">{loadError}</p> : null}
                {!detail && !loadError ? <p className="text-sm text-muted">Đang tải hồ sơ...</p> : null}
                {detail && detail.id === targetId ? (
                  <CustomerOverview
                    customer={{
                      id: detail.id,
                      name: detail.name,
                      code: detail.code,
                      type: detail.type,
                      status: detail.status,
                      address: detail.address,
                      phone: detail.phone,
                      fax: detail.fax,
                      email: detail.email,
                      altPhone: detail.altPhone,
                      taxCode: detail.taxCode,
                      invoiceAddress: detail.invoiceAddress,
                      representativeName: detail.representativeName,
                      representativeTitle: detail.representativeTitle,
                      executorName: detail.executorName,
                      executorTitle: detail.executorTitle,
                      invoiceEmail: detail.invoiceEmail,
                      note: detail.note,
                      bankAccounts: detail.bankAccounts,
                    }}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                    canQuote={canQuote}
                    canProject={canProject}
                    onEdit={() => openMode("sua", detail.id)}
                    onQuote={() => router.push(`/bao-gia/moi?khach=${detail.id}`)}
                    onProject={() => router.push(`/cong-trinh/moi?khach=${detail.id}`)}
                    onChanged={() => setTick((value) => value + 1)}
                    onDelete={() => {
                      setDeleteError("");
                      setPendingDelete({
                        id: detail.id,
                        code: detail.code,
                        name: detail.name,
                        type: detail.type,
                        phone: detail.phone,
                        email: detail.email,
                        status: detail.status,
                        ownerName: "",
                        contactName: "",
                      });
                    }}
                  />
                ) : null}
              </div>
              <div className="sticky bottom-0 z-10 flex shrink-0 justify-end border-t border-line bg-white px-5 py-3">
                <Button type="button" variant="outline" onClick={() => openMode(null)}>Đóng</Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open && !deleting) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa khách hàng</AlertDialogTitle>
            <AlertDialogDescription>
              Xóa {pendingDelete ? `${pendingDelete.code} · ${pendingDelete.name}` : "khách này"}? Người liên hệ và tài khoản ngân hàng sẽ mất. Khách đang có công trình, báo giá hoặc hợp đồng thì không xóa được.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? <p className="mt-2 text-sm text-danger">{deleteError}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
            <Button type="button" variant="destructive" disabled={deleting} onClick={confirmDelete}>
              {deleting ? "Đang xóa" : "Xóa"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
