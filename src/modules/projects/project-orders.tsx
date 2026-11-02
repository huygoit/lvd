"use client";

import { useEffect, useRef, useState } from "react";
import { AppWindow, Boxes, Check, CircleHelp, Download, FileText, FileUp, FolderOpen, Percent, Plus, Ruler, Save, Trash2, Wallet } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { measureUnits } from "@/shared/catalog/units";
import { ProjectShip } from "@/modules/projects/project-ship";
import { callApi } from "@/shared/client/api";
import { formatUnitPrice } from "@/modules/projects/item-fields";
import { cn } from "@/shared/lib/cn";

type Line = {
  id: string;
  materialCode: string;
  name: string;
  spec: string;
  unit: string;
  colorCode: string;
  barCount: string;
  lengthM: string;
  widthMm: string;
  heightMm: string;
  kgPerM: string;
  totalKg: string;
  quantity: string;
  unitPrice: string;
  vatPercent: string;
  nguon: "pdf" | "thu_cong";
  isNew: boolean;
};

// Dòng phụ thu: diễn giải, SL, đơn giá, VAT — thành tiền/tiền thuế tự tính.
type Surcharge = {
  id: string;
  name: string;
  quantity: string;
  unitPrice: string;
  vatPercent: string;
};

type Order = {
  id: string;
  code: string;
  kind: "nhom" | "bo_cai" | "kinh";
  kindLabel: string;
  statusLabel: string;
  supplierName: string;
  supplierCode: string;
  supplierAddress: string;
  supplierPhone: string;
  supplierBankName: string;
  supplierAccountNumber: string;
  supplierWebsite: string;
  supplierEmail: string;
  supplierTaxCode: string;
  supplierRepresentativeName: string;
  supplierRepresentativeTitle: string;
  supplierIsNew: boolean;
  headerNote: string;
  vatMode: "gom_vat" | "chua_vat" | "khong_ro";
  vatInline: boolean;
  vatEvidence: string;
  depositPercent: number;
  depositAmount: number;
  depositNote: string;
  fileName: string;
  createdOn: string;
  amount: number;
  status: string;
  delivery: string;
  canShip: boolean;
  shipped: boolean;
  lines: Line[];
  surcharges: Surcharge[];
};

type RawLine = Omit<Line, "barCount" | "lengthM" | "widthMm" | "heightMm" | "kgPerM" | "totalKg" | "quantity" | "unitPrice" | "vatPercent"> & {
  barCount: number;
  lengthM: number;
  widthMm: number;
  heightMm: number;
  kgPerM: number;
  totalKg: number;
  quantity: number;
  unitPrice: number;
  vatPercent: number;
};

type RawSurcharge = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  vatPercent: number;
};

const stages = [
  { id: "tai", label: "Đang tải tệp", pct: 20 },
  { id: "doc", label: "Đang bóc tách dữ liệu", pct: 55 },
  { id: "doi", label: "Đang đối chiếu danh mục", pct: 80 },
  { id: "xong", label: "Đã đọc xong", pct: 100 },
];

function numText(value: number) {
  if (!value) return "";
  const rounded = Math.round(value * 1000) / 1000;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
}

function nhanNguon(nguon: string) {
  return nguon === "thu_cong" ? "Nạp thủ công" : "Nạp từ PDF";
}

// Bốn mức VAT chuẩn. Footer và từng dòng dùng chung whitelist này.
const vatTuyChon = [0, 5, 8, 10] as const;

function chuanVat(value: string | number) {
  const so = typeof value === "number" ? value : Number(String(value).replace(",", ".")) || 0;
  if ((vatTuyChon as readonly number[]).includes(so)) return String(so);
  return String(vatTuyChon.reduce((tot, muc) => (Math.abs(muc - so) < Math.abs(tot - so) ? muc : tot)));
}

function vatChungTuDong(lines: { vatPercent: string }[]) {
  if (!lines.length) return "0";
  const dem = new Map<string, number>();
  for (const line of lines) {
    const muc = chuanVat(line.vatPercent);
    dem.set(muc, (dem.get(muc) ?? 0) + 1);
  }
  return [...dem.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function dongTrong(kind: Order["kind"], vatPercent = "0"): Line {
  return {
    id: "",
    materialCode: "",
    name: "",
    spec: "",
    unit: kind === "nhom" ? "thanh" : kind === "kinh" ? "tấm" : "",
    colorCode: "",
    barCount: "",
    lengthM: "",
    widthMm: "",
    heightMm: "",
    kgPerM: "",
    totalKg: "",
    quantity: "",
    unitPrice: "",
    vatPercent: chuanVat(vatPercent),
    nguon: "thu_cong",
    isNew: true,
  };
}

function toLine(line: RawLine): Line {
  return {
    ...line,
    barCount: numText(line.barCount),
    lengthM: numText(line.lengthM),
    widthMm: numText(line.widthMm),
    heightMm: numText(line.heightMm),
    kgPerM: numText(line.kgPerM),
    totalKg: numText(line.totalKg),
    quantity: numText(line.quantity),
    unitPrice: line.unitPrice ? formatUnitPrice(line.unitPrice) : "",
    vatPercent: chuanVat(line.vatPercent),
    nguon: line.nguon === "thu_cong" ? "thu_cong" : "pdf",
  };
}

function toSurcharge(row: RawSurcharge): Surcharge {
  return {
    id: row.id,
    name: row.name,
    quantity: numText(row.quantity || 1),
    unitPrice: row.unitPrice ? formatUnitPrice(row.unitPrice) : "",
    vatPercent: chuanVat(row.vatPercent),
  };
}

// Dòng phụ thu trống. SL mặc định 1; VAT lấy theo mức footer đơn.
function phuThuTrong(vatPercent = "0"): Surcharge {
  return {
    id: "",
    name: "",
    quantity: "1",
    unitPrice: "",
    vatPercent: chuanVat(vatPercent),
  };
}

const kindMeta = {
  nhom: { icon: Ruler, hint: "Thanh, kg/m, giá theo kg", tone: "bg-primary/10 text-primary" },
  kinh: { icon: AppWindow, hint: "Rộng, cao, số tấm, m², đơn giá", tone: "bg-primary/10 text-primary" },
  bo_cai: { icon: Boxes, hint: "Số lượng, đơn giá, VAT", tone: "bg-success/10 text-success" },
} as const;

function glassM2(line: Line) {
  const width = Number(line.widthMm.replace(/[.,\s]/g, ""));
  const height = Number(line.heightMm.replace(/[.,\s]/g, ""));
  const sheets = Number(line.quantity.replace(/\s/g, "").replace(",", "."));
  if (!width || !height || !sheets) return null;
  return Math.round((width * height * sheets) / 10_000) / 100;
}

function glassArea(line: Line) {
  const area = glassM2(line);
  if (area === null) return "—";
  return area.toFixed(2).replace(/\.?0+$/, "").replace(".", ",");
}

function glassMoney(line: Line) {
  const area = glassM2(line);
  const price = Number(line.unitPrice.replace(/\./g, "")) || 0;
  if (area === null || !price) return null;
  return Math.round((Math.round(area * 100) * price) / 100);
}

function soNhom(value: string) {
  return Number(value.replace(/\s/g, "").replace(",", ".")) || 0;
}

// Tổng kg của một dòng nhôm = Thanh × Dài × Kg/m. Trả null khi thiếu dữ liệu.
function tongKgNhom(line: Line) {
  const thanh = Number(line.barCount.replace(/[^\d]/g, "")) || 0;
  const dai = soNhom(line.lengthM);
  const kgm = soNhom(line.kgPerM);
  if (!thanh || !dai || !kgm) return null;
  return Math.round(thanh * dai * kgm * 1000) / 1000;
}

function hienKgNhom(line: Line) {
  const kg = tongKgNhom(line);
  if (kg === null) return "";
  return Number.isInteger(kg) ? String(kg) : String(kg).replace(".", ",");
}

function tienDong(kind: Order["kind"], line: Line) {
  if (kind === "kinh") return glassMoney(line);
  const gia = Number(line.unitPrice.replace(/\./g, "")) || 0;
  if (!gia) return null;
  if (kind === "nhom") {
    const kg = tongKgNhom(line);
    if (kg === null) return null;
    return Math.round(kg * gia);
  }
  const sl = soNhom(line.quantity);
  if (!sl) return null;
  return Math.round(sl * gia);
}

// Chỉ gom_vat mới tách ngược. khong_ro chờ popup xác nhận — không tự đoán.
function donGomVat(order: Pick<Order, "vatMode" | "vatInline">) {
  if (order.vatInline) return false;
  return order.vatMode === "gom_vat";
}

function nhanVatDon(order: Pick<Order, "vatMode" | "vatInline">) {
  if (order.vatInline) return "VAT từng dòng";
  if (order.vatMode === "khong_ro") return "Chưa xác nhận VAT";
  return order.vatMode === "chua_vat" ? "Đơn hàng chưa bao gồm VAT" : "Đơn hàng bao gồm VAT";
}

// Số tính từ đơn giá trên dòng. Với đơn gồm VAT đây là số sau thuế (gross).
function tienGom(kind: Order["kind"], line: Line) {
  return tienDong(kind, line);
}

// Thành tiền trước thuế. Đơn gồm VAT thì chia ngược gross ÷ (1 + VAT%).
function tienTruocThue(kind: Order["kind"], line: Line, giaGomVat: boolean) {
  const gom = tienGom(kind, line);
  if (gom === null) return null;
  if (!giaGomVat) return gom;
  const vat = soNhom(line.vatPercent);
  if (vat <= 0) return gom;
  return Math.round(gom / (1 + vat / 100));
}

// Tiền thuế. Đơn gồm VAT = gross − trước thuế; còn lại = trước thuế × VAT%.
function tienThueDong(kind: Order["kind"], line: Line, giaGomVat: boolean) {
  const gom = tienGom(kind, line);
  if (gom === null) return null;
  if (giaGomVat) {
    const truoc = tienTruocThue(kind, line, true);
    if (truoc === null) return null;
    return gom - truoc;
  }
  const vat = soNhom(line.vatPercent);
  if (vat <= 0) return 0;
  return Math.round((gom * vat) / 100);
}

function congTienThue(kind: Order["kind"], lines: Line[], giaGomVat: boolean) {
  let truocThue = 0;
  let tax = 0;
  let thanhToan = 0;
  let coTien = false;
  for (const line of lines) {
    const gom = tienGom(kind, line);
    if (gom === null) continue;
    const truoc = tienTruocThue(kind, line, giaGomVat);
    const thue = tienThueDong(kind, line, giaGomVat);
    if (truoc === null || thue === null) continue;
    truocThue += truoc;
    tax += thue;
    thanhToan += giaGomVat ? gom : truoc + thue;
    coTien = true;
  }
  return { truocThue, tax, thanhToan, coTien };
}

// Thành tiền phụ thu từ SL × đơn giá. Đơn gồm VAT thì đây là số sau thuế.
function tienPhuThuGom(row: Surcharge) {
  const sl = soNhom(row.quantity);
  const gia = Number(row.unitPrice.replace(/\./g, "")) || 0;
  if (!sl || !gia) return null;
  return Math.round(sl * gia);
}

function tienPhuThuTruoc(row: Surcharge, giaGomVat: boolean) {
  const gom = tienPhuThuGom(row);
  if (gom === null) return null;
  if (!giaGomVat) return gom;
  const vat = soNhom(row.vatPercent);
  if (vat <= 0) return gom;
  return Math.round(gom / (1 + vat / 100));
}

function tienPhuThuThue(row: Surcharge, giaGomVat: boolean) {
  const gom = tienPhuThuGom(row);
  if (gom === null) return null;
  if (giaGomVat) {
    const truoc = tienPhuThuTruoc(row, true);
    if (truoc === null) return null;
    return gom - truoc;
  }
  const vat = soNhom(row.vatPercent);
  if (vat <= 0) return 0;
  return Math.round((gom * vat) / 100);
}

function congPhuThu(rows: Surcharge[], giaGomVat: boolean) {
  let truocThue = 0;
  let tax = 0;
  let thanhToan = 0;
  let coTien = false;
  for (const row of rows) {
    const gom = tienPhuThuGom(row);
    const truoc = tienPhuThuTruoc(row, giaGomVat);
    const thue = tienPhuThuThue(row, giaGomVat);
    if (gom === null || truoc === null || thue === null) continue;
    truocThue += truoc;
    tax += thue;
    thanhToan += giaGomVat ? gom : truoc + thue;
    coTien = true;
  }
  return { truocThue, tax, thanhToan, coTien };
}

function hienTien(tien: number | null) {
  return tien === null ? "—" : formatUnitPrice(tien);
}

// Tổng thanh toán đơn (dòng hàng + phụ thu), dùng tính còn lại sau đặt cọc.
function tongThanhToanDon(order: Order) {
  const giaGom = donGomVat(order);
  const hang = congTienThue(order.kind, order.lines, giaGom);
  const phu = congPhuThu(order.surcharges, giaGom);
  return {
    thanhToan: hang.thanhToan + phu.thanhToan,
    coTien: hang.coTien || phu.coTien,
  };
}

// Số đã đặt cọc: ưu tiên số tiền nhập; không có thì suy từ %.
function tienDatCocDon(order: Order, thanhToan: number) {
  if (order.depositAmount > 0) return order.depositAmount;
  if (order.depositPercent > 0 && thanhToan > 0) {
    return Math.round((thanhToan * order.depositPercent) / 100);
  }
  return 0;
}

function orderStats(order: Order) {
  const giaGom = donGomVat(order);
  const hang = congTienThue(order.kind, order.lines, giaGom);
  const phu = congPhuThu(order.surcharges, giaGom);
  const truocThue = hang.truocThue + phu.truocThue;
  const tax = hang.tax + phu.tax;
  const thanhToan = hang.thanhToan + phu.thanhToan;
  const coTien = hang.coTien || phu.coTien;
  const tienThue = ["Tiền thuế", coTien ? `${formatUnitPrice(tax)} ₫` : "—"] as const;
  const tongTt = ["Tổng thanh toán", coTien ? `${formatUnitPrice(thanhToan)} ₫` : "—"] as const;
  if (order.kind === "kinh") {
    let sheets = 0;
    let area = 0;
    for (const line of order.lines) {
      sheets += Number(line.quantity.replace(/\s/g, "").replace(",", ".")) || 0;
      const text = glassArea(line);
      if (text !== "—") area += Number(text.replace(",", "."));
    }
    const rounded = Math.round(area * 100) / 100;
    return [
      ["Tấm", String(sheets)],
      ["m²", rounded.toFixed(2).replace(/\.?0+$/, "").replace(".", ",")],
      ["Thành tiền", coTien ? `${formatUnitPrice(truocThue)} ₫` : "—"],
      tienThue,
      tongTt,
    ];
  }
  if (order.kind === "nhom") {
    let bars = 0;
    for (const line of order.lines) {
      bars += Number(line.barCount.replace(/[^\d]/g, "")) || 0;
    }
    // Dùng tổng kg suy ra từ Thanh × Dài × Kg/m để đồng bộ với dòng và với thành tiền.
    const kgTinh = order.lines.reduce((tong, line) => tong + (tongKgNhom(line) ?? 0), 0);
    const rounded = Math.round(kgTinh * 1000) / 1000;
    return [
      ["Dòng", String(order.lines.length)],
      ["Thanh", String(bars)],
      ["Tổng kg", Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",")],
      ["Thành tiền", coTien ? `${formatUnitPrice(truocThue)} ₫` : "—"],
      tienThue,
      tongTt,
    ];
  }
  let qty = 0;
  for (const line of order.lines) {
    qty += Number(line.quantity.replace(/\s/g, "").replace(",", ".")) || 0;
  }
  return [
    ["Dòng", String(order.lines.length)],
    ["Số lượng", String(qty)],
    ["Thành tiền", coTien ? `${formatUnitPrice(truocThue)} ₫` : "—"],
    tienThue,
    tongTt,
  ];
}

const cao = "box-border h-9";
const cell = cn(cao, "w-full rounded-md border border-transparent bg-transparent px-2 py-0 text-sm text-ink outline-none hover:border-line focus:border-primary focus:bg-white");
const num = cn(cell, "text-right tabular-nums");
const chu = cn(cao, "flex items-center px-2 text-sm text-ink");
const chuPhai = cn(chu, "justify-end font-medium tabular-nums");
const o = "p-0 align-top";
const tieuDe = "h-10 px-2 text-left align-middle text-sm font-medium";
const tieuDeSo = "h-10 px-2 text-right align-middle text-sm font-medium tabular-nums";

function NameInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);

  function show(input: HTMLInputElement) {
    if (!value.trim() || input.scrollWidth <= input.clientWidth + 1) {
      setTip(null);
      return;
    }
    const box = input.getBoundingClientRect();
    setTip({ x: box.left, y: box.bottom + 6 });
  }

  return (
    <>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onMouseEnter={(event) => show(event.currentTarget)}
        onMouseLeave={() => setTip(null)}
        className={cn(cell, "min-w-0 truncate")}
      />
      {tip ? (
        <span className="pointer-events-none fixed z-[80] max-w-md rounded-lg bg-ink px-2.5 py-1.5 text-xs leading-5 text-white shadow-lg" style={{ left: tip.x, top: tip.y }}>
          {value}
        </span>
      ) : null}
    </>
  );
}

export function ProjectOrders({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");
  const [stage, setStage] = useState("");
  const [current, setCurrent] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Order | null>(null);
  const [toast, setToast] = useState("");
  const [pendingShip, setPendingShip] = useState<Order | null>(null);
  // Hộp chọn loại khi thêm đơn tay.
  const [chonLoai, setChonLoai] = useState(false);
  const [taoTay, setTaoTay] = useState(false);
  // Popup xác nhận VAT khi đơn khong_ro.
  const [choVat, setChoVat] = useState<(Order & { lines: RawLine[]; surcharges?: RawSurcharge[] }) | null>(null);
  const [vatGomChon, setVatGomChon] = useState<"" | "gom" | "chua">("");
  const [vatMucChon, setVatMucChon] = useState("8");
  const [dangXacNhanVat, setDangXacNhanVat] = useState(false);
  // Cờ chỉnh sửa chưa lưu và cờ xác nhận đóng.
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  // VAT chung ở footer. Đổi giá trị này sẽ đẩy xuống tất cả dòng.
  const [vatChung, setVatChung] = useState("0");
  const henTat = useRef<number | null>(null);
  const vungCuon = useRef<HTMLDivElement | null>(null);

  function moDon(order: Order, lines: Line[], surcharges: Surcharge[] = []) {
    let vat = vatChungTuDong(lines);
    let dong = lines;
    if (!order.vatInline) {
      // Không có cột VAT: mặc định 8% cả đơn, các dòng khóa theo footer.
      if (!lines.length || lines.every((line) => chuanVat(line.vatPercent) === "0")) vat = "8";
      dong = lines.map((line) => ({ ...line, vatPercent: vat }));
    }
    // Phụ thu giữ VAT riêng từng dòng; nếu trống thì lấy mức footer.
    const phu = surcharges.map((row) => ({
      ...row,
      vatPercent: chuanVat(row.vatPercent || vat),
    }));
    setCurrent({
      ...order,
      depositPercent: order.depositPercent ?? 0,
      depositAmount: order.depositAmount ?? 0,
      depositNote: order.depositNote ?? "",
      lines: dong,
      surcharges: phu,
    });
    setVatChung(vat);
    setDirty(false);
  }

  // Đơn nạp PDF chưa xác nhận VAT → hiện popup.
  // Bỏ qua: đơn tay, đã xác nhận, hoặc có cột VAT từng dòng (mặc định chua_vat).
  function canHoiVat(order: Order) {
    if (order.vatEvidence === "nguoi_dung_xac_nhan" || order.vatEvidence === "tao_tay") return false;
    if (order.vatInline) return false;
    return order.vatMode === "khong_ro" || order.vatMode === "gom_vat" || order.vatMode === "chua_vat";
  }

  function moDonHoacHoiVat(order: Order, lines: RawLine[], surcharges: RawSurcharge[] = []) {
    if (canHoiVat(order)) {
      // khong_ro: bắt chọn gồm/chưa. gom/chua: khóa sẵn mode, chỉ chọn %.
      setVatGomChon(order.vatMode === "gom_vat" ? "gom" : order.vatMode === "chua_vat" ? "chua" : "");
      const goiY = vatChungTuDong(lines.map(toLine));
      setVatMucChon(goiY === "0" ? "8" : chuanVat(goiY));
      setChoVat({ ...order, lines, surcharges });
      return;
    }
    moDon(order, lines.map(toLine), surcharges.map(toSurcharge));
  }

  function dongPopupVat() {
    setChoVat(null);
    setVatGomChon("");
    setVatMucChon("8");
  }

  async function xacNhanVatDon() {
    if (!choVat) return;
    const canChonGom = choVat.vatMode === "khong_ro";
    if (canChonGom && !vatGomChon) return;
    setDangXacNhanVat(true);
    setError("");
    try {
      const gomVat = canChonGom ? vatGomChon === "gom" : choVat.vatMode === "gom_vat";
      const updated = await callApi<Order & { lines: RawLine[]; surcharges?: RawSurcharge[] }>(
        `/api/cong-trinh/${projectId}/don-hang/${choVat.id}/vat`,
        {
          method: "PATCH",
          body: JSON.stringify({
            gomVat,
            vatPercent: vatMucChon,
          }),
        },
      );
      dongPopupVat();
      await load();
      moDon(
        updated,
        updated.lines.map(toLine),
        ((updated.surcharges ?? []) as unknown as RawSurcharge[]).map(toSurcharge),
      );
      bao("Đã xác nhận VAT cho đơn hàng");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không xác nhận được VAT.");
    } finally {
      setDangXacNhanVat(false);
    }
  }

  useEffect(() => {
    return () => {
      if (henTat.current) window.clearTimeout(henTat.current);
    };
  }, []);

  function bao(text: string) {
    setToast(text);
    if (henTat.current) window.clearTimeout(henTat.current);
    henTat.current = window.setTimeout(() => setToast(""), 2000);
  }

  function baoThanhCong() {
    bao("Lưu đơn hàng thành công!");
  }

  function load() {
    return callApi<Order[]>(`/api/cong-trinh/${projectId}/don-hang`).then(setOrders);
  }

  useEffect(() => {
    let cancelled = false;
    setOrders(null);
    callApi<Order[]>(`/api/cong-trinh/${projectId}/don-hang`)
      .then((rows) => { if (!cancelled) setOrders(rows); })
      .catch((caught: unknown) => { if (!cancelled) setError(caught instanceof Error ? caught.message : "Không tải được đơn hàng."); });
    return () => { cancelled = true; };
  }, [projectId]);

  // Tạo đơn trống theo loại → mở cùng sheet như nạp file.
  async function taoDonTay(kind: Order["kind"]) {
    setTaoTay(true);
    setError("");
    setChonLoai(false);
    try {
      const order = await callApi<Order & { lines: RawLine[]; surcharges?: RawSurcharge[] }>(`/api/cong-trinh/${projectId}/don-hang`, {
        method: "POST",
        body: JSON.stringify({ kind }),
      });
      await load();
      moDon(order, [dongTrong(kind, "8")], []);
      setDirty(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không tạo được đơn.");
    } finally {
      setTaoTay(false);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setStage("tai");
    try {
      const body = new FormData();
      body.set("tep", file);
      const response = await fetch(`/api/cong-trinh/${projectId}/don-hang`, { method: "POST", body });
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Không đọc được tiến trình.");
      const decoder = new TextDecoder();
      let buffer = "";
      let opened = false;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const payload = part.replace(/^data:\s*/, "");
          if (!payload) continue;
          const event = JSON.parse(payload) as { stage?: string; message?: string; order?: Order & { lines: RawLine[] } };
          if (event.stage) setStage(event.stage);
          if (event.stage === "loi") throw new Error(event.message || "Không bóc tách được tệp.");
          if (event.stage === "xong" && event.order) {
            opened = true;
            const rawPhu = (event.order.surcharges ?? []) as unknown as RawSurcharge[];
            await load();
            moDonHoacHoiVat(event.order, event.order.lines, rawPhu);
          }
        }
      }
      if (!opened) throw new Error("Không bóc tách được tệp.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không bóc tách được tệp.");
    } finally {
      setStage("");
    }
  }

  async function save() {
    if (!current) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        supplierName: current.supplierName,
        supplierAddress: current.supplierAddress,
        supplierPhone: current.supplierPhone,
        supplierBankName: current.supplierBankName,
        supplierAccountNumber: current.supplierAccountNumber,
        supplierWebsite: current.supplierWebsite,
        supplierEmail: current.supplierEmail,
        supplierTaxCode: current.supplierTaxCode,
        supplierRepresentativeName: current.supplierRepresentativeName,
        supplierRepresentativeTitle: current.supplierRepresentativeTitle,
        headerNote: current.headerNote,
        depositPercent: current.depositPercent,
        depositAmount: current.depositAmount,
        depositNote: current.depositNote,
        lines: current.lines.map((line) => ({
          materialCode: line.materialCode,
          name: line.name,
          spec: line.spec,
          unit: line.unit,
          colorCode: line.colorCode,
          widthMm: line.widthMm,
          heightMm: line.heightMm,
          barCount: line.barCount,
          lengthM: line.lengthM,
          kgPerM: line.kgPerM,
          // Đơn nhôm: luôn gửi tổng kg dẫn xuất từ Thanh × Dài × Kg/m, không giữ số cũ.
          totalKg: current.kind === "nhom" ? (hienKgNhom(line) || line.totalKg) : line.totalKg,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          vatPercent: line.vatPercent,
          nguon: line.nguon,
        })),
        surcharges: current.surcharges.map((row) => ({
          name: row.name,
          quantity: row.quantity,
          unitPrice: row.unitPrice,
          vatPercent: row.vatPercent,
        })),
      };
      await callApi<Order & { lines: RawLine[] }>(`/api/cong-trinh/${projectId}/don-hang/${current.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      await load();
      setCurrent(null);
      setDirty(false);
      baoThanhCong();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được đơn.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setSaving(true);
    try {
      await callApi(`/api/cong-trinh/${projectId}/don-hang/${id}`, { method: "DELETE" });
      if (current?.id === id) setCurrent(null);
      setPendingDelete(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không xóa được đơn.");
      setPendingDelete(null);
    } finally {
      setSaving(false);
    }
  }

  async function taiTep(orderId: string, fileName: string) {
    setError("");
    try {
      const response = await fetch(`/api/cong-trinh/${projectId}/don-hang/${orderId}/tep`);
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message || "Không tải được tệp.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || "don-hang.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không tải được tệp.");
    }
  }

  function themDong() {
    setCurrent((row) => (row ? { ...row, lines: [...row.lines, dongTrong(row.kind, vatChung)] } : row));
    setDirty(true);
    requestAnimationFrame(() => {
      const vung = vungCuon.current;
      if (vung) vung.scrollTo({ top: vung.scrollHeight, behavior: "smooth" });
    });
  }

  function themPhuThu() {
    setCurrent((row) => (row ? { ...row, surcharges: [...row.surcharges, phuThuTrong(vatChung)] } : row));
    setDirty(true);
    requestAnimationFrame(() => {
      const vung = vungCuon.current;
      if (vung) vung.scrollTo({ top: vung.scrollHeight, behavior: "smooth" });
    });
  }

  function xoaDong(index: number) {
    setCurrent((row) => (row ? { ...row, lines: row.lines.filter((_, viTri) => viTri !== index) } : row));
    setDirty(true);
  }

  function xoaPhuThu(index: number) {
    setCurrent((row) => (row ? { ...row, surcharges: row.surcharges.filter((_, viTri) => viTri !== index) } : row));
    setDirty(true);
  }

  function patch(index: number, partial: Partial<Line>) {
    setCurrent((order) => order ? { ...order, lines: order.lines.map((line, i) => i === index ? { ...line, ...partial } : line) } : order);
    setDirty(true);
  }

  function patchPhuThu(index: number, partial: Partial<Surcharge>) {
    setCurrent((order) => order ? { ...order, surcharges: order.surcharges.map((row, i) => i === index ? { ...row, ...partial } : row) } : order);
    setDirty(true);
  }

  // Đổi VAT footer → áp cùng mức cho mọi dòng trong đơn.
  function doiVatChung(value: string) {
    const muc = chuanVat(value);
    setVatChung(muc);
    setCurrent((order) => order ? { ...order, lines: order.lines.map((line) => ({ ...line, vatPercent: muc })) } : order);
    setDirty(true);
  }

  // Yêu cầu đóng sheet. Có thay đổi chưa lưu thì mở hộp xác nhận, không thì đóng luôn.
  function yeuCauDong() {
    if (dirty) {
      setConfirmClose(true);
      return;
    }
    setCurrent(null);
  }

  const active = stages.find((item) => item.id === stage);
  const nhom = current?.kind === "nhom";
  const KindIcon = current ? kindMeta[current.kind].icon : FileUp;

  return (
    <div className="space-y-4">
      {toast ? (
        <p role="status" className="pointer-events-none fixed bottom-20 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-[linear-gradient(135deg,#047857_0%,#059669_55%,#34d399_100%)] px-5 py-2.5 text-sm font-medium text-white shadow-[0_10px_24px_rgba(4,120,87,0.35)]">
          {toast}
        </p>
      ) : null}
      <Sheet open={current !== null} onOpenChange={(next) => { if (!next) yeuCauDong(); }}>
        <SheetContent className="z-[60] w-full sm:w-[96vw] sm:max-w-[1680px]">
          {current ? (
            <>
              <SheetHeader>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", kindMeta[current.kind].tone)}>
                    <KindIcon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <SheetTitle>{current.code} · {current.kindLabel}</SheetTitle>
                    <SheetDescription asChild>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border border-line bg-soft px-3 text-xs font-medium text-ink">
                          <FileText className="size-3.5 shrink-0 text-primary" aria-hidden />
                          <span className="truncate">{current.fileName || "Nhập tay"}</span>
                        </span>
                        {current.status === "da_luu" ? null : (
                          <span className="inline-flex h-7 items-center rounded-full border border-line bg-white px-3 text-xs font-medium text-muted">{current.statusLabel}</span>
                        )}
                        <span
                          className="inline-flex h-7 items-center rounded-full border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary"
                          title={current.vatEvidence || undefined}
                        >
                          {nhanVatDon(current)}
                        </span>
                        {current.fileName ? (
                          <button
                            type="button"
                            onClick={() => void taiTep(current.id, current.fileName)}
                            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-xs font-semibold text-primary hover:bg-soft"
                          >
                            <Download className="size-3.5" />
                            Tải về
                          </button>
                        ) : null}
                      </div>
                    </SheetDescription>
                  </div>
                  <dl className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-soft px-4 py-2">
                    {orderStats(current).map(([label, value]) => {
                      const Icon = label === "Tiền thuế" ? Percent : label === "Tổng thanh toán" ? Wallet : null;
                      const nhan = label === "Tổng thanh toán";
                      return (
                        <div key={label} className={cn("flex items-center gap-1.5", nhan ? "rounded-lg bg-primary/10 px-2 py-1 text-primary" : "")}>
                          {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
                          <dt className={cn("text-xs", nhan ? "text-primary" : "text-muted")}>{label}</dt>
                          <dd className={cn("text-sm font-semibold tabular-nums", nhan ? "text-primary" : "text-ink")}>{value}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col">
                <div ref={vungCuon} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {error ? <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p> : null}
        {/* Nhà cung cấp + đặt cọc (bóc từ PDF hoặc nhập tay). */}
        <div className="space-y-3 rounded-2xl border border-line bg-white px-4 py-3">
          <label className="flex flex-wrap items-center gap-3">
            <span className="w-36 shrink-0 text-sm font-medium text-muted">Nhà cung cấp</span>
            <input
              value={current.supplierName}
              disabled={!canEdit}
              onChange={(event) => { setCurrent((row) => row ? { ...row, supplierName: event.target.value } : row); setDirty(true); }}
              placeholder="Tên nhà cung cấp"
              className="h-9 min-w-[220px] flex-1 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none focus:border-primary"
            />
          </label>
          <div className="flex flex-wrap items-end gap-3 border-t border-line pt-3">
            <label className="min-w-[140px] space-y-1">
              <span className="block text-xs font-medium text-muted">Đặt cọc (%)</span>
              <input
                value={current.depositPercent ? numText(current.depositPercent) : ""}
                disabled={!canEdit}
                inputMode="decimal"
                onChange={(event) => {
                  const so = Math.min(100, Math.max(0, Number(event.target.value.replace(",", ".")) || 0));
                  // Đổi % → tính lại số tiền đặt cọc theo tổng thanh toán hiện tại.
                  const { thanhToan } = tongThanhToanDon(current);
                  const tien = so > 0 && thanhToan > 0 ? Math.round((thanhToan * so) / 100) : 0;
                  setCurrent((row) => row ? { ...row, depositPercent: so, depositAmount: tien } : row);
                  setDirty(true);
                }}
                placeholder="0"
                className="h-9 w-full rounded-md border border-line bg-white px-3 text-sm tabular-nums text-ink outline-none focus:border-primary"
              />
            </label>
            <label className="min-w-[180px] flex-1 space-y-1">
              <span className="block text-xs font-medium text-muted">Số tiền đặt cọc</span>
              <input
                value={current.depositAmount ? formatUnitPrice(current.depositAmount) : ""}
                disabled={!canEdit}
                inputMode="numeric"
                onChange={(event) => {
                  const so = Number(event.target.value.replace(/\./g, "")) || 0;
                  setCurrent((row) => row ? { ...row, depositAmount: so } : row);
                  setDirty(true);
                }}
                placeholder="0"
                className="h-9 w-full rounded-md border border-line bg-white px-3 text-sm tabular-nums text-ink outline-none focus:border-primary"
              />
            </label>
            {(() => {
              const { thanhToan, coTien } = tongThanhToanDon(current);
              const datCoc = tienDatCocDon(current, thanhToan);
              const conLai = coTien && (datCoc > 0 || current.depositPercent > 0) ? Math.max(0, thanhToan - datCoc) : null;
              return (
                <div className="min-w-[180px] flex-1 space-y-1">
                  <span className="block text-xs font-medium text-muted">Số tiền còn lại</span>
                  <span className="flex h-9 items-center rounded-md border border-line bg-soft px-3 text-sm font-semibold tabular-nums text-ink">
                    {conLai === null ? "—" : `${formatUnitPrice(conLai)} ₫`}
                  </span>
                </div>
              );
            })()}
            <label className="min-w-[220px] flex-[2] space-y-1">
              <span className="block text-xs font-medium text-muted">Ghi chú đặt cọc</span>
              <input
                value={current.depositNote}
                disabled={!canEdit}
                onChange={(event) => { setCurrent((row) => row ? { ...row, depositNote: event.target.value } : row); setDirty(true); }}
                placeholder="Theo điều khoản trên đơn"
                className="h-9 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none focus:border-primary"
              />
            </label>
          </div>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className={cn("w-full text-sm", current.kind === "kinh" ? "min-w-[1380px]" : "min-w-[1280px]")}>
            <thead>
              <tr className="border-b border-line bg-soft text-muted">
                {current.kind === "kinh" ? (
                  <>
                    <th className={tieuDe}>Ký hiệu</th>
                    <th className={tieuDe}>Loại kính</th>
                    <th className={tieuDeSo}>Rộng</th>
                    <th className={tieuDeSo}>Cao</th>
                    <th className={tieuDeSo}>Số tấm</th>
                    <th className={tieuDeSo}>m²</th>
                    <th className={tieuDeSo}>Đơn giá</th>
                    <th className={tieuDeSo}>Thành tiền</th>
                    <th className={cn(tieuDeSo, "w-24")}>VAT %</th>
                    <th className={cn(tieuDeSo, "w-28")}>Tiền thuế</th>
                    <th className={tieuDe}>Theo nhà</th>
                    <th className={tieuDe}>Ghi chú</th>
                    <th className={cn(tieuDe, "w-32")}>Nguồn</th>
                    {canEdit ? <th className={cn(tieuDe, "w-16")}>Xóa</th> : null}
                  </>
                ) : (
                  <>
                    <th className={cn(tieuDe, "w-28")}>Mã</th>
                    <th className={tieuDe}>Tên</th>
                    {nhom ? <th className={cn(tieuDe, "w-20 whitespace-nowrap")}>Mã màu</th> : <th className={cn(tieuDe, "w-44")}>Mô tả</th>}
                    {nhom ? <th className={cn(tieuDeSo, "w-16")}>Thanh</th> : <th className={cn(tieuDe, "w-24")}>Đvt</th>}
                    {nhom ? <th className={cn(tieuDeSo, "w-20")}>Dài (m)</th> : <th className={cn(tieuDeSo, "w-24")}>Số lượng</th>}
                    {nhom ? <th className={cn(tieuDeSo, "w-20")}>Kg/m</th> : <th className={cn(tieuDeSo, "w-28")}>Đơn giá</th>}
                    {nhom ? <th className={cn(tieuDeSo, "w-24")}>Tổng kg</th> : <th className={cn(tieuDeSo, "w-28")}>Thành tiền</th>}
                    {nhom ? <th className={cn(tieuDeSo, "w-24")}>Giá/kg</th> : null}
                    {nhom ? <th className={cn(tieuDeSo, "w-28")}>Thành tiền</th> : null}
                    <th className={cn(tieuDeSo, "w-24")}>VAT %</th>
                    <th className={cn(tieuDeSo, "w-28")}>Tiền thuế</th>
                    <th className={cn(tieuDe, "w-32")}>Nguồn</th>
                    {canEdit ? <th className={cn(tieuDe, "w-16")}>Xóa</th> : null}
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {current.lines.map((line, index) => current.kind === "kinh" ? (
                <tr key={line.id || index} className="border-b border-line last:border-0">
                  <td className={o}><input value={line.materialCode} onChange={(event) => patch(index, { materialCode: event.target.value })} className={cell} /></td>
                  <td className={o}>
                    <input value={line.name} onChange={(event) => patch(index, { name: event.target.value })} className={cell} />
                  </td>
                  <td className={o}><input value={line.widthMm} onChange={(event) => patch(index, { widthMm: event.target.value })} className={num} /></td>
                  <td className={o}><input value={line.heightMm} onChange={(event) => patch(index, { heightMm: event.target.value })} className={num} /></td>
                  <td className={o}><input value={line.quantity} onChange={(event) => patch(index, { quantity: event.target.value })} className={num} /></td>
                  <td className={o}><span className={cn(chuPhai, "text-muted")}>{glassArea(line)}</span></td>
                  <td className={o}><input value={line.unitPrice} inputMode="numeric" onChange={(event) => patch(index, { unitPrice: event.target.value })} className={num} /></td>
                  <td className={o}><span className={chuPhai}>{hienTien(tienTruocThue(current.kind, line, donGomVat(current)))}</span></td>
                  <td className={o}>
                    <select
                      value={chuanVat(line.vatPercent)}
                      disabled={!current.vatInline}
                      onChange={(event) => patch(index, { vatPercent: event.target.value })}
                      className={num}
                      title={!current.vatInline ? "VAT cả đơn: đổi ở footer" : undefined}
                    >
                      {vatTuyChon.map((muc) => <option key={muc} value={muc}>{muc}%</option>)}
                    </select>
                  </td>
                  <td className={o}><span className={chuPhai}>{hienTien(tienThueDong(current.kind, line, donGomVat(current)))}</span></td>
                  <td className={o}><input value={line.colorCode} onChange={(event) => patch(index, { colorCode: event.target.value })} className={cell} /></td>
                  <td className={o}><input value={line.spec} onChange={(event) => patch(index, { spec: event.target.value })} className={cell} /></td>
                  <td className={o}><span className={cn(chu, "font-semibold")}>{nhanNguon(line.nguon)}</span></td>
                  {canEdit ? <td className={o}><button type="button" onClick={() => xoaDong(index)} className="flex h-9 items-center px-2 text-xs font-semibold text-danger hover:bg-danger/10">Xóa</button></td> : null}
                </tr>
              ) : (
                <tr key={line.id || index} className="border-b border-line last:border-0">
                  <td className={o}>
                    <input value={line.materialCode} onChange={(event) => patch(index, { materialCode: event.target.value })} className={cell} />
                  </td>
                  <td className={o}>
                    <NameInput value={line.name} onChange={(name) => patch(index, { name })} />
                  </td>
                  <td className={o}><input value={nhom ? line.colorCode : line.spec} onChange={(event) => patch(index, nhom ? { colorCode: event.target.value } : { spec: event.target.value })} className={cell} /></td>
                  <td className={o}>
                    {nhom ? <input value={line.barCount} onChange={(event) => patch(index, { barCount: event.target.value })} className={num} /> : (
                      <select value={line.unit} onChange={(event) => patch(index, { unit: event.target.value })} className={cell}>
                        <option value="">Chọn</option>
                        {measureUnits.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                      </select>
                    )}
                  </td>
                  <td className={o}><input value={nhom ? line.lengthM : line.quantity} onChange={(event) => patch(index, nhom ? { lengthM: event.target.value } : { quantity: event.target.value })} className={num} /></td>
                  <td className={o}><input value={nhom ? line.kgPerM : line.unitPrice} onChange={(event) => patch(index, nhom ? { kgPerM: event.target.value } : { unitPrice: event.target.value })} className={num} /></td>
                  {nhom ? (
                    <td className={o}><span className={chuPhai}>{hienKgNhom(line) || "—"}</span></td>
                  ) : (
                    <td className={o}><span className={chuPhai}>{hienTien(tienTruocThue(current.kind, line, donGomVat(current)))}</span></td>
                  )}
                  {nhom ? (
                    <td className={o}><input value={line.unitPrice} onChange={(event) => patch(index, { unitPrice: event.target.value })} className={num} /></td>
                  ) : null}
                  {nhom ? (
                    <td className={o}><span className={chuPhai}>{hienTien(tienTruocThue(current.kind, line, donGomVat(current)))}</span></td>
                  ) : null}
                  <td className={o}>
                    <select
                      value={chuanVat(line.vatPercent)}
                      disabled={!current.vatInline}
                      onChange={(event) => patch(index, { vatPercent: event.target.value })}
                      className={num}
                      title={!current.vatInline ? "VAT cả đơn: đổi ở footer" : undefined}
                    >
                      {vatTuyChon.map((muc) => <option key={muc} value={muc}>{muc}%</option>)}
                    </select>
                  </td>
                  <td className={o}><span className={chuPhai}>{hienTien(tienThueDong(current.kind, line, donGomVat(current)))}</span></td>
                  <td className={o}><span className={cn(chu, "font-semibold")}>{nhanNguon(line.nguon)}</span></td>
                  {canEdit ? <td className={o}><button type="button" onClick={() => xoaDong(index)} className="flex h-9 items-center px-2 text-xs font-semibold text-danger hover:bg-danger/10">Xóa</button></td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Khối phụ thu tách khỏi bảng dòng hàng — không nhập kho. */}
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line bg-soft px-3 py-2">
            <p className="text-sm font-semibold text-ink">Phụ thu</p>
            <p className="text-xs text-muted">Không nhập kho · cộng vào tổng thanh toán</p>
          </div>
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line bg-soft text-muted">
                <th className={tieuDe}>Diễn giải</th>
                <th className={cn(tieuDeSo, "w-24")}>Số lượng</th>
                <th className={cn(tieuDeSo, "w-32")}>Đơn giá</th>
                <th className={cn(tieuDeSo, "w-32")}>Thành tiền</th>
                <th className={cn(tieuDeSo, "w-24")}>VAT %</th>
                <th className={cn(tieuDeSo, "w-28")}>Tiền thuế</th>
                {canEdit ? <th className={cn(tieuDe, "w-16")}>Xóa</th> : null}
              </tr>
            </thead>
            <tbody>
              {current.surcharges.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="px-3 py-6 text-center text-sm text-muted">Chưa có phụ thu. Bấm «Thêm phụ thu» ở footer.</td>
                </tr>
              ) : current.surcharges.map((row, index) => (
                <tr key={row.id || `phu-${index}`} className="border-b border-line last:border-0">
                  <td className={o}><input value={row.name} onChange={(event) => patchPhuThu(index, { name: event.target.value })} className={cell} placeholder="Diễn giải phí" /></td>
                  <td className={o}><input value={row.quantity} onChange={(event) => patchPhuThu(index, { quantity: event.target.value })} className={num} /></td>
                  <td className={o}><input value={row.unitPrice} inputMode="numeric" onChange={(event) => patchPhuThu(index, { unitPrice: event.target.value })} className={num} /></td>
                  <td className={o}><span className={chuPhai}>{hienTien(tienPhuThuTruoc(row, donGomVat(current)))}</span></td>
                  <td className={o}>
                    <select
                      value={chuanVat(row.vatPercent)}
                      onChange={(event) => patchPhuThu(index, { vatPercent: event.target.value })}
                      className={num}
                    >
                      {vatTuyChon.map((muc) => <option key={muc} value={muc}>{muc}%</option>)}
                    </select>
                  </td>
                  <td className={o}><span className={chuPhai}>{hienTien(tienPhuThuThue(row, donGomVat(current)))}</span></td>
                  {canEdit ? <td className={o}><button type="button" onClick={() => xoaPhuThu(index)} className="flex h-9 items-center px-2 text-xs font-semibold text-danger hover:bg-danger/10">Xóa</button></td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
                </div>
                {canEdit ? (
                  <SheetFooter className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={themDong}><Plus className="size-4" />Thêm dòng vật tư</Button>
                      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={themPhuThu}><Plus className="size-4" />Thêm phụ thu</Button>
                      <label className="flex items-center gap-2 text-sm text-muted">
                        <Percent className="size-3.5 shrink-0" aria-hidden />
                        <span>{donGomVat(current) ? "VAT tách ngược" : "VAT cả đơn"}</span>
                        <select
                          value={vatChung}
                          onChange={(event) => doiVatChung(event.target.value)}
                          className="h-9 rounded-md border border-line bg-white px-2 text-sm font-semibold tabular-nums text-ink outline-none focus:border-primary"
                        >
                          {vatTuyChon.map((muc) => <option key={muc} value={muc}>{muc}%</option>)}
                        </select>
                        {donGomVat(current) ? <span className="text-xs text-muted">Thành tiền trên đơn đã gồm thuế</span> : null}
                        {current.vatInline ? <span className="text-xs text-muted">Đổi footer sẽ áp cho mọi dòng</span> : null}
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="gap-1.5 text-danger" onClick={() => setPendingDelete(current)} disabled={saving || current.shipped}>
                        <Trash2 className="size-4" aria-hidden />
                        Xóa đơn
                      </Button>
                      <Button type="button" className="gap-1.5" onClick={() => void save()} disabled={saving}>
                        <Save className="size-4" aria-hidden />
                        {saving ? "Đang lưu" : "Lưu đơn"}
                      </Button>
                    </div>
                  </SheetFooter>
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
      <section className="overflow-hidden rounded-2xl border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-white"><FileUp className="size-5" /></span>
            <div>
              <p className="text-base font-semibold text-ink">Đọc đơn từ PDF</p>
              <p className="text-sm text-muted">Chọn file. Đọc xong mở bảng để thêm, sửa, xóa dòng, bấm lưu mới ghi.</p>
            </div>
          </div>
          {canEdit ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" className="h-10 gap-1.5 rounded-xl" disabled={taoTay} onClick={() => setChonLoai(true)}>
                <Plus className="size-4" aria-hidden />
                {taoTay ? "Đang tạo..." : "Thêm đơn đặt hàng"}
              </Button>
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white">
                <FolderOpen className="size-4" aria-hidden />
                Nạp đơn đặt hàng từ file
                <input type="file" accept="application/pdf" className="sr-only" onChange={(event) => { void onFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
              </label>
            </div>
          ) : null}
        </div>
        <div className="grid border-t border-line sm:grid-cols-3">
          {(Object.keys(kindMeta) as (keyof typeof kindMeta)[]).map((key) => {
            const item = kindMeta[key];
            const Icon = item.icon;
            return (
              <div key={key} className="flex items-center gap-3 border-line px-5 py-3 sm:border-r sm:last:border-r-0">
                <span className={cn("flex size-9 items-center justify-center rounded-xl", item.tone)}><Icon className="size-4" /></span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{key === "nhom" ? "Nhôm" : key === "kinh" ? "Kính" : "Bộ, cái"}</span>
                  <span className="text-xs text-muted">{item.hint}</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>
      {active ? (
        <div className="rounded-2xl border border-line bg-white px-5 py-4">
          <div className="flex items-center justify-between text-sm">
            <p className="font-semibold text-ink">{active.label}</p>
            <p className="text-muted">{active.pct}%</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-soft">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${active.pct}%` }} />
          </div>
        </div>
      ) : null}
      {error && !current ? <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p> : null}
      <div className="grid gap-3">
        {!orders ? <p className="rounded-2xl border border-line bg-white px-4 py-8 text-sm text-muted">Đang tải đơn hàng...</p> : null}
        {orders && orders.length === 0 ? <p className="rounded-2xl border border-dashed border-line bg-soft px-4 py-12 text-center text-sm text-muted">Chưa có đơn hàng.</p> : null}
        {orders?.map((order) => {
          const item = kindMeta[order.kind];
          const Icon = item.icon;
          return (
            <div key={order.id} className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3">
              <button
                type="button"
                onClick={() => moDonHoacHoiVat(
                  order,
                  order.lines as unknown as RawLine[],
                  (order.surcharges ?? []) as unknown as RawSurcharge[],
                )}
                className="flex min-w-0 flex-1 items-center gap-4 text-left"
              >
                <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", item.tone)}><Icon className="size-5" /></span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">{order.code} · {order.supplierName || "Chưa rõ nhà cung cấp"}</span>
                  <span className="text-xs text-muted">{order.kindLabel} · {order.lines.length} dòng · {order.createdOn}</span>
                </span>
              </button>
              <span className="w-36 shrink-0 text-right text-sm font-semibold tabular-nums text-ink">{order.amount > 0 ? `${formatUnitPrice(order.amount)} ₫` : "—"}</span>
              <span className="flex w-36 shrink-0 justify-center">
                {canHoiVat(order) ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">Chưa xác nhận VAT</span> : null}
                {!canHoiVat(order) && order.delivery === "cho_nhan" ? <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">Đang giao</span> : null}
                {!canHoiVat(order) && order.delivery === "da_nhan" ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">Đã nhận</span> : null}
                {!canHoiVat(order) && order.status !== "da_luu" ? <span className="rounded-full bg-soft px-2.5 py-1 text-xs font-medium text-ink">{order.statusLabel}</span> : null}
              </span>
              <span className="flex w-64 shrink-0 justify-end gap-2">
                <span title={order.fileName ? "Tải tệp đơn hàng" : "Đơn chưa có tệp"} className={order.fileName ? "" : "cursor-not-allowed"}>
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={!order.fileName} onClick={() => void taiTep(order.id, order.fileName)}>
                    <Download className="size-4" />
                    Tải về
                  </Button>
                </span>
                {canEdit ? (
                  <span title={order.status !== "da_luu" ? "Lưu đơn trước khi giao" : order.canShip ? "Giao phần còn lại" : "Đơn đã giao hết"} className={order.status === "da_luu" && order.canShip ? "" : "cursor-not-allowed"}>
                    <Button type="button" variant="outline" size="sm" disabled={order.status !== "da_luu" || !order.canShip} onClick={() => { setError(""); setPendingShip(order); }}>Giao hàng</Button>
                  </span>
                ) : null}
                {canEdit ? (
                  <span title={order.shipped ? "Đơn đã giao, không xóa được" : "Xóa đơn hàng"} className={order.shipped ? "cursor-not-allowed" : ""}>
                    <Button type="button" variant="outline" size="sm" className="text-danger" disabled={order.shipped} onClick={() => setPendingDelete(order)}>Xóa</Button>
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
      <ProjectShip
        projectId={projectId}
        orderId={pendingShip?.id ?? ""}
        open={pendingShip !== null}
        onClose={() => setPendingShip(null)}
        onDone={(message) => { setPendingShip(null); void load(); bao(message); }}
      />
      <AlertDialog open={choVat !== null} onOpenChange={(open) => { if (!open && !dangXacNhanVat) dongPopupVat(); }}>
        <AlertDialogContent className="w-[min(100%-1.5rem,34rem)] overflow-hidden border-0 p-0 shadow-[0_24px_64px_rgba(15,23,42,0.22)]">
          {(() => {
            const khongRo = choVat?.vatMode === "khong_ro";
            const daBietGom = choVat?.vatMode === "gom_vat";
            const nutOk = khongRo ? Boolean(vatGomChon) : true;
            return (
              <>
          <div className="relative overflow-hidden bg-[linear-gradient(145deg,#0f766e_0%,#0d9488_42%,#14b8a6_78%,#5eead4_100%)] px-6 pb-8 pt-6 text-white">
            <div className="pointer-events-none absolute -right-8 -top-10 size-40 rounded-full bg-white/15 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 left-10 size-32 rounded-full bg-emerald-950/20 blur-2xl" />
            <div className="relative flex items-start gap-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-inner ring-1 ring-white/30 backdrop-blur-sm">
                {khongRo ? <CircleHelp className="size-7" aria-hidden /> : <Percent className="size-7" aria-hidden />}
              </span>
              <div className="min-w-0 space-y-1.5 pt-0.5">
                <AlertDialogTitle className="text-lg font-semibold leading-snug text-white">
                  {khongRo ? "Cần xác nhận VAT" : "Chọn mức thuế VAT"}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm leading-6 text-white/90">
                  {khongRo ? (
                    <>
                      Đơn <span className="font-semibold text-white">{choVat?.code}</span> không có dấu hiệu rõ đã gồm thuế hay chưa.
                      Chọn giúp một lần để hệ thống tính đúng thành tiền.
                    </>
                  ) : (
                    <>
                      Đơn <span className="font-semibold text-white">{choVat?.code}</span> đã nhận diện{" "}
                      <span className="font-semibold text-white">
                        {daBietGom ? "đã bao gồm VAT" : "chưa bao gồm VAT"}
                      </span>
                      . Chọn mức thuế áp cho cả đơn.
                    </>
                  )}
                </AlertDialogDescription>
              </div>
            </div>
          </div>

          <div className="space-y-5 bg-white px-6 py-5">
            {khongRo ? (
              <div className="space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">1. Giá trên đơn</p>
                <div className="grid gap-2.5">
                  {([
                    { id: "gom" as const, title: "Đơn hàng đã bao gồm VAT", hint: "Số trên bảng đã có thuế · hệ thống tách ngược" },
                    { id: "chua" as const, title: "Đơn hàng chưa bao gồm VAT", hint: "Số trên bảng là trước thuế · hệ thống cộng thêm" },
                  ]).map((opt) => {
                    const chon = vatGomChon === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={dangXacNhanVat}
                        onClick={() => setVatGomChon(opt.id)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition",
                          chon
                            ? "border-primary bg-primary/5 shadow-[0_0_0_1px_rgba(13,148,136,0.35)]"
                            : "border-line bg-soft/60 hover:border-primary/40 hover:bg-white",
                        )}
                      >
                        <span className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                          chon ? "border-primary bg-primary text-white" : "border-line bg-white",
                        )}>
                          {chon ? <Check className="size-3" strokeWidth={3} /> : null}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-ink">{opt.title}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-muted">{opt.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className={cn(
                "rounded-2xl border px-4 py-3",
                daBietGom ? "border-emerald-200 bg-emerald-50" : "border-sky-200 bg-sky-50",
              )}>
                <p className={cn("text-sm font-semibold", daBietGom ? "text-emerald-900" : "text-sky-900")}>
                  {daBietGom ? "Đơn hàng đã bao gồm VAT" : "Đơn hàng chưa bao gồm VAT"}
                </p>
                <p className={cn("mt-0.5 text-xs leading-5", daBietGom ? "text-emerald-800/80" : "text-sky-800/80")}>
                  {daBietGom ? "Thành tiền trên tệp đã có thuế · hệ thống sẽ tách ngược." : "Thành tiền trên tệp là trước thuế · hệ thống sẽ cộng thêm."}
                </p>
              </div>
            )}

            {!choVat?.vatInline ? (
              <div className="space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {khongRo ? "2. Thuế VAT cho đơn này" : "Thuế VAT cho đơn này"}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {vatTuyChon.map((muc) => {
                    const chon = vatMucChon === String(muc);
                    return (
                      <button
                        key={muc}
                        type="button"
                        disabled={dangXacNhanVat}
                        onClick={() => setVatMucChon(String(muc))}
                        className={cn(
                          "relative flex h-12 items-center justify-center rounded-xl border text-sm font-semibold tabular-nums transition",
                          chon
                            ? "border-primary bg-primary text-white shadow-md shadow-primary/25"
                            : "border-line bg-white text-ink hover:border-primary/50 hover:bg-soft",
                        )}
                      >
                        {muc}%
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs leading-5 text-muted">Mức này áp cho toàn bộ dòng hàng trên đơn (mặc định gợi ý 8%).</p>
              </div>
            ) : (
              <p className="rounded-xl border border-line bg-soft px-3 py-2.5 text-xs leading-5 text-muted">
                Đơn có cột VAT từng dòng — chỉ cần chọn đã gồm hay chưa gồm thuế. Mức % giữ theo từng dòng trên tệp.
              </p>
            )}

            {error && choVat ? (
              <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p>
            ) : null}
          </div>

          <AlertDialogFooter className="mt-0 border-t border-line bg-soft/80 px-6 py-4 sm:justify-between">
            <Button type="button" variant="outline" className="rounded-xl" disabled={dangXacNhanVat} onClick={dongPopupVat}>
              Để sau
            </Button>
            <Button
              type="button"
              className="rounded-xl gap-1.5 px-5 shadow-md shadow-primary/20"
              disabled={!nutOk || dangXacNhanVat}
              onClick={() => void xacNhanVatDon()}
            >
              <Check className="size-4" aria-hidden />
              {dangXacNhanVat ? "Đang lưu..." : "Xác nhận và mở đơn"}
            </Button>
          </AlertDialogFooter>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={chonLoai} onOpenChange={(open) => { if (!open) setChonLoai(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chọn loại đơn đặt hàng</AlertDialogTitle>
            <AlertDialogDescription>Đơn tay dùng cùng bảng với đơn nạp từ file. Chọn loại để mở form nhập.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2 py-1">
            {(Object.keys(kindMeta) as (keyof typeof kindMeta)[]).map((key) => {
              const item = kindMeta[key];
              const Icon = item.icon;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={taoTay}
                  onClick={() => void taoDonTay(key)}
                  className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-left hover:border-primary hover:bg-soft"
                >
                  <span className={cn("flex size-10 items-center justify-center rounded-xl", item.tone)}><Icon className="size-4" /></span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">{key === "nhom" ? "Nhôm" : key === "kinh" ? "Kính" : "Bộ, cái"}</span>
                    <span className="text-xs text-muted">{item.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setChonLoai(false)} disabled={taoTay}>Hủy</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={confirmClose} onOpenChange={(open) => { if (!open) setConfirmClose(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đóng mà chưa lưu?</AlertDialogTitle>
            <AlertDialogDescription>Các thay đổi trong đơn chưa được lưu. Thoát sẽ bỏ hết. Chọn ở lại để bấm Lưu đơn.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmClose(false)}>Ở lại</Button>
            <Button type="button" variant="destructive" onClick={() => { setConfirmClose(false); setDirty(false); setCurrent(null); }}>Thoát không lưu</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa đơn hàng</AlertDialogTitle>
            <AlertDialogDescription>Đơn {pendingDelete?.code} sẽ bị xóa. Vật tư và nhà cung cấp đã tạo trong danh mục vẫn giữ.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingDelete(null)}>Hủy</Button>
            <Button type="button" onClick={() => void remove()} disabled={saving}>Xóa</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
