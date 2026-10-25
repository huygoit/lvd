"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { callApi } from "@/shared/client/api";
import { formatUnitPrice } from "@/modules/projects/item-fields";
import { buttonPrimary, inputClass, panelClass, selectClass } from "@/shared/components/controls";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { projectStageLabel } from "@/modules/customers/labels";
import type { HangMucActions } from "@/modules/projects/project-items";
import type { ChiPhiActions } from "@/modules/projects/project-costs";
import { ProjectForm, type ProjectDraft } from "@/modules/projects/project-form";
import { dateLabel, ProjectOverview } from "@/modules/projects/project-overview";
import { ProjectProgress } from "@/modules/projects/project-progress";

type Row = {
  id: string;
  code: string;
  name: string;
  customerId: string;
  customerName: string;
  ownerId: string;
  ownerName: string;
  stage: string;
  location: string;
  venture: string;
  bidPackage: string;
  startedOn: string;
  endedOn: string;
  vatPercent: number | null;
};

type Customer = { id: string; code: string; name: string };
type Mode = "xem" | "them" | "sua";

type Detail = ProjectDraft & {
  customerCode: string;
  customerName: string;
};

const blank = (ownerId: string, customerId: string): ProjectDraft => ({
  id: "",
  customerId,
  name: "",
  location: "",
  venture: "",
  bidPackage: "",
  startedOn: "",
  endedOn: "",
  vatPercent: null,
  ownerId,
  note: "",
  stage: "dang_khao_sat",
  revision: null,
});

export function ProjectBoard({
  rows,
  q,
  stage,
  canCreate,
  canEdit,
  canSeeShared,
  canQuote,
  staff,
  customers,
  defaultOwnerId,
  initialMode,
  initialId,
  initialCustomerId,
}: {
  rows: Row[];
  q: string;
  stage: string;
  canCreate: boolean;
  canEdit: boolean;
  canSeeShared: boolean;
  canQuote: boolean;
  staff: { id: string; name: string }[];
  customers: Customer[];
  defaultOwnerId: string;
  initialMode: Mode | null;
  initialId: string;
  initialCustomerId: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(initialMode);
  const [targetId, setTargetId] = useState(initialId);
  const [presetCustomer, setPresetCustomer] = useState(initialCustomerId);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loadError, setLoadError] = useState("");
  const [formKey, setFormKey] = useState(0);
  const [hangMuc, setHangMuc] = useState(false);
  const [chiPhi, setChiPhi] = useState(false);
  const [sauThue, setSauThue] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const addLineRef = useRef<HangMucActions | null>(null);
  const addCostRef = useRef<ChiPhiActions | null>(null);

  useEffect(() => {
    if (mode !== "sua" || !targetId) return;
    const control = new AbortController();
    setDetail(null);
    setLoadError("");
    callApi<Detail>(`/api/cong-trinh/${targetId}`, { signal: control.signal })
      .then((row) => {
        if (!control.signal.aborted) setDetail(row);
      })
      .catch((error: unknown) => {
        if (control.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : "Không tải được hồ sơ.");
      });
    return () => control.abort();
  }, [mode, targetId]);

  function open(next: Mode | null, id = "", customerId = "") {
    setMode(next);
    setTargetId(id);
    setPresetCustomer(customerId);
    if (next !== "xem") {
      setHangMuc(false);
      setChiPhi(false);
      setSauThue(null);
    }
    if (next === "them") setFormKey((value) => value + 1);
    const params = new URLSearchParams(window.location.search);
    if (next) params.set("mo", next);
    else params.delete("mo");
    if (id && next && next !== "them") params.set("ho-so", id);
    else params.delete("ho-so");
    if (next === "them" && customerId) params.set("khach", customerId);
    else params.delete("khach");
    const query = params.toString();
    router.replace(query ? `/cong-trinh?${query}` : "/cong-trinh", { scroll: false });
  }

  function saved() {
    router.refresh();
    open(null);
  }

  async function remove() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await callApi(`/api/cong-trinh/${pendingDelete.id}`, { method: "DELETE" });
      if (targetId === pendingDelete.id) open(null);
      setPendingDelete(null);
      router.refresh();
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "Không xóa được.");
    } finally {
      setDeleting(false);
    }
  }

  const current = rows.find((row) => row.id === targetId) ?? null;
  const editCustomers = detail
    ? customers.some((item) => item.id === detail.customerId)
      ? customers
      : [{ id: detail.customerId, code: detail.customerCode, name: detail.customerName }, ...customers]
    : customers;
  const sheetWide = mode === "xem";
  const sheetTitle = mode === "them" ? "Thêm công trình" : mode === "sua" ? "Sửa công trình" : current?.name || "Công trình";
  const sheetText = mode === "them" || mode === "sua"
    ? "Điền hồ sơ. Dự án và gói thầu để trống nếu chưa có."
    : current
      ? `${current.code} · ${current.customerName}`
      : "Đang mở hồ sơ.";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Công trình</h1>
          <p className="mt-1 text-sm text-muted">{rows.length} công trình. Bấm tên để xem.</p>
        </div>
        {canCreate ? (
          <button type="button" className={buttonPrimary} onClick={() => open("them", "", presetCustomer)}>Thêm công trình</button>
        ) : null}
      </div>
      <form className="flex flex-wrap gap-2" action="/cong-trinh">
        <input name="q" defaultValue={q} placeholder="Mã, tên, địa chỉ, dự án" className={`${inputClass} max-w-sm`} />
        <select name="giai-doan" defaultValue={stage} className={`${selectClass} max-w-[220px]`}>
          <option value="">Mọi giai đoạn</option>
          {Object.entries(projectStageLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button className={buttonPrimary}>Lọc</button>
      </form>
      <div className={panelClass}>
        <Table>
          <TableHeader>
            <TableRow className="bg-soft hover:bg-soft">
              <TableHead>Tên công trình</TableHead>
              <TableHead>Thành viên</TableHead>
              <TableHead>Ngày bắt đầu</TableHead>
              <TableHead>Ngày kết thúc</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead className="min-w-[200px]">Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted">Chưa có công trình.</TableCell>
              </TableRow>
            ) : null}
            {rows.map((row) => {
              const initial = row.ownerName.trim().slice(0, 1).toLocaleUpperCase("vi");
              return (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-normal">
                    <button type="button" className="text-left" onClick={() => open("xem", row.id)}>
                      <span className="block font-medium text-ink">{row.name}</span>
                      <span className="text-xs text-primary">{row.code}</span>
                    </button>
                  </TableCell>
                  <TableCell>
                    {row.ownerName ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{initial}</span>
                        <span className="text-sm text-ink">{row.ownerName}</span>
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted">{dateLabel(row.startedOn)}</TableCell>
                  <TableCell className="text-muted">{dateLabel(row.endedOn)}</TableCell>
                  <TableCell className="whitespace-normal text-ink">{row.customerName}</TableCell>
                  <TableCell>
                    <ProjectProgress stage={row.stage} />
                  </TableCell>
                  <TableCell className="text-right">
                    {canEdit ? (
                      <div className="flex justify-end gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => open("sua", row.id)}>
                          <Pencil /> Sửa
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="text-danger" onClick={() => { setDeleteError(""); setPendingDelete(row); }}>
                          Xóa
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Sheet open={mode !== null} onOpenChange={(next) => { if (!next) open(null); }}>
        <SheetContent className={sheetWide ? "sm:w-full" : "sm:w-3/4"}>
          <SheetHeader>
            <SheetTitle>{sheetTitle}</SheetTitle>
            <SheetDescription>{sheetText}</SheetDescription>
          </SheetHeader>
          {mode === "them" ? (
            <ProjectForm
              key={`them-${formKey}`}
              mode="create"
              customers={customers}
              staff={staff}
              initial={blank(defaultOwnerId, presetCustomer)}
              canQuote={canQuote}
              onClose={() => open(null)}
              onSaved={saved}
            />
          ) : null}
          {mode === "sua" && !(detail && detail.id === targetId) ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 px-5 py-4">
                {loadError ? <p className="text-sm text-danger" role="alert">{loadError}</p> : <p className="text-sm text-muted">Đang tải hồ sơ...</p>}
              </div>
              <SheetFooter className="flex justify-end bg-white">
                <Button type="button" variant="outline" onClick={() => open(null)}>Đóng</Button>
              </SheetFooter>
            </div>
          ) : null}
          {mode === "sua" && detail && detail.id === targetId ? (
            <ProjectForm
              key={detail.id + String(detail.revision)}
              mode="edit"
              customers={editCustomers}
              staff={staff}
              initial={detail}
              canQuote={false}
              onClose={() => open(null)}
              onSaved={saved}
            />
          ) : null}
          {mode === "xem" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-8">
                {current ? (
                  <ProjectOverview
                    project={current}
                    staff={staff}
                    canEdit={canEdit}
                    canSeeShared={canSeeShared}
                    canQuote={canQuote}
                    onEdit={() => open("sua", current.id)}
                    onQuote={() => router.push(`/bao-gia/moi?khach=${current.customerId}&cong-trinh=${current.id}`)}
                    onHangMuc={setHangMuc}
                    onChiPhi={setChiPhi}
                    onSauThue={setSauThue}
                    addLineRef={addLineRef}
                    addCostRef={addCostRef}
                  />
                ) : targetId ? (
                  <p className="text-sm text-muted">Không thấy công trình trên trang này.</p>
                ) : null}
              </div>
              <SheetFooter className="flex flex-wrap items-center justify-between gap-3 bg-white">
                {hangMuc && sauThue !== null ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted">Tổng cộng sau thuế</span>
                    <span className="h-5 w-px bg-line" />
                    <span className="text-lg font-semibold tabular-nums text-primary">{formatUnitPrice(sauThue)}</span>
                  </div>
                ) : null}
                <div className="ml-auto flex flex-wrap justify-end gap-2">
                  {hangMuc && canEdit ? (
                    <>
                      <Button type="button" variant="outline" onClick={() => addLineRef.current?.copy()}>Thêm từ copy hạng mục</Button>
                      <Button type="button" onClick={() => addLineRef.current?.add()}>Thêm hạng mục mới</Button>
                    </>
                  ) : null}
                  {chiPhi && canEdit ? (
                    <Button type="button" onClick={() => addCostRef.current?.add()}>Thêm chi phí</Button>
                  ) : null}
                  <Button type="button" variant="outline" onClick={() => open(null)}>Đóng</Button>
                </div>
              </SheetFooter>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(next) => { if (!next && !deleting) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa công trình</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? `${pendingDelete.code} · ${pendingDelete.name} sẽ bị xóa.` : ""} Chỉ xóa được hồ sơ chưa gắn hạng mục, đơn hàng, báo giá, hợp đồng hoặc phiếu kho.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? <p className="text-sm text-danger" role="alert">{deleteError}</p> : null}
          <AlertDialogFooter>
            <Button type="button" variant="outline" disabled={deleting} onClick={() => setPendingDelete(null)}>Đóng</Button>
            <Button type="button" variant="destructive" disabled={deleting} onClick={() => void remove()}>{deleting ? "Đang xóa" : "Xóa"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
