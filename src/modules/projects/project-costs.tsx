"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { callApi } from "@/shared/client/api";
import { ActionBadge } from "@/shared/components/action-badge";
import { NgayNhap } from "@/shared/components/ngay-nhap";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { todayYmd } from "@/shared/lib/dates";
import { cn } from "@/shared/lib/cn";
import { digitsVnd, formatCount, formatVnd } from "@/shared/lib/money";
import { costCategoryLabel, type CostCategory } from "@/modules/projects/cost-fields";
import { ProjectSharedCosts } from "@/modules/projects/project-shared-costs";

function ngay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "—";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

// Ô nhập / tiêu đề — cùng cảm giác bảng Phụ thu trên đơn đặt hàng.
const oNhap = "box-border h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-sm text-ink outline-none hover:border-line focus:border-primary focus:bg-white";
const tieuDe = "h-10 px-2 text-left align-middle text-sm font-medium";
const tieuDeSo = "h-10 px-2 text-right align-middle text-sm font-medium tabular-nums";
const o = "p-0 align-middle";
const chu = "flex h-9 items-center px-2 text-sm text-ink";
const chuPhai = cn(chu, "justify-end font-semibold tabular-nums");

type Staff = { id: string; name: string };

type Cost = {
  id: string;
  code: string;
  occurredOn: string;
  category: string;
  categoryLabel: string;
  content: string;
  amount: number;
  payerId: string;
  payerName: string;
  note: string;
  nghiTrung: boolean;
};

type Line = {
  key: string;
  id: string;
  code: string;
  occurredOn: string;
  category: CostCategory;
  content: string;
  amount: string;
  payerId: string;
  note: string;
  nghiTrung: boolean;
  editing: boolean;
  saving: boolean;
  error: string;
  warn: string;
  saved: string;
};

const nhom = Object.entries(costCategoryLabel) as [CostCategory, string][];

function anh(line: Pick<Line, "occurredOn" | "category" | "content" | "amount" | "payerId" | "note">) {
  return JSON.stringify({
    occurredOn: line.occurredOn,
    category: line.category,
    content: line.content.trim(),
    amount: line.amount,
    payerId: line.payerId,
    note: line.note.trim(),
  });
}

function nhomHopLe(value: string): CostCategory {
  return value in costCategoryLabel ? value as CostCategory : "khac";
}

function tuDong(row: Cost): Line {
  const line: Line = {
    key: row.id,
    id: row.id,
    code: row.code,
    occurredOn: row.occurredOn,
    category: nhomHopLe(row.category),
    content: row.content,
    amount: String(row.amount),
    payerId: row.payerId,
    note: row.note,
    nghiTrung: row.nghiTrung,
    editing: false,
    saving: false,
    error: "",
    warn: "",
    saved: "",
  };
  line.saved = anh(line);
  return line;
}

function dongMoi(payerId: string): Line {
  const line: Line = {
    key: `moi-${Date.now()}`,
    id: "",
    code: "",
    occurredOn: todayYmd(new Date()),
    category: "an_o",
    content: "",
    amount: "",
    payerId,
    note: "",
    nghiTrung: false,
    editing: true,
    saving: false,
    error: "",
    warn: "",
    saved: "",
  };
  line.saved = anh(line);
  return line;
}

export function ProjectCosts({
  projectId,
  staff,
  canEdit,
  canSeeShared,
  defaultPayerId,
}: {
  projectId: string;
  staff: Staff[];
  canEdit: boolean;
  canSeeShared: boolean;
  defaultPayerId: string;
}) {
  const [lines, setLines] = useState<Line[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Line | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLines(null);
    callApi<Cost[]>(`/api/cong-trinh/${projectId}/chi-phi`)
      .then((data) => {
        if (!cancelled) setLines(data.map(tuDong));
      })
      .catch((caught: unknown) => {
        if (!cancelled) setLoadError(caught instanceof Error ? caught.message : "Không tải được chi phí.");
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  function suaDong(key: string, partial: Partial<Line>) {
    setLines((current) => current?.map((line) => line.key === key ? { ...line, ...partial, warn: "", error: "" } : line) ?? current);
  }

  function them() {
    setLoadError("");
    setLines((current) => [dongMoi(defaultPayerId), ...(current ?? [])]);
  }

  async function luu(line: Line) {
    suaDong(line.key, { saving: true, error: "" });
    const body = {
      occurredOn: line.occurredOn,
      category: line.category,
      content: line.content,
      amount: line.amount,
      payerId: line.payerId,
      note: line.note,
      confirm: Boolean(line.warn),
    };
    try {
      const saved = line.id
        ? await callApi<Cost>(`/api/cong-trinh/${projectId}/chi-phi/${line.id}`, { method: "PATCH", body: JSON.stringify(body) })
        : await callApi<Cost>(`/api/cong-trinh/${projectId}/chi-phi`, { method: "POST", body: JSON.stringify(body) });
      const data = await callApi<Cost[]>(`/api/cong-trinh/${projectId}/chi-phi`);
      setLines((current) => {
        const fresh = data.map(tuDong);
        const drafts = (current ?? []).filter((item) => item.key !== line.key && !item.id && item.editing);
        return [...drafts, ...fresh];
      });
      void saved;
    } catch (caught) {
      const thongBao = caught instanceof Error ? caught.message : "Không lưu được.";
      const nghi = Boolean((caught as { details?: { nghiTrung?: boolean } }).details?.nghiTrung);
      setLines((current) => current?.map((item) => item.key === line.key
        ? { ...item, saving: false, warn: nghi ? thongBao : "", error: nghi ? "" : thongBao }
        : item) ?? current);
    }
  }

  async function xoa() {
    if (!pendingDelete) return;
    if (!pendingDelete.id) {
      setLines((current) => current?.filter((item) => item.key !== pendingDelete.key) ?? current);
      setPendingDelete(null);
      return;
    }
    setDeleting(true);
    try {
      await callApi(`/api/cong-trinh/${projectId}/chi-phi/${pendingDelete.id}`, { method: "DELETE" });
      setLines((current) => current?.filter((item) => item.key !== pendingDelete.key) ?? current);
      setPendingDelete(null);
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : "Không xóa được.");
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const tong = (lines ?? []).filter((line) => line.id).reduce((sum, line) => sum + Number(line.amount || 0), 0);
  const daLuu = (lines ?? []).filter((line) => line.id).length;

  const soCot = canEdit ? 7 : 6;

  return (
    <div className="space-y-3">
      {canSeeShared ? <ProjectSharedCosts projectId={projectId} canEdit={canEdit} /> : null}

      {/* Khung giống khối Phụ thu trên đơn đặt hàng. */}
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-soft px-3 py-2">
          <div>
            <p className="text-sm font-semibold text-ink">Chi phí khác</p>
            <p className="text-xs text-muted">
              {lines === null ? "Đang tải..." : `${daLuu} khoản`}
              {daLuu > 0 ? ` · Tổng ${formatVnd(tong)}` : ""}
            </p>
          </div>
          {canEdit ? (
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={them}>
              <Plus className="size-4" aria-hidden />
              Thêm chi phí khác
            </Button>
          ) : null}
        </div>
        {loadError ? <p className="mx-3 mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{loadError}</p> : null}
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="border-b border-line bg-soft text-muted">
              <th className={cn(tieuDe, "w-36")}>Ngày</th>
              <th className={cn(tieuDe, "w-36")}>Nhóm</th>
              <th className={tieuDe}>Nội dung</th>
              <th className={cn(tieuDe, "w-40")}>Người chi</th>
              <th className={cn(tieuDeSo, "w-36")}>Số tiền</th>
              <th className={cn(tieuDe, "w-40")}>Ghi chú</th>
              {canEdit ? <th className={cn(tieuDe, "w-40")}>Thao tác</th> : null}
            </tr>
          </thead>
          <tbody>
            {lines && lines.length === 0 ? (
              <tr>
                <td colSpan={soCot} className="px-3 py-6 text-center text-sm text-muted">Chưa có chi phí khác. Bấm «Thêm chi phí khác».</td>
              </tr>
            ) : null}
            {lines === null ? (
              <tr>
                <td colSpan={soCot} className="px-3 py-8 text-center text-sm text-muted">Đang tải...</td>
              </tr>
            ) : null}
            {lines?.map((line) => (
              <tr key={line.key} className={cn("border-b border-line last:border-0", (line.error || line.warn) && "bg-danger/5")}>
                <td className={o}>
                  {line.editing ? (
                    <NgayNhap value={line.occurredOn} onChange={(value) => suaDong(line.key, { occurredOn: value })} className={oNhap} />
                  ) : <span className={chu}>{ngay(line.occurredOn)}</span>}
                </td>
                <td className={o}>
                  {line.editing ? (
                    <select value={line.category} onChange={(event) => suaDong(line.key, { category: nhomHopLe(event.target.value) })} className={oNhap}>
                      {nhom.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  ) : <span className={chu}>{costCategoryLabel[line.category]}</span>}
                </td>
                <td className={o}>
                  {line.editing ? (
                    <input value={line.content} placeholder="Nội dung chi" onChange={(event) => suaDong(line.key, { content: event.target.value })} className={oNhap} />
                  ) : (
                    <span className={cn(chu, "font-medium")}>
                      {line.content}
                      {line.nghiTrung ? <span className="ml-2 text-xs font-normal text-danger">Nghi trùng 3 ngày</span> : null}
                    </span>
                  )}
                </td>
                <td className={o}>
                  {line.editing ? (
                    <select value={line.payerId} onChange={(event) => suaDong(line.key, { payerId: event.target.value })} className={oNhap}>
                      <option value="">Chọn</option>
                      {staff.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  ) : <span className={chu}>{staff.find((item) => item.id === line.payerId)?.name || "—"}</span>}
                </td>
                <td className={o}>
                  {line.editing ? (
                    <input
                      value={line.amount ? formatCount(Number(line.amount)) : ""}
                      inputMode="numeric"
                      placeholder="0"
                      onChange={(event) => suaDong(line.key, { amount: digitsVnd(event.target.value) })}
                      className={cn(oNhap, "text-right tabular-nums")}
                    />
                  ) : <span className={chuPhai}>{line.amount ? formatVnd(Number(line.amount)) : "—"}</span>}
                </td>
                <td className={o}>
                  {line.editing ? (
                    <input value={line.note} placeholder="Ghi chú" onChange={(event) => suaDong(line.key, { note: event.target.value })} className={oNhap} />
                  ) : <span className={chu}>{line.note || "—"}</span>}
                </td>
                {canEdit ? (
                  <td className={o}>
                    <div className="flex h-9 flex-nowrap items-center gap-1.5 px-2">
                      {line.editing ? (
                        <ActionBadge tone="primary" className="shrink-0" disabled={line.saving} onClick={() => void luu(line)}>
                          <Save className="size-3.5" aria-hidden />
                          {line.saving ? "Đang lưu" : line.warn ? "Vẫn lưu" : "Lưu"}
                        </ActionBadge>
                      ) : (
                        <ActionBadge className="shrink-0" onClick={() => suaDong(line.key, { editing: true })}>
                          <Pencil className="size-3.5" aria-hidden /> Sửa
                        </ActionBadge>
                      )}
                      <button
                        type="button"
                        disabled={line.saving}
                        onClick={() => setPendingDelete(line)}
                        className="flex h-8 items-center gap-1 px-2 text-xs font-semibold text-danger hover:bg-danger/10 disabled:opacity-40"
                      >
                        <Trash2 className="size-3.5" aria-hidden /> Xóa
                      </button>
                    </div>
                    {line.warn ? <p className="px-2 pb-1 text-xs text-danger">{line.warn}</p> : null}
                    {line.error ? <p className="px-2 pb-1 text-xs text-danger">{line.error}</p> : null}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(next) => { if (!next && !deleting) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa chi phí</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? `${pendingDelete.code || "Dòng mới"} · ${pendingDelete.content || "chưa có nội dung"} sẽ bị xóa.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" disabled={deleting} onClick={() => setPendingDelete(null)}><X className="size-4" aria-hidden /> Đóng</Button>
            <Button type="button" variant="destructive" disabled={deleting} onClick={() => void xoa()}><Trash2 className="size-4" aria-hidden /> {deleting ? "Đang xóa" : "Xóa"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
