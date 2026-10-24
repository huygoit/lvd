"use client";

import { Fragment, useEffect, useRef, useState, type FocusEvent, type PointerEvent as SuKienChuot, type RefObject } from "react";
import { measureUnits } from "@/shared/catalog/units";
import { callApi } from "@/shared/client/api";
import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import {
  formatQuantityMilli,
  formatUnitPrice,
  hangMucAmount,
  parseQuantityMilli,
  parseUnitPrice,
} from "@/modules/projects/item-fields";

type Staff = { id: string; name: string };

type Item = {
  id: string;
  sortOrder: number;
  name: string;
  spec: string;
  unit: string;
  quantityMilli: number;
  unitPrice: number;
  amount: number;
  ownerId: string;
  ownerName: string;
  note: string;
};

type Line = {
  key: string;
  id: string;
  sortOrder: string;
  name: string;
  spec: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  ownerId: string;
  note: string;
  saved: string;
  status: "" | "saving" | "saved" | "error";
  message: string;
};

const cellClass = "w-full rounded-md border border-transparent bg-transparent px-0 py-1.5 text-sm text-ink outline-none placeholder:text-muted/70 hover:border-line focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20";
const valueClass = "block rounded-md border border-transparent px-0 py-1.5 text-sm leading-5";
const caoToiThieu = 58;
// Tạm ẩn cột phụ trách. Khi lưu vẫn gắn người phụ trách của công trình.
const hienPhuTrach = false;

function picture(line: Pick<Line, "sortOrder" | "name" | "spec" | "unit" | "quantity" | "unitPrice" | "ownerId" | "note">) {
  return JSON.stringify({
    sortOrder: line.sortOrder.trim(),
    name: line.name.trim(),
    spec: line.spec.trim(),
    unit: line.unit,
    quantity: line.quantity.trim(),
    unitPrice: line.unitPrice.trim(),
    ownerId: line.ownerId,
    note: line.note.trim(),
  });
}

function fromItem(row: Item): Line {
  const line: Line = {
    key: row.id,
    id: row.id,
    sortOrder: String(row.sortOrder),
    name: row.name,
    spec: row.spec,
    unit: row.unit,
    quantity: formatQuantityMilli(row.quantityMilli),
    unitPrice: row.unitPrice ? formatUnitPrice(row.unitPrice) : "",
    ownerId: row.ownerId,
    note: row.note,
    saved: "",
    status: "",
    message: "",
  };
  line.saved = picture(line);
  return line;
}

function blankLine(order: number, ownerId: string): Line {
  const line: Line = {
    key: `moi-${order}-${Date.now()}`,
    id: "",
    sortOrder: String(order),
    name: "",
    spec: "",
    unit: "m2",
    quantity: "",
    unitPrice: "",
    ownerId,
    note: "",
    saved: "",
    status: "",
    message: "",
  };
  line.saved = picture(line);
  return line;
}

function nextOrder(lines: Line[]) {
  const numbers = lines.map((line) => Number(line.sortOrder)).filter((value) => Number.isInteger(value) && value > 0);
  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
}

function amountOf(line: Line) {
  const amount = lineAmount(line);
  return amount === null ? "—" : formatUnitPrice(amount);
}

function lineAmount(line: Line) {
  try {
    if (!line.quantity.trim() && !line.unitPrice.trim()) return null;
    const quantity = line.quantity.trim() ? parseQuantityMilli(line.quantity) : 0;
    return hangMucAmount(parseUnitPrice(line.unitPrice), quantity);
  } catch {
    return null;
  }
}

function tongTruocThue(lines: Line[]) {
  let tong = 0;
  for (const line of lines) {
    if (isBlank(line)) continue;
    const amount = lineAmount(line);
    if (amount !== null) tong += amount;
  }
  return tong;
}

// Tiền thuế GTGT, làm tròn đồng. Chưa nhập thuế trên công trình thì không tính.
function tienThue(truocThue: number, vatPercent: number | null) {
  if (vatPercent === null) return null;
  return Math.round((truocThue * vatPercent) / 100);
}

function isBlank(line: Line) {
  return !line.id && !line.name.trim() && !line.spec.trim() && !line.quantity.trim() && !line.unitPrice.trim() && !line.note.trim();
}

export type HangMucActions = {
  add: () => void;
  copy: () => void;
};

export function ProjectItems({
  projectId,
  defaultOwnerId,
  staff,
  canEdit,
  addLineRef,
  vatPercent,
  onSauThue,
}: {
  projectId: string;
  defaultOwnerId: string;
  staff: Staff[];
  canEdit: boolean;
  addLineRef: RefObject<HangMucActions | null>;
  vatPercent: number | null;
  onSauThue: (value: number | null) => void;
}) {
  const [lines, setLines] = useState<Line[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Line | null>(null);
  const [copyHint, setCopyHint] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const [baoLuu, setBaoLuu] = useState(false);
  const henTat = useRef<number | null>(null);
  const linesRef = useRef<Line[] | null>(null);
  const rowHeightsRef = useRef(rowHeights);
  const ngungKeo = useRef<(() => void) | null>(null);
  rowHeightsRef.current = rowHeights;
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const savingKeys = useRef(new Set<string>());
  linesRef.current = lines;

  useEffect(() => {
    let cancelled = false;
    setLines(null);
    setRowHeights({});
    callApi<Item[]>(`/api/cong-trinh/${projectId}/hang-muc`)
      .then((data) => {
        if (cancelled) return;
        setLines(data.map(fromItem));
        setLoadError("");
      })
      .catch((caught: unknown) => {
        if (!cancelled) setLoadError(caught instanceof Error ? caught.message : "Không tải được hạng mục.");
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, canEdit, defaultOwnerId]);

  useEffect(() => {
    if (!lines) {
      onSauThue(null);
      return;
    }
    const truoc = tongTruocThue(lines);
    const thue = tienThue(truoc, vatPercent);
    onSauThue(thue === null ? null : truoc + thue);
  }, [lines, vatPercent, onSauThue]);

  useEffect(() => () => onSauThue(null), [onSauThue]);

  useEffect(() => () => {
    if (henTat.current) window.clearTimeout(henTat.current);
  }, []);

  function baoThanhCong() {
    setBaoLuu(true);
    if (henTat.current) window.clearTimeout(henTat.current);
    henTat.current = window.setTimeout(() => setBaoLuu(false), 2000);
  }

  useEffect(() => {
    return () => {
      ngungKeo.current?.();
      for (const line of linesRef.current ?? []) commit(line.key);
    };
  }, [projectId]);

  function keoCao(key: string, event: SuKienChuot<HTMLDivElement>) {
    event.preventDefault();
    const row = rowRefs.current[key];
    const o = row?.querySelector("textarea, p");
    const startY = event.clientY;
    const startH = rowHeightsRef.current[key] ?? o?.getBoundingClientRect().height ?? caoToiThieu;
    function move(ev: PointerEvent) {
      const next = Math.max(caoToiThieu, Math.round(startH + ev.clientY - startY));
      const heights = { ...rowHeightsRef.current, [key]: next };
      rowHeightsRef.current = heights;
      setRowHeights(heights);
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (ngungKeo.current === up) ngungKeo.current = null;
    }
    ngungKeo.current?.();
    ngungKeo.current = up;
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function patch(key: string, partial: Partial<Line>) {
    setLines((current) => {
      if (!current) return current;
      const next = current.map((line) => line.key === key ? { ...line, ...partial, status: "" as const, message: "" } : line);
      linesRef.current = next;
      return next;
    });
  }

  function commit(key: string) {
    const line = linesRef.current?.find((item) => item.key === key);
    if (!line || line.status === "saving" || savingKeys.current.has(key) || picture(line) === line.saved || isBlank(line)) return;
    savingKeys.current.add(key);
    const payload = {
      sortOrder: line.sortOrder,
      name: line.name,
      spec: line.spec,
      unit: line.unit,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      ownerId: line.ownerId,
      note: line.note,
    };
    setLines((current) => current?.map((item) => item.key === key ? { ...item, status: "saving", message: "" } : item) ?? current);
    const request = line.id
      ? callApi<Item>(`/api/cong-trinh/${projectId}/hang-muc/${line.id}`, { method: "PATCH", body: JSON.stringify(payload) })
      : callApi<Item>(`/api/cong-trinh/${projectId}/hang-muc`, { method: "POST", body: JSON.stringify(payload) });
    request.then((saved) => {
      savingKeys.current.delete(key);
      setLines((current) => {
        if (!current) return current;
        const fresh = fromItem(saved);
        fresh.key = key;
        fresh.status = "saved";
        const next = current.map((item) => item.key === key ? fresh : item);
        linesRef.current = next;
        return next;
      });
      baoThanhCong();
    }).catch((caught: unknown) => {
      savingKeys.current.delete(key);
      const message = caught instanceof Error ? caught.message : "Không lưu được.";
      setLines((current) => current?.map((item) => item.key === key ? { ...item, status: "error", message } : item) ?? current);
    });
  }

  function leaveRow(key: string, event: { relatedTarget: EventTarget | null }) {
    const next = event.relatedTarget;
    const row = rowRefs.current[key];
    if (row && next instanceof Node && row.contains(next)) return;
    commit(key);
  }

  async function remove() {
    if (!pendingDelete) return;
    if (!pendingDelete.id) {
      setLines((current) => {
        const next = (current ?? []).filter((line) => line.key !== pendingDelete.key);
        linesRef.current = next;
        return next;
      });
      setPendingDelete(null);
      return;
    }
    setDeleting(true);
    try {
      await callApi(`/api/cong-trinh/${projectId}/hang-muc/${pendingDelete.id}`, { method: "DELETE" });
      setLines((current) => {
        const next = (current ?? []).filter((line) => line.key !== pendingDelete.key);
        linesRef.current = next;
        return next;
      });
      setPendingDelete(null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Không xóa được.";
      setLines((current) => current?.map((line) => line.key === pendingDelete.key ? { ...line, status: "error", message } : line) ?? current);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  function reveal(line: Line) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const row = rowRefs.current[line.key];
        row?.scrollIntoView({ block: "end", behavior: "smooth" });
        const field = row?.querySelector("textarea");
        if (field instanceof HTMLTextAreaElement) field.focus({ preventScroll: true });
      });
    });
  }

  function pushLine(line: Line) {
    setLines((current) => {
      const next = [...(current ?? []), line];
      linesRef.current = next;
      return next;
    });
    reveal(line);
  }

  function addLine() {
    setCopyHint("");
    pushLine(blankLine(nextOrder(linesRef.current ?? []), defaultOwnerId));
  }

  function copyLine() {
    const source = linesRef.current?.at(-1);
    if (!source) {
      setCopyHint("Chưa có hạng mục phía trên để copy.");
      return;
    }
    const line = blankLine(nextOrder(linesRef.current ?? []), source.ownerId);
    line.name = source.name;
    line.spec = source.spec;
    line.unit = source.unit;
    line.quantity = source.quantity;
    line.unitPrice = source.unitPrice;
    line.note = source.note;
    setCopyHint("");
    pushLine(line);
  }

  addLineRef.current = canEdit ? { add: addLine, copy: copyLine } : null;

  const savedCount = lines?.filter((line) => line.id).length ?? 0;
  const soCot = 8 + (hienPhuTrach ? 1 : 0) + (canEdit ? 1 : 0);
  const cotTruocTien = 6;
  const cotSauTien = soCot - cotTruocTien - 1;
  const truocThue = lines ? tongTruocThue(lines) : null;
  const thue = truocThue === null ? null : tienThue(truocThue, vatPercent);
  const sauThue = truocThue === null || thue === null ? null : truocThue + thue;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        {lines ? `${savedCount} hạng mục.` : "Đang tải hạng mục..."}
        {canEdit ? " Gõ thẳng trên bảng, rời dòng là lưu." : ""}
      </p>
      {copyHint ? <p className="text-sm text-danger" role="alert">{copyHint}</p> : null}
      {loadError ? <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{loadError}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="bg-soft hover:bg-soft">
              <TableHead className="w-12 px-1 text-center">STT</TableHead>
              <TableHead className="w-[30%]">Nội dung</TableHead>
              <TableHead className="w-[34%]">Quy cách</TableHead>
              <TableHead className="w-24">Đơn vị</TableHead>
              <TableHead className="w-24 text-right">Khối lượng</TableHead>
              <TableHead className="w-28 text-right">Đơn giá</TableHead>
              <TableHead className="w-32 text-right">Thành tiền</TableHead>
              {hienPhuTrach ? <TableHead className="w-40">Phụ trách</TableHead> : null}
              <TableHead className="w-36">Ghi chú</TableHead>
              {canEdit ? <TableHead className="w-16 px-1" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines && lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={soCot} className="py-8 text-center text-sm text-muted">Chưa có hạng mục.</TableCell>
              </TableRow>
            ) : null}
            {lines?.map((line) => {
              const blur = (event: FocusEvent) => leaveRow(line.key, event);
              const hopCao = rowHeights[line.key] ? { height: rowHeights[line.key] } : undefined;
              return (
              <Fragment key={line.key}>
              <TableRow
                ref={(node) => { rowRefs.current[line.key] = node; }}
                className={line.status === "error" ? "relative bg-danger/5" : "relative"}
              >
                <TableCell className="px-1 align-top text-center">
                  <span className={`${valueClass} text-center tabular-nums`}>{line.sortOrder}</span>
                  <div
                    role="separator"
                    aria-orientation="horizontal"
                    aria-label="Kéo để đổi chiều cao hàng"
                    onPointerDown={(event) => keoCao(line.key, event)}
                    className="absolute inset-x-0 bottom-0 z-20 h-2 cursor-ns-resize hover:bg-primary/40"
                  />
                </TableCell>
                <TableCell className="align-top">
                  {canEdit ? (
                    <textarea value={line.name} rows={2} placeholder="Thêm nội dung..." onChange={(event) => patch(line.key, { name: event.target.value })} onBlur={blur} style={hopCao} className={`${cellClass} resize-none overflow-y-auto`} />
                  ) : <p style={hopCao} className="overflow-y-auto whitespace-pre-line font-medium text-ink">{line.name}</p>}
                </TableCell>
                <TableCell className="align-top">
                  {canEdit ? (
                    <textarea value={line.spec} rows={2} placeholder="Mã hiệu, tiêu chuẩn..." onChange={(event) => patch(line.key, { spec: event.target.value })} onBlur={blur} style={hopCao} className={`${cellClass} resize-none overflow-y-auto`} />
                  ) : <p style={hopCao} className="overflow-y-auto whitespace-pre-line text-sm text-muted">{line.spec || "—"}</p>}
                </TableCell>
                <TableCell className="align-top">
                  {canEdit ? (
                    <select value={line.unit} onChange={(event) => patch(line.key, { unit: event.target.value })} onBlur={blur} className={`${cellClass} pr-6`}>
                      {measureUnits.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                    </select>
                  ) : line.unit}
                </TableCell>
                <TableCell className="align-top">
                  {canEdit ? (
                    <input value={line.quantity} inputMode="decimal" onChange={(event) => patch(line.key, { quantity: event.target.value })} onBlur={blur} className={`${cellClass} text-right`} />
                  ) : <span className={`${valueClass} text-right tabular-nums`}>{line.quantity}</span>}
                </TableCell>
                <TableCell className="align-top">
                  {canEdit ? (
                    <input value={line.unitPrice} inputMode="numeric" onChange={(event) => patch(line.key, { unitPrice: event.target.value })} onBlur={blur} className={`${cellClass} text-right`} />
                  ) : <span className={`${valueClass} text-right tabular-nums`}>{line.unitPrice || "0"}</span>}
                </TableCell>
                <TableCell className="align-top text-right font-medium text-ink">
                  <span className={`${valueClass} text-right tabular-nums`}>{amountOf(line)}</span>
                </TableCell>
                {hienPhuTrach ? (
                  <TableCell className="align-top">
                    {canEdit ? (
                      <select value={line.ownerId} onChange={(event) => patch(line.key, { ownerId: event.target.value })} onBlur={blur} className={cellClass}>
                        <option value="">Chọn</option>
                        {staff.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    ) : (staff.find((item) => item.id === line.ownerId)?.name || "—")}
                  </TableCell>
                ) : null}
                <TableCell className="align-top">
                  {canEdit ? (
                    <textarea value={line.note} rows={2} placeholder="Ghi chú" onChange={(event) => patch(line.key, { note: event.target.value })} onBlur={blur} style={hopCao} className={`${cellClass} resize-none overflow-y-auto`} />
                  ) : <p style={hopCao} className="overflow-y-auto whitespace-pre-line text-sm">{line.note || "—"}</p>}
                </TableCell>
                {canEdit ? (
                  <TableCell className="w-16 px-0 align-top">
                    <Button type="button" size="sm" variant="ghost" className="text-danger" onClick={() => setPendingDelete(line)}>Xóa</Button>
                    {line.status === "saving" ? <p className="px-2 text-xs text-muted">Đang lưu</p> : null}
                  </TableCell>
                ) : null}
              </TableRow>
              {line.status === "error" ? (
                <TableRow className="bg-danger/5 hover:bg-danger/5">
                  <TableCell colSpan={soCot} className="py-2 text-sm text-danger" role="alert">{line.message}</TableCell>
                </TableRow>
              ) : null}
              </Fragment>
              );
            })}
          </TableBody>
          {truocThue !== null ? (
            <TableFooter>
              <TableRow className="hover:bg-soft">
                <TableCell colSpan={cotTruocTien} className="text-right text-muted">Tổng cộng trước thuế</TableCell>
                <TableCell className="text-right font-semibold text-ink">
                  <span className={`${valueClass} text-right tabular-nums`}>{formatUnitPrice(truocThue)}</span>
                </TableCell>
                <TableCell colSpan={cotSauTien} />
              </TableRow>
              <TableRow className="hover:bg-soft">
                <TableCell colSpan={cotTruocTien} className="text-right text-muted">
                  {vatPercent === null ? "Thuế GTGT (VAT)" : `Thuế GTGT (VAT) ${vatPercent}%`}
                </TableCell>
                <TableCell className="text-right font-medium text-ink">
                  <span className={`${valueClass} text-right tabular-nums`}>{thue === null ? "—" : formatUnitPrice(thue)}</span>
                </TableCell>
                <TableCell colSpan={cotSauTien} />
              </TableRow>
              <TableRow className="hover:bg-soft">
                <TableCell colSpan={cotTruocTien} className="text-right font-semibold text-ink">Tổng cộng sau thuế</TableCell>
                <TableCell className="text-right font-semibold text-ink">
                  <span className={`${valueClass} text-right tabular-nums`}>{sauThue === null ? "—" : formatUnitPrice(sauThue)}</span>
                </TableCell>
                <TableCell colSpan={cotSauTien} />
              </TableRow>
            </TableFooter>
          ) : null}
        </Table>
      </div>

      {baoLuu ? (
        <p role="status" className="pointer-events-none fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[linear-gradient(135deg,#047857_0%,#059669_55%,#34d399_100%)] px-5 py-2.5 text-sm font-medium text-white shadow-[0_10px_24px_rgba(4,120,87,0.35)]">
          Lưu hạng mục thành công !
        </p>
      ) : null}

      <AlertDialog open={pendingDelete !== null} onOpenChange={(next) => { if (!next) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa hạng mục</AlertDialogTitle>
            <AlertDialogDescription>Hạng mục số {pendingDelete?.sortOrder} sẽ bị xóa khỏi công trình này.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingDelete(null)} disabled={deleting}>Hủy</Button>
            <Button type="button" onClick={() => void remove()} disabled={deleting}>Xóa</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
