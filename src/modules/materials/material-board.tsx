"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { buttonPrimary, inputClass, panelClass, selectClass } from "@/shared/components/controls";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { callApi } from "@/shared/client/api";
import { formatMeasure, formatReferencePrice, formatTax } from "@/modules/materials/labels";
import { materialGroups, materialNatureLabel, materialPriceBasisLabel, materialPriceBases } from "@/shared/catalog/materials";
import { MaterialForm, type MaterialDraft } from "@/modules/materials/material-form";

type Mode = "them" | "sua" | "xem";

function queryOf(mode: Mode | null, id: string, search: string) {
  const params = new URLSearchParams(search);
  if (mode) params.set("mo", mode);
  else params.delete("mo");
  if (id && mode && mode !== "them") params.set("ho-so", id);
  else params.delete("ho-so");
  const query = params.toString();
  return query ? `/vat-tu?${query}` : "/vat-tu";
}

export function MaterialBoard({
  rows,
  opened,
  q,
  groupName,
  priceBasis,
  suppliers,
  supplierId,
  page,
  pages,
  total,
  canCreate,
  canUpdate,
  initialMode,
  initialId,
}: {
  rows: MaterialDraft[];
  opened: MaterialDraft | null;
  q: string;
  groupName: string;
  priceBasis: string;
  suppliers: { id: string; code: string; name: string; shortName: string }[];
  supplierId: string;
  page: number;
  pages: number;
  total: number;
  canCreate: boolean;
  canUpdate: boolean;
  initialMode: Mode | null;
  initialId: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(initialMode);
  const [openId, setOpenId] = useState(initialId);
  const [panelId, setPanelId] = useState(initialId);
  const [pendingDelete, setPendingDelete] = useState<MaterialDraft | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  function open(next: Mode | null, id = "") {
    setMode(next);
    setOpenId(next ? id : "");
    if (id) setPanelId(id);
    router.replace(queryOf(next, id, window.location.search), { scroll: false });
  }

  const current = rows.find((row) => row.id === (openId || panelId)) ?? (opened && opened.id === (openId || panelId) ? opened : null);
  const listHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (groupName) params.set("nhom", groupName);
    if (priceBasis) params.set("tinh-tien", priceBasis);
    if (supplierId) params.set("ncc", supplierId);
    if (nextPage > 1) params.set("trang", String(nextPage));
    const query = params.toString();
    return query ? `/vat-tu?${query}` : "/vat-tu";
  };

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await callApi(`/api/vat-tu/${pendingDelete.id}`, { method: "DELETE" });
      setPendingDelete(null);
      if (openId === pendingDelete.id) open(null);
      router.refresh();
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "Không xóa được.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Danh mục vật tư</h1>
          <p className="mt-1 text-sm text-muted">{total} mã. Giá trên danh sách là giá tham chiếu.</p>
        </div>
        {canCreate ? <Button type="button" onClick={() => open("them")}>Thêm vật tư</Button> : null}
      </div>
      <form className="flex flex-wrap gap-2" action="/vat-tu">
        <input name="q" defaultValue={q} placeholder="Mã, tên, màu" className={`${inputClass} max-w-sm`} />
        <select name="nhom" defaultValue={groupName} className={`${selectClass} max-w-[240px]`}>
          <option value="">Tất cả nhóm vật tư</option>
          <option value="__trong">Chưa có nhóm</option>
          {materialGroups.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select name="tinh-tien" defaultValue={priceBasis} className={`${selectClass} max-w-[220px]`}>
          <option value="">Tất cả cách tính</option>
          {materialPriceBases.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
        </select>
        <select name="ncc" defaultValue={supplierId} className={`${selectClass} max-w-sm`}>
          <option value="">Tất cả nhà cung cấp</option>
          {suppliers.map((item) => {
            const name = item.name || item.shortName;
            return <option key={item.id} value={item.id}>{name ? `${item.code} · ${name}` : item.code}</option>;
          })}
        </select>
        <button className={buttonPrimary}>Lọc</button>
      </form>
      <div className={panelClass}>
        <Table>
          <TableHeader>
            <TableRow className="bg-soft hover:bg-soft">
              <TableHead>Mã</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead>Nhóm</TableHead>
              <TableHead>ĐVT</TableHead>
              <TableHead>Tính tiền</TableHead>
              <TableHead>Thuế</TableHead>
              <TableHead className="text-right">Giá tham chiếu</TableHead>
              <TableHead>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted">{q || groupName || priceBasis || supplierId ? "Không có vật tư khớp bộ lọc." : "Chưa có vật tư."}</TableCell>
              </TableRow>
            ) : null}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <button type="button" className="font-semibold text-primary" onClick={() => open("xem", row.id)}>{row.code}</button>
                </TableCell>
                <TableCell className="whitespace-normal">
                  <button type="button" className="text-left font-medium text-ink" onClick={() => open("xem", row.id)}>{row.name}</button>
                  {row.color ? <span className="mt-0.5 block text-xs text-muted">{row.color}</span> : null}
                </TableCell>
                <TableCell className="whitespace-normal">{row.groupName || "—"}</TableCell>
                <TableCell>{row.stockUnit}</TableCell>
                <TableCell>{materialPriceBasisLabel(row.priceBasis)}</TableCell>
                <TableCell>{formatTax(row.taxBps)}</TableCell>
                <TableCell className="text-right">{formatReferencePrice(row.referencePrice)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {canUpdate ? <Button type="button" size="sm" variant="outline" onClick={() => open("sua", row.id)}><Pencil /> Sửa</Button> : null}
                    {canUpdate ? <Button type="button" size="sm" variant="outline" onClick={() => { setDeleteError(""); setPendingDelete(row); }}><Trash2 /> Xóa</Button> : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {pages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Trang {page}/{pages}</span>
          <div className="flex gap-2">
            {page > 1 ? <Link href={listHref(page - 1)} className="font-semibold text-primary">Trước</Link> : null}
            {page < pages ? <Link href={listHref(page + 1)} className="font-semibold text-primary">Sau</Link> : null}
          </div>
        </div>
      ) : null}

      <Sheet open={mode !== null} onOpenChange={(next) => { if (!next) open(null); }}>
        <SheetContent className={mode === "xem" ? "sm:w-2/3" : undefined}>
          <SheetHeader>
            <SheetTitle>{mode === "them" ? "Thêm vật tư" : current?.name || "Vật tư"}</SheetTitle>
            <SheetDescription>{mode === "them" ? "Hồ sơ mới." : current ? [current.code, current.groupName].filter(Boolean).join(" · ") : "Đang mở hồ sơ."}</SheetDescription>
          </SheetHeader>
          {mode === "xem" && current ? <MaterialDetail row={current} canUpdate={canUpdate} onEdit={() => open("sua", current.id)} onClose={() => open(null)} onDelete={() => { setDeleteError(""); setPendingDelete(current); }} /> : null}
          {mode === "them" && canCreate ? <MaterialForm key="them" mode="them" onClose={() => open(null)} onSaved={() => open(null)} /> : null}
          {mode === "sua" && canUpdate && current ? <MaterialForm key={current.id} mode="sua" initial={current} onClose={() => open("xem", current.id)} onSaved={() => open("xem", current.id)} /> : null}
          {mode !== null && mode !== "them" && !current ? <p className="px-5 py-4 text-sm text-muted">Không thấy vật tư trên trang này.</p> : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(next) => { if (!next && !deleting) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa vật tư</AlertDialogTitle>
            <AlertDialogDescription>
              Xóa {pendingDelete ? `${pendingDelete.code} · ${pendingDelete.name}` : "mã này"} khỏi danh mục?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? <p className="text-sm text-danger">{deleteError}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
            <Button type="button" variant="destructive" disabled={deleting} onClick={confirmDelete}>{deleting ? "Đang xóa" : "Xóa"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MaterialDetail({
  row,
  canUpdate,
  onEdit,
  onClose,
  onDelete,
}: {
  row: MaterialDraft;
  canUpdate: boolean;
  onEdit: () => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const lines = [
    ["Tính chất", materialNatureLabel(row.nature)],
    ["Đơn vị tính", row.stockUnit],
    ["Tính tiền", materialPriceBasisLabel(row.priceBasis)],
    ["Mã nhà cung cấp", row.supplierCode || "—"],
    ["Mã hàng nhà cung cấp", row.supplierItemCode || "—"],
    ["Mã khác", row.otherCode || "—"],
    ["Màu", row.color || "—"],
    ["Quy cách", row.spec || "—"],
    ["Dài thanh", formatMeasure(row.barLengthMm, "m")],
    ["Kg/m", formatMeasure(row.gramsPerMeter, "kg/m")],
    ["Kg/thanh", formatMeasure(row.gramsPerBar, "kg")],
    ["Thuế suất", formatTax(row.taxBps)],
    ["Đơn giá tham chiếu", formatReferencePrice(row.referencePrice)],
    ["Tên trên hóa đơn", row.invoiceName || "—"],
    ["Ghi chú", row.note || "—"],
  ];
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {canUpdate ? <Button type="button" size="sm" variant="outline" onClick={onEdit}><Pencil /> Sửa</Button> : null}
          {canUpdate ? <Button type="button" size="sm" variant="outline" onClick={onDelete}><Trash2 /> Xóa</Button> : null}
        </div>
        <dl className="grid gap-3 sm:grid-cols-2">
          {lines.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-line px-4 py-3">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="sticky bottom-0 z-10 flex shrink-0 justify-end border-t border-line bg-white px-5 py-3">
        <Button type="button" variant="outline" onClick={onClose}>Đóng</Button>
      </div>
    </div>
  );
}
