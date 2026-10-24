"use client";

import { useEffect, useState, type RefObject } from "react";
import { callApi } from "@/shared/client/api";
import { NgayNhap } from "@/shared/components/ngay-nhap";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { todayYmd } from "@/shared/lib/dates";
import { digitsVnd, formatCount, formatVnd } from "@/shared/lib/money";
import { costCategoryLabel, type CostCategory } from "@/modules/projects/cost-fields";

function ngay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "—";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

const oNhap = "h-9 w-full bg-transparent px-0 text-sm text-ink outline-none";

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

export type ChiPhiActions = { add: () => void };

export function ProjectCosts({
  projectId,
  staff,
  canEdit,
  defaultPayerId,
  addCostRef,
}: {
  projectId: string;
  staff: Staff[];
  canEdit: boolean;
  defaultPayerId: string;
  addCostRef: RefObject<ChiPhiActions | null>;
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

  addCostRef.current = canEdit ? { add: them } : null;

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

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        {lines ? `${daLuu} khoản.` : "Đang tải chi phí..."}
        {daLuu > 0 ? ` Tổng ${formatVnd(tong)}.` : ""}
      </p>
      {loadError ? <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{loadError}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-soft hover:bg-soft">
              <TableHead className="w-36">Ngày</TableHead>
              <TableHead className="w-36">Nhóm</TableHead>
              <TableHead>Nội dung</TableHead>
              <TableHead className="w-40">Người chi</TableHead>
              <TableHead className="w-36 text-right">Số tiền</TableHead>
              <TableHead className="w-40">Ghi chú</TableHead>
              {canEdit ? <TableHead className="w-40 whitespace-nowrap">Thao tác</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines && lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 7 : 6} className="py-10 text-center text-sm text-muted">Chưa có chi phí.</TableCell>
              </TableRow>
            ) : null}
            {lines?.map((line) => (
              <TableRow key={line.key} className={line.error || line.warn ? "bg-danger/5" : undefined}>
                <TableCell>
                  {line.editing ? (
                    <NgayNhap value={line.occurredOn} onChange={(value) => suaDong(line.key, { occurredOn: value })} className={oNhap} />
                  ) : ngay(line.occurredOn)}
                </TableCell>
                <TableCell>
                  {line.editing ? (
                    <select value={line.category} onChange={(event) => suaDong(line.key, { category: nhomHopLe(event.target.value) })} className={oNhap}>
                      {nhom.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  ) : costCategoryLabel[line.category]}
                </TableCell>
                <TableCell>
                  {line.editing ? (
                    <input value={line.content} placeholder="Nội dung chi" onChange={(event) => suaDong(line.key, { content: event.target.value })} className={oNhap} />
                  ) : <span className="font-medium text-ink">{line.content}</span>}
                  {line.nghiTrung && !line.editing ? <p className="mt-1 text-xs text-danger">Nghi trùng trong 3 ngày</p> : null}
                </TableCell>
                <TableCell>
                  {line.editing ? (
                    <select value={line.payerId} onChange={(event) => suaDong(line.key, { payerId: event.target.value })} className={oNhap}>
                      <option value="">Chọn</option>
                      {staff.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  ) : (staff.find((item) => item.id === line.payerId)?.name || "—")}
                </TableCell>
                <TableCell className="text-right">
                  {line.editing ? (
                    <input
                      value={line.amount ? formatCount(Number(line.amount)) : ""}
                      inputMode="numeric"
                      placeholder="0"
                      onChange={(event) => suaDong(line.key, { amount: digitsVnd(event.target.value) })}
                      className={`${oNhap} text-right tabular-nums`}
                    />
                  ) : <span className="font-semibold tabular-nums">{line.amount ? formatVnd(Number(line.amount)) : "—"}</span>}
                </TableCell>
                <TableCell>
                  {line.editing ? (
                    <input value={line.note} placeholder="Ghi chú" onChange={(event) => suaDong(line.key, { note: event.target.value })} className={oNhap} />
                  ) : (line.note || "—")}
                </TableCell>
                {canEdit ? (
                  <TableCell>
                    <div className="flex flex-nowrap items-center gap-1">
                      {line.editing ? (
                        <Button type="button" size="sm" className="shrink-0" disabled={line.saving} onClick={() => void luu(line)}>{line.saving ? "Đang lưu" : line.warn ? "Vẫn lưu" : "Lưu"}</Button>
                      ) : (
                        <Button type="button" size="sm" variant="ghost" className="shrink-0" onClick={() => suaDong(line.key, { editing: true })}>Sửa</Button>
                      )}
                      <Button type="button" size="sm" variant="ghost" className="shrink-0 text-danger" disabled={line.saving} onClick={() => setPendingDelete(line)}>Xóa</Button>
                    </div>
                    {line.warn ? <p className="mt-1 text-xs text-danger">{line.warn}</p> : null}
                    {line.error ? <p className="mt-1 text-xs text-danger">{line.error}</p> : null}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
            <Button type="button" variant="outline" disabled={deleting} onClick={() => setPendingDelete(null)}>Đóng</Button>
            <Button type="button" variant="destructive" disabled={deleting} onClick={() => void xoa()}>{deleting ? "Đang xóa" : "Xóa"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
