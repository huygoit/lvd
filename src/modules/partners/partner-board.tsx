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
import { formatDateTime } from "@/shared/lib/dates";
import { cn } from "@/shared/lib/cn";
import { ArchivePartnerButton, PartnerContactPanel } from "@/modules/partners/partner-panel";
import { PartnerForm, type PartnerDraft } from "@/modules/partners/partner-form";
import { partnerRoleLabel, partnerRoles, type PartnerRole } from "@/modules/partners/roles";

type Mode = "them" | "sua" | "xem";

type Row = {
  id: string;
  code: string;
  name: string;
  shortName: string;
  phone: string;
  taxCode: string;
  status: string;
  roles: PartnerRole[];
  contactName: string;
};

type Detail = PartnerDraft & {
  id: string;
  code: string;
  status: string;
  createdAt: string;
  contacts: { id: string; name: string; title: string; phone: string; email: string; isPrimary: boolean }[];
};

const blank: PartnerDraft = {
  code: "",
  name: "",
  shortName: "",
  taxCode: "",
  phone: "",
  email: "",
  website: "",
  bankName: "",
  accountNumber: "",
  address: "",
  representativeName: "",
  representativeTitle: "",
  note: "",
  roles: [],
};

function listHref(q: string, role: string, status: string, page?: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (role) params.set("vai-tro", role);
  if (status && status !== "dang_dung") params.set("trang-thai", status);
  if (page && page > 1) params.set("trang", String(page));
  const query = params.toString();
  return query ? `/doi-tac?${query}` : "/doi-tac";
}

export function PartnerBoard({
  countLabel,
  q,
  status,
  activeRole,
  page,
  pages,
  rows,
  canCreate,
  canUpdate,
  canDelete,
  initialMode,
  initialId,
  titles,
}: {
  countLabel: string;
  q: string;
  status: string;
  activeRole: string;
  page: number;
  pages: number;
  rows: Row[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  initialMode: Mode | null;
  initialId: string;
  titles: string[];
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
    callApi<Detail>(`/api/doi-tac/${targetId}`, { signal: control.signal })
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
    router.replace(query ? `/doi-tac?${query}` : "/doi-tac", { scroll: false });
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
      await callApi(`/api/doi-tac/${pendingDelete.id}`, { method: "DELETE" });
      if (targetId === pendingDelete.id) openMode(null);
      setPendingDelete(null);
      router.refresh();
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "Không xóa được.");
    } finally {
      setDeleting(false);
    }
  }

  const sheetTitle = mode === "them" ? "Thêm đối tác" : mode === "sua" ? "Sửa đối tác" : detail?.name || "Hồ sơ đối tác";
  const sheetText = mode === "them" || mode === "sua"
    ? ""
    : detail
        ? `${detail.code}${detail.status === "luu_tru" ? " · Đã lưu trữ" : ""}`
        : "Đang mở hồ sơ.";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Đối tác</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            {countLabel}. Một công ty một hồ sơ, gắn nhiều vai trò. Bấm mã hoặc tên để xem.
          </p>
        </div>
        {canCreate ? (
          <button type="button" className={buttonPrimary} onClick={() => openMode("them")}>Thêm đối tác</button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={listHref(q, "", status)}
          className={cn(
            "inline-flex h-9 items-center rounded-full border px-3 text-sm font-medium",
            activeRole ? "border-line bg-white text-ink" : "border-primary bg-primary text-white",
          )}
        >
          Mọi vai trò
        </Link>
        {partnerRoles.map((item) => (
          <Link
            key={item}
            href={listHref(q, item, status)}
            className={cn(
              "inline-flex h-9 items-center rounded-full border px-3 text-sm font-medium",
              activeRole === item ? "border-primary bg-primary text-white" : "border-line bg-white text-ink",
            )}
          >
            {partnerRoleLabel[item]}
          </Link>
        ))}
      </div>
      <form className="flex flex-wrap gap-2" action="/doi-tac">
        {activeRole ? <input type="hidden" name="vai-tro" value={activeRole} /> : null}
        <input name="q" defaultValue={q} placeholder="Tên, mã, điện thoại, thuế" className={`${inputClass} max-w-sm`} />
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
              <TableHead>Đối tác</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Mã số thuế</TableHead>
              <TableHead>Điện thoại</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted">
                  Chưa có đối tác phù hợp. Thêm công ty cung cấp, xưởng, đơn vị vận tải hoặc đội thuê ngoài.
                </TableCell>
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
                  <p className="text-xs text-muted">{[row.shortName, row.contactName].filter(Boolean).join(" · ")}</p>
                </TableCell>
                <TableCell className="whitespace-normal">
                  <span className="flex flex-wrap gap-1">
                    {row.roles.map((item) => (
                      <Badge key={item} variant="secondary">{partnerRoleLabel[item]}</Badge>
                    ))}
                  </span>
                </TableCell>
                <TableCell className="text-muted">{row.taxCode || "—"}</TableCell>
                <TableCell className="text-muted">{row.phone || "—"}</TableCell>
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
              href={listHref(q, activeRole, status, index + 1)}
            >
              {index + 1}
            </Link>
          ))}
        </div>
      ) : null}

      <Sheet open={mode !== null} onOpenChange={(open) => { if (!open) openMode(null); }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{sheetTitle}</SheetTitle>
            {sheetText ? <SheetDescription>{sheetText}</SheetDescription> : <SheetDescription className="sr-only">{sheetTitle}</SheetDescription>}
          </SheetHeader>
          {mode === "them" && canCreate ? (
            <PartnerForm
              key={`them-${formKey}`}
              mode="create"
              initial={blank}
              titles={titles}
              inSheet
              onSaved={saved}
              onClose={() => openMode(null)}
              onOpenPartner={(id) => openMode("xem", id)}
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
            <PartnerForm
              key={`${detail.id}-${detail.revision}`}
              mode="edit"
              partnerId={detail.id}
              titles={titles}
              inSheet
              onSaved={saved}
              onClose={() => openMode(null)}
              onOpenPartner={(id) => openMode("xem", id)}
              initial={{
                code: detail.code,
                name: detail.name,
                shortName: detail.shortName,
                taxCode: detail.taxCode,
                phone: detail.phone,
                email: detail.email,
                website: detail.website,
                bankName: detail.bankName,
                accountNumber: detail.accountNumber,
                address: detail.address,
                representativeName: detail.representativeName,
                representativeTitle: detail.representativeTitle,
                note: detail.note,
                roles: detail.roles,
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
                <>
                  <div className="flex flex-wrap gap-2">
                    {detail.roles.map((role) => (
                      <Badge key={role} variant="secondary">{partnerRoleLabel[role]}</Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canUpdate ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => openMode("sua", detail.id)}>
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
                          setPendingDelete({
                            id: detail.id,
                            code: detail.code,
                            name: detail.name,
                            shortName: detail.shortName,
                            phone: detail.phone,
                            taxCode: detail.taxCode,
                            status: detail.status,
                            roles: detail.roles,
                            contactName: "",
                          });
                        }}
                      >
                        <Trash2 /> Xóa
                      </Button>
                    ) : null}
                    {detail.status === "dang_dung" && canDelete ? (
                      <ArchivePartnerButton id={detail.id} onDone={() => setTick((value) => value + 1)} />
                    ) : null}
                  </div>
                  <section className="grid gap-2 text-sm sm:grid-cols-2">
                    <p>Mã đối tác: {detail.code}</p>
                    <p>Điện thoại: {detail.phone || "—"}</p>
                    <p>Email: {detail.email || "—"}</p>
                    <p className="sm:col-span-2">Website: {detail.website || "—"}</p>
                    <p>Tên ngân hàng: {detail.bankName || "—"}</p>
                    <p>Số tài khoản: {detail.accountNumber || "—"}</p>
                    <p>Mã số thuế: {detail.taxCode || "—"}</p>
                    <p>Người đại diện: {[detail.representativeName, detail.representativeTitle].filter(Boolean).join(" · ") || "—"}</p>
                    <p className="sm:col-span-2">Địa chỉ: {detail.address || "—"}</p>
                    {detail.note ? <p className="sm:col-span-2">Ghi chú: {detail.note}</p> : null}
                    <p className="text-muted">Tạo lúc {formatDateTime(new Date(detail.createdAt))}</p>
                  </section>
                  {canUpdate ? (
                    <PartnerContactPanel partnerId={detail.id} contacts={detail.contacts} titles={titles} onChanged={() => setTick((value) => value + 1)} />
                  ) : (
                    <section className="text-sm">
                      <h2 className="font-semibold">Người liên hệ</h2>
                      {detail.contacts.length === 0 ? <p className="mt-2 text-muted">Chưa có người liên hệ.</p> : null}
                      {detail.contacts.map((item) => (
                        <p key={item.id} className="mt-2">{item.name} · {[item.title, item.phone].filter(Boolean).join(" · ")}</p>
                      ))}
                    </section>
                  )}
                  <p className="text-sm text-muted">Gắn vào công trình, đơn mua, gia công, vận chuyển và công nợ sẽ nối ở các phân hệ sau. Màn này không hiện số 0.</p>
                </>
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
            <AlertDialogTitle>Xóa đối tác</AlertDialogTitle>
            <AlertDialogDescription>
              Xóa {pendingDelete ? `${pendingDelete.code} · ${pendingDelete.name}` : "đối tác này"}? Hồ sơ và người liên hệ sẽ mất khỏi danh mục.
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
