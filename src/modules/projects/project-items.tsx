"use client";

import { Fragment, useEffect, useRef, useState, type FocusEvent, type PointerEvent as SuKienChuot, type RefObject } from "react";
import { isMeasureUnit, measureUnits } from "@/shared/catalog/units";
import { Copy, GripVertical, Percent, Plus, Trash2, Wallet, X } from "lucide-react";
import { callApi } from "@/shared/client/api";
import { listPanelClass } from "@/shared/components/action-badge";
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
import { formatUnitPrice } from "@/modules/projects/item-fields";
import {
  docHangMucTuExcel,
  nhanBacDonGia,
} from "@/modules/projects/import-hang-muc-excel";
import {
  areaFromSizeMilli,
  formatAreaMilli,
  priceItem,
  type AccessoryInput,
} from "@/modules/quotations/calc";
import { digitsVnd, formatCount } from "@/shared/lib/money";
import { cn } from "@/shared/lib/cn";

type Staff = { id: string; name: string };

type Item = {
  id: string;
  sortOrder: number;
  kind: "item" | "nhom";
  symbol: string;
  name: string;
  spec: string;
  unit: string;
  widthMm: number | null;
  heightMm: number | null;
  quantity: number;
  quantityMilli: number;
  areaText: string;
  unitPrice: number;
  accessories: AccessoryInput[];
  amount: number;
  ownerId: string;
  ownerName: string;
  note: string;
};

type PhuKienDong = {
  key: string;
  name: string;
  unit: string;
  quantity: string;
  unitPrice: string;
};

type Line = {
  key: string;
  id: string;
  sortOrder: string;
  kind: "item" | "nhom";
  symbol: string;
  name: string;
  spec: string;
  unit: string;
  widthMm: string;
  heightMm: string;
  quantity: string;
  areaOverride: string;
  unitPrice: string;
  accessories: PhuKienDong[];
  ownerId: string;
  note: string;
  saved: string;
  status: "" | "saving" | "saved" | "error";
  message: string;
};

const cellClass =
  "w-full rounded-md border border-transparent bg-transparent px-0 py-1.5 text-sm text-ink outline-none placeholder:text-muted/70 hover:border-line focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20";
const valueClass = "block rounded-md border border-transparent px-0 py-1.5 text-sm leading-5";
const caoToiThieu = 58;

function blankPhuKien(quantity = "1"): PhuKienDong {
  return { key: crypto.randomUUID(), name: "", unit: "bộ", quantity, unitPrice: "" };
}

function fromAccessories(rows: AccessoryInput[] | undefined): PhuKienDong[] {
  return (rows ?? []).map((row) => ({
    key: crypto.randomUUID(),
    name: row.name ?? "",
    unit: row.unit || "bộ",
    quantity: String(row.quantity || ""),
    unitPrice: row.unitPrice ? formatCount(row.unitPrice) : "",
  }));
}

function picture(line: Line) {
  return JSON.stringify({
    sortOrder: line.sortOrder.trim(),
    kind: line.kind,
    symbol: line.symbol.trim(),
    name: line.name.trim(),
    spec: line.spec.trim(),
    unit: line.unit,
    widthMm: line.widthMm.trim(),
    heightMm: line.heightMm.trim(),
    quantity: line.quantity.trim(),
    areaOverride: line.areaOverride.trim(),
    unitPrice: line.unitPrice.trim(),
    accessories: line.accessories.map((pk) => ({
      name: pk.name.trim(),
      unit: pk.unit,
      quantity: pk.quantity.trim(),
      unitPrice: pk.unitPrice.trim(),
    })),
    ownerId: line.ownerId,
    note: line.note.trim(),
  });
}

function fromItem(row: Item): Line {
  const line: Line = {
    key: row.id,
    id: row.id,
    sortOrder: String(row.sortOrder),
    kind: row.kind === "nhom" ? "nhom" : "item",
    symbol: row.symbol ?? "",
    name: row.name,
    spec: row.spec,
    unit: row.unit,
    widthMm: row.widthMm ? String(row.widthMm) : "",
    heightMm: row.heightMm ? String(row.heightMm) : "",
    quantity: row.quantity ? String(row.quantity) : "",
    areaOverride: row.areaText || (row.quantityMilli ? formatAreaMilli(row.quantityMilli) : ""),
    unitPrice: row.unitPrice ? formatCount(row.unitPrice) : "",
    accessories: fromAccessories(row.accessories),
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
    kind: "item",
    symbol: "",
    name: "",
    spec: "",
    unit: "bộ",
    widthMm: "",
    heightMm: "",
    quantity: "1",
    areaOverride: "",
    unitPrice: "",
    accessories: [],
    ownerId,
    note: "",
    saved: "",
    status: "",
    message: "",
  };
  line.saved = picture(line);
  return line;
}

function blankGroup(order: number, ownerId: string): Line {
  const line: Line = {
    key: `nhom-${order}-${Date.now()}`,
    id: "",
    sortOrder: String(order),
    kind: "nhom",
    symbol: "",
    name: "",
    spec: "",
    unit: "bộ",
    widthMm: "",
    heightMm: "",
    quantity: "",
    areaOverride: "",
    unitPrice: "",
    accessories: [],
    ownerId,
    note: "",
    saved: "",
    status: "",
    message: "",
  };
  line.saved = picture(line);
  return line;
}

/** Kéo hạng mục vào cuối nhóm, hoặc chèn trước dòng đích — giống báo giá. */
function chuyenHangMuc(lines: Line[], fromKey: string, targetKey: string) {
  if (fromKey === targetKey) return lines;
  const fromIdx = lines.findIndex((line) => line.key === fromKey && line.kind === "item");
  if (fromIdx < 0) return lines;
  const item = lines[fromIdx];
  const without = [...lines.slice(0, fromIdx), ...lines.slice(fromIdx + 1)];
  const target = without.find((line) => line.key === targetKey);
  if (!target) return lines;

  if (target.kind === "nhom") {
    const gIdx = without.findIndex((line) => line.key === targetKey);
    let end = gIdx + 1;
    while (end < without.length && without[end].kind !== "nhom") end += 1;
    return [...without.slice(0, end), item, ...without.slice(end)];
  }

  const tIdx = without.findIndex((line) => line.key === targetKey);
  if (tIdx < 0) return lines;
  return [...without.slice(0, tIdx), item, ...without.slice(tIdx)];
}

function ganThuTu(list: Line[]): Line[] {
  return list.map((line, index) => {
    const sortOrder = String(index + 1);
    if (line.sortOrder === sortOrder) return line;
    return { ...line, sortOrder, status: "" as const, message: "" };
  });
}

function nextOrder(lines: Line[]) {
  const numbers = lines.map((line) => Number(line.sortOrder)).filter((value) => Number.isInteger(value) && value > 0);
  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
}

function money(value: string) {
  const digits = digitsVnd(value);
  return digits ? Number(digits) : 0;
}

function lineAmount(line: Line) {
  if (line.kind === "nhom") return null;
  try {
    const width = line.widthMm.trim() ? Number(line.widthMm) : null;
    const height = line.heightMm.trim() ? Number(line.heightMm) : null;
    const qty = line.quantity.trim() ? Number(line.quantity) : 0;
    const area = line.areaOverride.trim() ? Number(line.areaOverride.replace(",", ".")) : null;
    const accessories = line.accessories
      .map((pk) => ({
        name: pk.name.trim(),
        unit: pk.unit,
        quantity: Number(pk.quantity || "0"),
        unitPrice: money(pk.unitPrice),
      }))
      .filter((pk) => pk.name || pk.quantity || pk.unitPrice);
    const priced = priceItem({
      name: line.name || "x",
      quantity: qty > 0 ? qty : 1,
      mainUnitPrice: money(line.unitPrice),
      widthMm: area != null && area > 0 ? null : width,
      heightMm: area != null && area > 0 ? null : height,
      areaOverride: area != null && area > 0 ? area : null,
      accessories,
    });
    return priced.pretax;
  } catch {
    return null;
  }
}

function amountOf(line: Line) {
  const amount = lineAmount(line);
  return amount === null ? "—" : formatCount(amount);
}

function khoiLuongHienThi(line: Line) {
  if (line.areaOverride.trim()) return line.areaOverride.trim();
  const width = Number(line.widthMm);
  const height = Number(line.heightMm);
  const qty = Number(line.quantity);
  if (width > 0 && height > 0 && qty > 0) return formatAreaMilli(areaFromSizeMilli(width, height, qty));
  return "";
}

function tongTruocThue(lines: Line[]) {
  let tong = 0;
  for (const line of lines) {
    if (isBlank(line) || line.kind === "nhom") continue;
    const amount = lineAmount(line);
    if (amount !== null) tong += amount;
  }
  return tong;
}

function tienThue(truocThue: number, vatPercent: number | null) {
  if (vatPercent === null) return null;
  return Math.round((truocThue * vatPercent) / 100);
}

function isBlank(line: Line) {
  if (line.kind === "nhom") return !line.id && !line.name.trim();
  return (
    !line.id &&
    !line.symbol.trim() &&
    !line.name.trim() &&
    !line.widthMm.trim() &&
    !line.heightMm.trim() &&
    !line.quantity.trim() &&
    !line.areaOverride.trim() &&
    !line.unitPrice.trim() &&
    line.accessories.every((pk) => !pk.name.trim() && !pk.quantity.trim() && !pk.unitPrice.trim())
  );
}

export type HangMucActions = {
  add: () => void;
  addGroup: () => void;
  copy: () => void;
  importFile: () => void;
  importPhuLuc: () => void;
};

export function ProjectItems({
  projectId,
  defaultOwnerId,
  staff,
  canEdit,
  addLineRef,
  vatPercent,
}: {
  projectId: string;
  defaultOwnerId: string;
  staff: Staff[];
  canEdit: boolean;
  addLineRef: RefObject<HangMucActions | null>;
  vatPercent: number | null;
}) {
  const [lines, setLines] = useState<Line[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Line | null>(null);
  const [copyHint, setCopyHint] = useState("");
  const [importHint, setImportHint] = useState("");
  const [dangNapFile, setDangNapFile] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const [moPhuKien, setMoPhuKien] = useState<Record<string, boolean>>({});
  const [keoHangMucKey, setKeoHangMucKey] = useState("");
  const [neoThaKey, setNeoThaKey] = useState("");
  const [baoLuu, setBaoLuu] = useState(false);
  const henTat = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const cheDoNapRef = useRef<"thay_the" | "phu_luc">("thay_the");
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
    setMoPhuKien({});
    callApi<Item[]>(`/api/cong-trinh/${projectId}/hang-muc`)
      .then((data) => {
        if (cancelled) return;
        setLines(data.map(fromItem));
        const mo: Record<string, boolean> = {};
        for (const row of data) {
          if ((row.accessories?.length ?? 0) > 0) mo[row.id] = true;
        }
        setMoPhuKien(mo);
        setLoadError("");
      })
      .catch((caught: unknown) => {
        if (!cancelled) setLoadError(caught instanceof Error ? caught.message : "Không tải được hạng mục.");
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, canEdit, defaultOwnerId]);

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
      const next = current.map((line) => (line.key === key ? { ...line, ...partial, status: "" as const, message: "" } : line));
      linesRef.current = next;
      return next;
    });
  }

  function patchPhuKien(lineKey: string, pkKey: string, partial: Partial<PhuKienDong>) {
    setLines((current) => {
      if (!current) return current;
      const next = current.map((line) =>
        line.key !== lineKey
          ? line
          : {
              ...line,
              status: "" as const,
              message: "",
              accessories: line.accessories.map((pk) => (pk.key === pkKey ? { ...pk, ...partial } : pk)),
            },
      );
      linesRef.current = next;
      return next;
    });
  }

  function themPhuKien(lineKey: string) {
    setMoPhuKien((current) => ({ ...current, [lineKey]: true }));
    setLines((current) => {
      if (!current) return current;
      const next = current.map((line) =>
        line.key !== lineKey
          ? line
          : { ...line, status: "" as const, accessories: [...line.accessories, blankPhuKien(line.quantity || "1")] },
      );
      linesRef.current = next;
      return next;
    });
  }

  function xoaPhuKien(lineKey: string, pkKey: string) {
    setLines((current) => {
      if (!current) return current;
      const next = current.map((line) =>
        line.key !== lineKey
          ? line
          : { ...line, status: "" as const, accessories: line.accessories.filter((pk) => pk.key !== pkKey) },
      );
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
      kind: line.kind,
      symbol: line.symbol,
      name: line.name,
      spec: line.spec,
      unit: line.unit,
      widthMm: line.widthMm.trim() || null,
      heightMm: line.heightMm.trim() || null,
      pieceCount: line.quantity.trim() || 0,
      quantity: line.areaOverride.trim(),
      unitPrice: money(line.unitPrice),
      accessories: line.accessories
        .map((pk) => ({
          name: pk.name.trim(),
          unit: pk.unit,
          quantity: Number(pk.quantity || "0"),
          unitPrice: money(pk.unitPrice),
        }))
        .filter((pk) => pk.name || pk.quantity || pk.unitPrice),
      ownerId: line.ownerId,
      note: line.note,
    };
    setLines((current) => current?.map((item) => (item.key === key ? { ...item, status: "saving", message: "" } : item)) ?? current);
    const request = line.id
      ? callApi<Item>(`/api/cong-trinh/${projectId}/hang-muc/${line.id}`, { method: "PATCH", body: JSON.stringify(payload) })
      : callApi<Item>(`/api/cong-trinh/${projectId}/hang-muc`, { method: "POST", body: JSON.stringify(payload) });
    request
      .then((saved) => {
        savingKeys.current.delete(key);
        setLines((current) => {
          if (!current) return current;
          const fresh = fromItem(saved);
          fresh.key = key;
          fresh.status = "saved";
          const next = current.map((item) => (item.key === key ? fresh : item));
          linesRef.current = next;
          return next;
        });
        baoThanhCong();
      })
      .catch((caught: unknown) => {
        savingKeys.current.delete(key);
        const message = caught instanceof Error ? caught.message : "Không lưu được.";
        setLines((current) => current?.map((item) => (item.key === key ? { ...item, status: "error", message } : item)) ?? current);
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
      setLines(
        (current) =>
          current?.map((line) => (line.key === pendingDelete.key ? { ...line, status: "error", message } : line)) ?? current,
      );
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

  function pushLine(line: Line, afterKey?: string) {
    setLines((current) => {
      const list = current ?? [];
      const next = [...list];
      if (afterKey) {
        const index = next.findIndex((item) => item.key === afterKey);
        if (index >= 0) next.splice(index + 1, 0, line);
        else next.push(line);
      } else {
        next.push(line);
      }
      linesRef.current = next;
      return next;
    });
    reveal(line);
  }

  function addLine() {
    setCopyHint("");
    pushLine(blankLine(nextOrder(linesRef.current ?? []), defaultOwnerId));
  }

  function addGroup() {
    setCopyHint("");
    pushLine(blankGroup(nextOrder(linesRef.current ?? []), defaultOwnerId));
  }

  function thaHangMuc(targetKey: string) {
    if (!keoHangMucKey || keoHangMucKey === targetKey) {
      setKeoHangMucKey("");
      setNeoThaKey("");
      return;
    }
    const next = ganThuTu(chuyenHangMuc(linesRef.current ?? [], keoHangMucKey, targetKey));
    linesRef.current = next;
    setLines(next);
    setKeoHangMucKey("");
    setNeoThaKey("");
    // Lưu lại STT sau kéo thả.
    for (const line of next) {
      if (picture(line) !== line.saved && !isBlank(line)) commit(line.key);
    }
  }

  function copyLine() {
    const source = linesRef.current?.at(-1);
    if (!source) {
      setCopyHint("Chưa có hạng mục phía trên để copy.");
      return;
    }
    duplicateLine(source.key);
  }

  function duplicateLine(key: string) {
    const source = linesRef.current?.find((item) => item.key === key);
    if (!source || source.kind === "nhom") {
      setCopyHint(source?.kind === "nhom" ? "Không sao chép dòng nhóm." : "Không tìm thấy dòng để copy.");
      return;
    }
    const line = blankLine(nextOrder(linesRef.current ?? []), source.ownerId);
    line.symbol = source.symbol;
    line.name = source.name;
    line.spec = source.spec;
    line.unit = source.unit;
    line.widthMm = source.widthMm;
    line.heightMm = source.heightMm;
    line.quantity = source.quantity;
    line.areaOverride = source.areaOverride;
    line.unitPrice = source.unitPrice;
    line.note = source.note;
    line.accessories = source.accessories.map((pk) => ({ ...pk, key: crypto.randomUUID() }));
    setCopyHint("");
    if (line.accessories.length) setMoPhuKien((current) => ({ ...current, [line.key]: true }));
    pushLine(line, key);
  }

  function moChonFile(cheDo: "thay_the" | "phu_luc") {
    if (dangNapFile) return;
    setImportHint("");
    cheDoNapRef.current = cheDo;
    fileRef.current?.click();
  }

  function importFile() {
    moChonFile("thay_the");
  }

  function importPhuLuc() {
    moChonFile("phu_luc");
  }

  async function onChonFileHangMuc(file: File | null) {
    if (!file || dangNapFile) return;
    if (fileRef.current) fileRef.current.value = "";
    const cheDo = cheDoNapRef.current;
    const phuLuc = cheDo === "phu_luc";
    setDangNapFile(true);
    setImportHint(
      phuLuc ? `Đang thêm phụ lục «${file.name}» vào hạng mục hiện có...` : `Đang nạp «${file.name}» (xóa hạng mục cũ)...`,
    );
    try {
      const { hangMuc, bac } = await docHangMucTuExcel(file);
      const payload = hangMuc.map((item, index) => ({
        sortOrder: index + 1,
        symbol: item.symbol,
        name: item.name,
        spec: item.spec,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        ownerId: defaultOwnerId,
        note: item.note,
        accessories: [],
      }));
      const saved = await callApi<Item[]>(`/api/cong-trinh/${projectId}/hang-muc`, {
        method: "PUT",
        body: JSON.stringify({ items: payload, append: phuLuc }),
      });
      const moi = saved.map((row) => {
        const line = fromItem(row);
        line.status = "saved";
        return line;
      });
      if (phuLuc) {
        setLines((current) => {
          const next = [...(current ?? []), ...moi];
          linesRef.current = next;
          return next;
        });
        setImportHint(`Đã thêm phụ lục: +${moi.length} hạng mục từ «${file.name}» (${nhanBacDonGia[bac]}).`);
      } else {
        setLines(moi);
        linesRef.current = moi;
        setImportHint(`Đã thay toàn bộ: nạp ${moi.length} hạng mục từ «${file.name}» (${nhanBacDonGia[bac]}).`);
      }
      baoThanhCong();
      if (moi[0]) reveal(moi[0]);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Không đọc được file Excel.";
      setImportHint(message);
    } finally {
      setDangNapFile(false);
    }
  }

  addLineRef.current = canEdit
    ? { add: addLine, addGroup, copy: copyLine, importFile, importPhuLuc }
    : null;

  const savedCount = lines?.filter((line) => line.id).length ?? 0;
  const soCot = 10 + (canEdit ? 1 : 0);
  const cotTruocTien = 8;
  const cotSauTien = soCot - cotTruocTien - 1;
  const truocThue = lines ? tongTruocThue(lines) : null;
  const thue = truocThue === null ? null : tienThue(truocThue, vatPercent);
  const sauThue = truocThue === null || thue === null ? null : truocThue + thue;
  const thongKeHangMuc =
    truocThue === null
      ? []
      : ([
          ["Tổng cộng trước thuế", `${formatUnitPrice(truocThue)} ₫`] as const,
          [
            vatPercent === null ? "Thuế GTGT (VAT)" : `Thuế GTGT (VAT) ${vatPercent}%`,
            thue === null ? "—" : `${formatUnitPrice(thue)} ₫`,
          ] as const,
          ["Tổng cộng sau thuế", sauThue === null ? "—" : `${formatUnitPrice(sauThue)} ₫`] as const,
        ] as const);

  // STT chỉ đếm dòng item (không đếm nhóm) — giống báo giá.
  let sttChay = 0;

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={(event) => void onChonFileHangMuc(event.target.files?.[0] ?? null)}
      />
      <div className="sticky top-0 z-30 -mx-1 space-y-2 bg-white/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {lines ? `${savedCount} hạng mục.` : "Đang tải hạng mục..."}
            {canEdit ? " Gõ thẳng trên bảng, rời dòng là lưu." : ""}
          </p>
          {thongKeHangMuc.length > 0 ? (
            <dl className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-line/70 bg-soft px-4 py-2 shadow-sm">
              {thongKeHangMuc.map(([label, value]) => {
                const Icon = label.startsWith("Thuế GTGT") ? Percent : label === "Tổng cộng sau thuế" ? Wallet : null;
                const nhan = label === "Tổng cộng sau thuế";
                return (
                  <div
                    key={label}
                    className={cn("flex items-center gap-1.5", nhan ? "rounded-lg bg-primary/10 px-2 py-1 text-primary" : "")}
                  >
                    {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
                    <dt className={cn("text-xs", nhan ? "text-primary" : "text-muted")}>{label}</dt>
                    <dd className={cn("text-sm font-semibold tabular-nums", nhan ? "text-primary" : "text-ink")}>{value}</dd>
                  </div>
                );
              })}
            </dl>
          ) : null}
        </div>
      </div>
      {copyHint ? (
        <p className="text-sm text-danger" role="alert">
          {copyHint}
        </p>
      ) : null}
      {importHint ? (
        <p className="text-sm text-amber-800" role="status">
          {importHint}
        </p>
      ) : null}
      {loadError ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {loadError}
        </p>
      ) : null}
      <div className={listPanelClass}>
        <div className="overflow-x-auto">
          <Table className="min-w-[1100px] table-fixed">
            <TableHeader>
              <TableRow className="bg-soft hover:bg-soft">
                <TableHead className="w-12 px-1 text-center">STT</TableHead>
                <TableHead className="w-24">Ký hiệu</TableHead>
                <TableHead className="w-[22%]">Nội dung</TableHead>
                <TableHead className="w-24">Đơn vị tính</TableHead>
                <TableHead className="w-24 text-right">Rộng (mm)</TableHead>
                <TableHead className="w-24 text-right">Cao (mm)</TableHead>
                <TableHead className="w-20 text-right">Số lượng</TableHead>
                <TableHead className="w-32 text-right">Khối lượng (m2)</TableHead>
                <TableHead className="w-32 text-right">Đơn giá</TableHead>
                <TableHead className="w-36 text-right">Thành tiền</TableHead>
                {canEdit ? <TableHead className="w-24 px-1" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines && lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={soCot} className="py-8 text-center text-sm text-muted">
                    Chưa có hạng mục.
                  </TableCell>
                </TableRow>
              ) : null}
              {lines?.map((line) => {
                const blur = (event: FocusEvent) => leaveRow(line.key, event);
                const hopCao = rowHeights[line.key] ? { height: rowHeights[line.key] } : undefined;
                const laNhom = line.kind === "nhom";
                if (!laNhom) sttChay += 1;
                const stt = laNhom ? null : sttChay;
                const dangMoPk = canEdit
                  ? line.key in moPhuKien
                    ? moPhuKien[line.key]
                    : line.accessories.length > 0
                  : line.accessories.length > 0;
                return (
                  <Fragment key={line.key}>
                    <TableRow
                      ref={(node) => {
                        rowRefs.current[line.key] = node;
                      }}
                      className={
                        [
                          line.status === "error"
                            ? "relative bg-danger/5"
                            : laNhom
                              ? "relative bg-soft/70"
                              : "relative",
                          keoHangMucKey === line.key ? "opacity-55" : "",
                          keoHangMucKey &&
                          neoThaKey === line.key &&
                          keoHangMucKey !== line.key
                            ? "ring-2 ring-inset ring-primary/40"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")
                      }
                      onDragOver={
                        canEdit && keoHangMucKey && keoHangMucKey !== line.key
                          ? (event) => {
                              event.preventDefault();
                              event.dataTransfer.dropEffect = "move";
                              setNeoThaKey(line.key);
                            }
                          : undefined
                      }
                      onDrop={
                        canEdit && keoHangMucKey && keoHangMucKey !== line.key
                          ? (event) => {
                              event.preventDefault();
                              thaHangMuc(line.key);
                            }
                          : undefined
                      }
                    >
                      <TableCell className="relative px-1 align-top text-center">
                        {laNhom ? (
                          <span className={`${valueClass} text-center`}>&nbsp;</span>
                        ) : canEdit ? (
                          <button
                            type="button"
                            draggable
                            title="Kéo thả vào nhóm hoặc đổi thứ tự"
                            aria-label={`Kéo hạng mục ${stt ?? ""}`}
                            className={`${cellClass} inline-flex cursor-grab items-center justify-center gap-0.5 select-none text-muted hover:text-primary active:cursor-grabbing`}
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", line.key);
                              setKeoHangMucKey(line.key);
                            }}
                            onDragEnd={() => {
                              setKeoHangMucKey("");
                              setNeoThaKey("");
                            }}
                          >
                            <GripVertical className="size-3.5 shrink-0" aria-hidden />
                            <span className="tabular-nums">{stt ?? ""}</span>
                          </button>
                        ) : (
                          <span className={`${valueClass} text-center tabular-nums`}>{stt ?? ""}</span>
                        )}
                        <div
                          role="separator"
                          aria-orientation="horizontal"
                          aria-label="Kéo để đổi chiều cao hàng"
                          onPointerDown={(event) => keoCao(line.key, event)}
                          className="absolute inset-x-0 bottom-0 z-20 h-2 cursor-ns-resize hover:bg-primary/40"
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        {canEdit && !laNhom ? (
                          <input
                            value={line.symbol}
                            placeholder="D1, S1..."
                            onChange={(event) => patch(line.key, { symbol: event.target.value })}
                            onBlur={blur}
                            className={cellClass}
                          />
                        ) : (
                          <span className={`${valueClass} font-medium`}>{line.symbol || (laNhom ? "" : "—")}</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        {canEdit ? (
                          <textarea
                            value={line.name}
                            rows={2}
                            placeholder="Thêm nội dung..."
                            onChange={(event) => patch(line.key, { name: event.target.value })}
                            onBlur={blur}
                            style={hopCao}
                            className={`${cellClass} resize-none overflow-y-auto ${laNhom ? "font-semibold" : ""}`}
                          />
                        ) : (
                          <p style={hopCao} className={`overflow-y-auto whitespace-pre-line text-ink ${laNhom ? "font-semibold" : "font-medium"}`}>
                            {line.name}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        {canEdit && !laNhom ? (
                          <select
                            value={line.unit}
                            onChange={(event) => patch(line.key, { unit: event.target.value })}
                            onBlur={blur}
                            className={`${cellClass} pr-6`}
                          >
                            {line.unit && !isMeasureUnit(line.unit) ? <option value={line.unit}>{line.unit}</option> : null}
                            {measureUnits.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={valueClass}>{laNhom ? "" : line.unit}</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        {canEdit && !laNhom ? (
                          <input
                            value={line.widthMm}
                            inputMode="numeric"
                            onChange={(event) => patch(line.key, { widthMm: event.target.value.replace(/\D/g, "").slice(0, 5) })}
                            onBlur={blur}
                            className={`${cellClass} text-right`}
                          />
                        ) : (
                          <span className={`${valueClass} text-right tabular-nums`}>{laNhom ? "" : line.widthMm || "—"}</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        {canEdit && !laNhom ? (
                          <input
                            value={line.heightMm}
                            inputMode="numeric"
                            onChange={(event) => patch(line.key, { heightMm: event.target.value.replace(/\D/g, "").slice(0, 5) })}
                            onBlur={blur}
                            className={`${cellClass} text-right`}
                          />
                        ) : (
                          <span className={`${valueClass} text-right tabular-nums`}>{laNhom ? "" : line.heightMm || "—"}</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        {canEdit && !laNhom ? (
                          <input
                            value={line.quantity}
                            inputMode="numeric"
                            onChange={(event) => patch(line.key, { quantity: event.target.value.replace(/\D/g, "").slice(0, 6) })}
                            onBlur={blur}
                            className={`${cellClass} text-right`}
                          />
                        ) : (
                          <span className={`${valueClass} text-right tabular-nums`}>{laNhom ? "" : line.quantity || "—"}</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        {canEdit && !laNhom ? (
                          <input
                            value={line.areaOverride}
                            inputMode="decimal"
                            placeholder={khoiLuongHienThi(line)}
                            onChange={(event) => patch(line.key, { areaOverride: event.target.value })}
                            onBlur={blur}
                            className={`${cellClass} text-right`}
                          />
                        ) : (
                          <span className={`${valueClass} text-right tabular-nums`}>
                            {laNhom ? "" : khoiLuongHienThi(line) || "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        {canEdit && !laNhom ? (
                          <input
                            value={line.unitPrice}
                            inputMode="numeric"
                            onChange={(event) => {
                              const digits = digitsVnd(event.target.value);
                              patch(line.key, { unitPrice: digits ? formatCount(Number(digits)) : "" });
                            }}
                            onBlur={blur}
                            className={`${cellClass} text-right`}
                          />
                        ) : (
                          <span className={`${valueClass} text-right tabular-nums`}>{laNhom ? "" : line.unitPrice || "0"}</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-right font-medium text-ink">
                        <span className={`${valueClass} text-right tabular-nums`}>{laNhom ? "" : amountOf(line)}</span>
                      </TableCell>
                      {canEdit ? (
                        <TableCell className="w-24 px-0 align-top">
                          <div className="inline-flex items-center justify-center gap-0.5">
                            {!laNhom ? (
                              <button
                                type="button"
                                className="inline-flex h-8 items-center justify-center px-1 text-xs font-semibold text-primary"
                                title="Phụ kiện của dòng cửa"
                                onClick={() =>
                                  setMoPhuKien((map) => ({
                                    ...map,
                                    [line.key]: !dangMoPk,
                                  }))
                                }
                              >
                                PK
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="inline-flex h-8 items-center justify-center px-1 text-sm font-medium text-primary disabled:cursor-not-allowed disabled:opacity-35"
                              title={laNhom ? "Không sao chép dòng nhóm" : "Sao chép dòng xuống dưới"}
                              disabled={laNhom}
                              onClick={() => duplicateLine(line.key)}
                            >
                              <Copy className="size-4" aria-hidden />
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-8 items-center justify-center px-1 text-sm font-medium text-danger"
                              title="Xóa dòng"
                              onClick={() => setPendingDelete(line)}
                            >
                              <Trash2 className="size-4" aria-hidden />
                            </button>
                          </div>
                          {line.status === "saving" ? <p className="px-2 text-xs text-muted">Đang lưu</p> : null}
                        </TableCell>
                      ) : null}
                    </TableRow>
                    {!laNhom && dangMoPk
                      ? line.accessories.map((pk, pkIndex) => {
                          const thanhTienPk = money(pk.unitPrice) * Number(pk.quantity || "0");
                          return (
                            <TableRow key={pk.key} className="border-t border-dashed border-line/50 bg-soft/30 hover:bg-soft/30">
                              <TableCell className="align-top" />
                              <TableCell className="align-top text-muted">
                                <span className={`${cellClass} inline-flex items-center text-muted`}>↳</span>
                              </TableCell>
                              <TableCell className="align-top">
                                {canEdit ? (
                                  <input
                                    className={`${cellClass} text-left`}
                                    value={pk.name}
                                    placeholder="Khóa, bản lề…"
                                    onChange={(event) => patchPhuKien(line.key, pk.key, { name: event.target.value })}
                                    onBlur={blur}
                                  />
                                ) : (
                                  <span className={valueClass}>{pk.name || "—"}</span>
                                )}
                              </TableCell>
                              <TableCell className="align-top">
                                {canEdit ? (
                                  <select
                                    className={`${cellClass} text-left`}
                                    value={pk.unit}
                                    onChange={(event) => patchPhuKien(line.key, pk.key, { unit: event.target.value })}
                                    onBlur={blur}
                                  >
                                    {pk.unit && !isMeasureUnit(pk.unit) ? <option value={pk.unit}>{pk.unit}</option> : null}
                                    {measureUnits.map((unit) => (
                                      <option key={unit} value={unit}>
                                        {unit}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  pk.unit
                                )}
                              </TableCell>
                              <TableCell className="align-top" />
                              <TableCell className="align-top" />
                              <TableCell className="align-top">
                                {canEdit ? (
                                  <input
                                    className={`${cellClass} text-right tabular-nums`}
                                    inputMode="numeric"
                                    value={pk.quantity}
                                    onChange={(event) =>
                                      patchPhuKien(line.key, pk.key, { quantity: event.target.value.replace(/\D/g, "") })
                                    }
                                    onBlur={blur}
                                  />
                                ) : (
                                  <span className={`${valueClass} text-right tabular-nums`}>{pk.quantity}</span>
                                )}
                              </TableCell>
                              <TableCell className="align-top" />
                              <TableCell className="align-top">
                                {canEdit ? (
                                  <input
                                    className={`${cellClass} text-right tabular-nums`}
                                    inputMode="numeric"
                                    value={pk.unitPrice}
                                    placeholder="0"
                                    onChange={(event) => {
                                      const digits = digitsVnd(event.target.value);
                                      patchPhuKien(line.key, pk.key, {
                                        unitPrice: digits ? formatCount(Number(digits)) : "",
                                      });
                                    }}
                                    onBlur={blur}
                                  />
                                ) : (
                                  <span className={`${valueClass} text-right tabular-nums`}>{pk.unitPrice || "0"}</span>
                                )}
                              </TableCell>
                              <TableCell className="align-top text-right font-semibold tabular-nums">
                                <span className={`${valueClass} text-right`}>{thanhTienPk > 0 ? formatCount(thanhTienPk) : "—"}</span>
                              </TableCell>
                              {canEdit ? (
                                <TableCell className="align-top text-center">
                                  <button
                                    type="button"
                                    className="inline-flex h-8 items-center justify-center px-1 text-sm font-medium text-danger"
                                    title="Xóa phụ kiện"
                                    onClick={() => xoaPhuKien(line.key, pk.key)}
                                  >
                                    <Trash2 className="size-4" aria-hidden />
                                  </button>
                                </TableCell>
                              ) : null}
                            </TableRow>
                          );
                        })
                      : null}
                    {!laNhom && dangMoPk && canEdit ? (
                      <TableRow className="border-t border-dashed border-line/40 bg-soft/20 hover:bg-soft/20">
                        <TableCell />
                        <TableCell />
                        <TableCell colSpan={8}>
                          <button
                            type="button"
                            className="inline-flex h-8 items-center justify-center px-1 text-primary"
                            title="Thêm phụ kiện"
                            onClick={() => themPhuKien(line.key)}
                          >
                            <Plus className="size-4" aria-hidden />
                          </button>
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    ) : null}
                    {line.status === "error" ? (
                      <TableRow className="bg-danger/5 hover:bg-danger/5">
                        <TableCell colSpan={soCot} className="py-2 text-sm text-danger" role="alert">
                          {line.message}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })}
            </TableBody>
            {truocThue !== null ? (
              <TableFooter>
                <TableRow className="hover:bg-soft">
                  <TableCell colSpan={cotTruocTien} className="text-right text-muted">
                    Tổng cộng trước thuế
                  </TableCell>
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
                  <TableCell colSpan={cotTruocTien} className="text-right font-semibold text-ink">
                    Tổng cộng sau thuế
                  </TableCell>
                  <TableCell className="text-right font-semibold text-ink">
                    <span className={`${valueClass} text-right tabular-nums`}>{sauThue === null ? "—" : formatUnitPrice(sauThue)}</span>
                  </TableCell>
                  <TableCell colSpan={cotSauTien} />
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </div>
      </div>

      {baoLuu ? (
        <p
          role="status"
          className="pointer-events-none fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[linear-gradient(135deg,#047857_0%,#059669_55%,#34d399_100%)] px-5 py-2.5 text-sm font-medium text-white shadow-[0_10px_24px_rgba(4,120,87,0.35)]"
        >
          Lưu hạng mục thành công !
        </p>
      ) : null}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa hạng mục</AlertDialogTitle>
            <AlertDialogDescription>Hạng mục số {pendingDelete?.sortOrder} sẽ bị xóa khỏi công trình này.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingDelete(null)} disabled={deleting}>
              <X className="size-4" aria-hidden /> Hủy
            </Button>
            <Button type="button" onClick={() => void remove()} disabled={deleting}>
              <Trash2 className="size-4" aria-hidden /> Xóa
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
