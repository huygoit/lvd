"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ExternalLink, Eye, Hammer, Images, Pencil, Percent, Plus, Save, Trash2, Truck, Wallet, X } from "lucide-react";
import Link from "next/link";
import { callApi } from "@/shared/client/api";
import { formatStockQty } from "@/shared/catalog/stock";
import { ActionBadge, listPanelClass } from "@/shared/components/action-badge";
import { ChungTuSlide, type ChungTuAnh } from "@/shared/components/chung-tu-slide";
import { NgayNhap } from "@/shared/components/ngay-nhap";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { todayYmd } from "@/shared/lib/dates";
import { cn } from "@/shared/lib/cn";
import { digitsVnd, formatCount } from "@/shared/lib/money";
import { fabricationStatusLabel, fabricationVatBpsOptions } from "@/modules/fabrication/fields";
import { contractStatusList, contractStatusMoTa, hopDongChoThanhToan, hopDongDangKhoa } from "@/shared/catalog/contract-status";

type Workshop = { id: string; code: string; name: string };
type Staff = { id: string; name: string };

type Line = {
  key: string;
  name: string;
  widthMm: string;
  heightMm: string;
  quantity: string;
  // Khối lượng m² nhập đè. Chuỗi rỗng = dùng công thức.
  areaOverride: string;
  unitPrice: string;
  // VAT dòng ×100 (0 / 500 / 800 / 1000).
  taxBps: number;
  note: string;
};

type Advance = {
  id: string;
  occurredOn: string;
  amount: number;
  payerId: string;
  note: string;
};

type DeliveryLine = {
  id: string;
  code: string;
  name: string;
  groupName: string;
  unit: string;
  lengthMm: number;
  documentQty: number;
  receivedQty: number;
};

type Delivery = {
  id: string;
  code: string;
  status: string;
  statusLabel: string;
  orderCode: string;
  supplierName: string;
  lineCount: number;
  expectedAt: string;
  createdAt: string;
  photos: ChungTuAnh[];
  lines: DeliveryLine[];
};

type XemChungTu = {
  code: string;
  photos: ChungTuAnh[];
  index: number;
};

type Contract = {
  id: string;
  code: string;
  partnerId: string;
  partnerName: string;
  name: string;
  status: string;
  signedOn: string;
  taxBps: number;
  note: string;
  truocThue: number;
  tienThue: number;
  tongHopDong: number;
  tongDaThanhToan: number;
  conLai: number;
  lines: {
    name: string;
    widthMm: number;
    heightMm: number;
    quantity: number;
    areaOverrideM2: number | null;
    unitPrice: number;
    amount: number;
    taxBps: number;
    tienThue: number;
    note: string;
  }[];
  advances: Advance[];
  deliveries: Delivery[];
};

// Ô nhập trong form meta — cùng cảm giác với chi tiết đơn đặt hàng.
const o = "h-9 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none focus:border-primary";
const cell = "box-border h-9 w-full rounded-md border border-transparent bg-transparent px-2 py-0 text-sm text-ink outline-none hover:border-line focus:border-primary focus:bg-white";
const num = cn(cell, "text-right tabular-nums");
// Textarea nội dung — cho xuống hàng, không kéo resize.
const oNoiDung = "box-border min-h-[4.5rem] w-full resize-none rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm leading-snug text-ink outline-none hover:border-line focus:border-primary focus:bg-white";
const tieuDe = "h-10 px-2 text-left align-middle text-sm font-medium";
const tieuDeSo = "h-10 px-2 text-right align-middle text-sm font-medium tabular-nums";

// Đọc số thập phân kiểu VN (chấm nghìn, phẩy thập phân).
function parseSoThapPhan(value: string) {
  const raw = value.trim().replace(/\s/g, "");
  if (!raw) return 0;
  if (raw.includes(",") && raw.includes(".")) return Number(raw.replace(/\./g, "").replace(",", ".")) || 0;
  if (raw.includes(",")) return Number(raw.replace(",", ".")) || 0;
  const cham = raw.match(/\./g)?.length ?? 0;
  if (cham >= 2) return Number(raw.replace(/\./g, "")) || 0;
  if (cham === 1 && /^\d{1,3}(\.\d{3})+$/.test(raw)) return Number(raw.replace(/\./g, "")) || 0;
  return Number(raw) || 0;
}

// Lưu canonical: "1473448" hoặc "1473.448" (chấm = thập phân). Hậu tố "," = đang gõ phần thập phân.
function khoiLuongLuuTuNhap(raw: string) {
  const cleaned = raw.replace(/[^\d.,]/g, "");
  if (!cleaned) return "";
  const dangGoThapPhan = cleaned.endsWith(",") || (cleaned.endsWith(".") && cleaned.includes(","));

  let nguyen = "";
  let thap = "";
  let coPhay = cleaned.includes(",");

  if (coPhay) {
    const i = cleaned.indexOf(",");
    nguyen = cleaned.slice(0, i).replace(/\D/g, "");
    thap = cleaned.slice(i + 1).replace(/\D/g, "").slice(0, 6);
  } else {
    // Dấu chấm trên ô chỉ là phân tách nghìn của lần hiện — gộp lại.
    nguyen = cleaned.replace(/\D/g, "");
  }

  nguyen = nguyen.replace(/^0+(?=\d)/, "") || (thap || dangGoThapPhan || coPhay ? "0" : "");
  if (!nguyen && !thap && !dangGoThapPhan) return "";

  if (coPhay || dangGoThapPhan) {
    const body = thap.length > 0 ? `${nguyen}.${thap}` : nguyen;
    return cleaned.endsWith(",") || (coPhay && thap.length === 0 && dangGoThapPhan) ? `${body},` : body;
  }
  return nguyen;
}

function hienKhoiLuong(store: string) {
  if (!store) return "";
  const dangGo = store.endsWith(",");
  const base = dangGo ? store.slice(0, -1) : store;
  if (!base) return "0,";
  const so = Number(base);
  if (!Number.isFinite(so)) return "";
  const text = so.toLocaleString("vi-VN", { maximumFractionDigits: 6 });
  return dangGo ? (text.includes(",") ? text : `${text},`) : text;
}

function hienKhoiLuongTuSo(so: number) {
  return so.toLocaleString("vi-VN", { maximumFractionDigits: 6 });
}

// Khối lượng m² từ công thức Rộng × Cao × SL (đơn vị input là mm).
function khoiLuongCongThuc(width: string, height: string, qty: string) {
  const w = Number(width);
  const h = Number(height);
  const q = parseSoThapPhan(qty);
  if (![w, h, q].every((n) => Number.isFinite(n) && n > 0)) return 0;
  return Math.round((w * h * q) / 10_000) / 100;
}

// Khối lượng dùng để tính thành tiền: ưu tiên giá trị nhập đè, nếu rỗng mới lấy công thức.
function khoiLuongDung(line: Line) {
  if (line.areaOverride.trim()) {
    const so = Number(line.areaOverride.replace(/,$/, ""));
    if (Number.isFinite(so) && so > 0) return so;
  }
  return khoiLuongCongThuc(line.widthMm, line.heightMm, line.quantity);
}

function donGiaDong(line: Line) {
  return Number(String(line.unitPrice).replace(/\D/g, "")) || 0;
}

function thanhTien(line: Line) {
  const area = khoiLuongDung(line);
  const don = donGiaDong(line);
  if (!area || !don) return 0;
  return Math.round(area * don);
}

// Tiền thuế dòng theo VAT của chính dòng đó.
function tienThueDong(line: Line) {
  return Math.round((thanhTien(line) * line.taxBps) / 10000);
}

// VAT mặc định form chi tiết: 8% (= 800 bps).
const vatMacDinhBps = 800;

function dongTrong(rate: string, taxBps = vatMacDinhBps): Line {
  return { key: crypto.randomUUID(), name: "", widthMm: "", heightMm: "", quantity: "", areaOverride: "", unitPrice: rate, taxBps, note: "" };
}

function ngayHien(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
}

function gioPhieu(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

export function ProjectFabrication({
  projectId,
  staff,
  canEdit,
  defaultPayerId,
}: {
  projectId: string;
  staff: Staff[];
  canEdit: boolean;
  defaultPayerId: string;
}) {
  const [rows, setRows] = useState<Contract[] | null>(null);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loi, setLoi] = useState("");
  const [bao, setBao] = useState("");
  const [mo, setMo] = useState(false);
  const [suaId, setSuaId] = useState("");
  const [dangLuu, setDangLuu] = useState(false);
  const [xoaId, setXoaId] = useState<string | null>(null);

  const [partnerId, setPartnerId] = useState("");
  const [name, setName] = useState("");
  const [signedOn, setSignedOn] = useState("");
  const [taxBps, setTaxBps] = useState(vatMacDinhBps);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("dang_thuc_hien");
  const [lines, setLines] = useState<Line[]>([dongTrong("")]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  // Phiếu giao đang sổ lưới chi tiết (click lại để thu).
  const [phieuMoId, setPhieuMoId] = useState("");
  // Sheet xem ảnh chứng từ nhận hàng (giống đơn đặt hàng).
  const [xemChungTu, setXemChungTu] = useState<XemChungTu | null>(null);
  const [moThemThanhToan, setMoThemThanhToan] = useState(false);
  const [ttNgay, setTtNgay] = useState(() => todayYmd(new Date()));
  const [ttTien, setTtTien] = useState("");
  const [ttNguoi, setTtNguoi] = useState(defaultPayerId);
  const [ttGhi, setTtGhi] = useState("");

  function tai() {
    callApi<{ rows: Contract[]; workshops: Workshop[] }>(`/api/cong-trinh/${projectId}/gia-cong`)
      .then((data) => {
        setRows(data.rows);
        setWorkshops(data.workshops);
      })
      .catch((caught: unknown) => setLoi(caught instanceof Error ? caught.message : "Không tải được hợp đồng gia công."));
  }

  useEffect(() => {
    setRows(null);
    setLoi("");
    tai();
  }, [projectId]);

  function moThem() {
    setSuaId("");
    setPartnerId(workshops[0]?.id ?? "");
    setName("");
    setSignedOn("");
    setTaxBps(vatMacDinhBps);
    setNote("");
    setStatus("dang_thuc_hien");
    setLines([dongTrong("", vatMacDinhBps)]);
    setAdvances([]);
    setDeliveries([]);
    setPhieuMoId("");
    setMoThemThanhToan(false);
    setTtTien("");
    setTtGhi("");
    setBao("");
    setLoi("");
    setMo(true);
  }

  function moSua(row: Contract) {
    setSuaId(row.id);
    setPartnerId(row.partnerId);
    setName(row.name);
    setSignedOn(row.signedOn);
    setTaxBps(row.taxBps);
    setNote(row.note);
    setStatus(row.status);
    setLines(row.lines.length
      ? row.lines.map((dong) => ({
          key: crypto.randomUUID(),
          name: dong.name,
          widthMm: dong.widthMm ? String(dong.widthMm) : "",
          heightMm: dong.heightMm ? String(dong.heightMm) : "",
          quantity: String(dong.quantity),
          areaOverride: dong.areaOverrideM2 === null ? "" : String(dong.areaOverrideM2),
          unitPrice: String(dong.unitPrice),
          taxBps: dong.taxBps || row.taxBps || 0,
          note: dong.note,
        }))
      : [dongTrong("", row.taxBps || 0)]);
    setAdvances(row.advances);
    setDeliveries(row.deliveries ?? []);
    setPhieuMoId("");
    setMoThemThanhToan(false);
    setTtTien("");
    setTtGhi("");
    setBao("");
    setLoi("");
    setMo(true);
  }

  async function luu() {
    setDangLuu(true);
    setLoi("");
    setBao("");
    try {
      const body = {
        partnerId,
        name,
        signedOn,
        taxBps: taxBps / 100,
        note,
        status,
        lines: lines.map((dong) => ({
          name: dong.name,
          widthMm: dong.widthMm,
          heightMm: dong.heightMm,
          quantity: dong.quantity,
          areaOverride: dong.areaOverride.replace(/,$/, ""),
          unitPrice: dong.unitPrice,
          taxBps: dong.taxBps / 100,
          note: dong.note,
        })),
      };
      const saved = suaId
        ? await callApi<Contract>(`/api/cong-trinh/${projectId}/gia-cong/${suaId}`, { method: "PATCH", body: JSON.stringify(body) })
        : await callApi<Contract>(`/api/cong-trinh/${projectId}/gia-cong`, { method: "POST", body: JSON.stringify(body) });
      setRows((current) => {
        const list = current ?? [];
        if (suaId) return list.map((item) => item.id === saved.id ? saved : item);
        return [saved, ...list];
      });
      setSuaId(saved.id);
      setAdvances(saved.advances);
      setDeliveries(saved.deliveries ?? []);
      setBao("Đã lưu hợp đồng thành công !");
    } catch (caught) {
      setLoi(caught instanceof Error ? caught.message : "Không lưu được.");
    } finally {
      setDangLuu(false);
    }
  }

  async function xoaHop() {
    if (!xoaId) return;
    setDangLuu(true);
    try {
      await callApi(`/api/cong-trinh/${projectId}/gia-cong/${xoaId}`, { method: "DELETE" });
      setRows((current) => current?.filter((item) => item.id !== xoaId) ?? current);
      setXoaId(null);
      if (suaId === xoaId) setMo(false);
    } catch (caught) {
      setLoi(caught instanceof Error ? caught.message : "Không xóa được.");
      setXoaId(null);
    } finally {
      setDangLuu(false);
    }
  }

  async function themThanhToan() {
    if (!suaId) {
      setLoi("Lưu hợp đồng trước khi ghi thanh toán.");
      return;
    }
    setDangLuu(true);
    setLoi("");
    try {
      const saved = await callApi<Contract>(`/api/cong-trinh/${projectId}/gia-cong/${suaId}/tam-ung`, {
        method: "POST",
        body: JSON.stringify({ occurredOn: ttNgay, amount: digitsVnd(ttTien), payerId: ttNguoi, note: ttGhi }),
      });
      setRows((current) => current?.map((item) => item.id === saved.id ? saved : item) ?? current);
      setAdvances(saved.advances);
      setDeliveries(saved.deliveries ?? []);
      setTtTien("");
      setTtGhi("");
      setMoThemThanhToan(false);
      setBao("Đã ghi thanh toán.");
    } catch (caught) {
      setLoi(caught instanceof Error ? caught.message : "Không ghi được thanh toán.");
    } finally {
      setDangLuu(false);
    }
  }

  async function xoaThanhToan(id: string) {
    if (!suaId) return;
    setDangLuu(true);
    try {
      const saved = await callApi<Contract>(`/api/cong-trinh/${projectId}/gia-cong/${suaId}/tam-ung/${id}`, { method: "DELETE" });
      setRows((current) => current?.map((item) => item.id === saved.id ? saved : item) ?? current);
      setAdvances(saved.advances);
      setDeliveries(saved.deliveries ?? []);
    } catch (caught) {
      setLoi(caught instanceof Error ? caught.message : "Không xóa được thanh toán.");
    } finally {
      setDangLuu(false);
    }
  }

  const tongDong = lines.reduce((tong, dong) => tong + thanhTien(dong), 0);
  const tongTienThue = lines.reduce((tong, dong) => tong + tienThueDong(dong), 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Hợp đồng thuê xưởng gia công kính theo công trình. Chi phí lấy tổng thành tiền đã lưu. Lịch sử thanh toán theo dõi tiền đã đưa xưởng.
        </p>
        {canEdit ? (
          <Button type="button" onClick={moThem}>
            <Plus className="size-4" aria-hidden /> Thêm hợp đồng
          </Button>
        ) : null}
      </div>
      {loi && !mo ? <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{loi}</p> : null}
      <div className={listPanelClass}>
        <Table>
          <TableHeader>
            <TableRow className="bg-soft hover:bg-soft">
              <TableHead>Mã</TableHead>
              <TableHead>Xưởng</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Giá trị</TableHead>
              <TableHead className="text-right">Đã thanh toán</TableHead>
              <TableHead className="text-right">Còn lại</TableHead>
              <TableHead className="w-44 whitespace-nowrap">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows === null ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted">Đang tải...</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted">Chưa có hợp đồng gia công.</TableCell></TableRow>
            ) : rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.code}</TableCell>
                <TableCell>{row.partnerName}</TableCell>
                <TableCell>{fabricationStatusLabel[row.status as keyof typeof fabricationStatusLabel] ?? row.status}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCount(row.tongHopDong)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCount(row.tongDaThanhToan)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCount(row.conLai)}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex flex-nowrap items-center gap-1.5">
                    <ActionBadge onClick={() => moSua(row)}>
                      {canEdit && !hopDongDangKhoa(row.status) ? (
                        <><Pencil className="size-3.5" aria-hidden /> Sửa</>
                      ) : (
                        <><Eye className="size-3.5" aria-hidden /> Xem</>
                      )}
                    </ActionBadge>
                    {canEdit && !hopDongDangKhoa(row.status) ? (
                      <ActionBadge tone="danger" onClick={() => setXoaId(row.id)}>
                        <Trash2 className="size-3.5" aria-hidden /> Xóa
                      </ActionBadge>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet
        open={mo}
        onOpenChange={(open) => {
          setMo(open);
          if (!open) setXemChungTu(null);
        }}
      >
        <SheetContent className="z-[60] flex w-full flex-col sm:w-[92%] sm:max-w-none">
          <SheetHeader>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Hammer className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <SheetTitle>{suaId ? (name || "Hợp đồng gia công") : "Thêm hợp đồng gia công"}</SheetTitle>
                <SheetDescription asChild>
                  <div className="flex flex-wrap items-center gap-2">
                    {suaId ? (
                      <span className="inline-flex h-7 items-center rounded-full border border-line bg-soft px-3 text-xs font-medium text-ink">
                        {rows?.find((row) => row.id === suaId)?.code ?? "—"}
                      </span>
                    ) : null}
                    <span className="inline-flex h-7 items-center rounded-full border border-line bg-white px-3 text-xs font-medium text-muted">
                      {fabricationStatusLabel[status as keyof typeof fabricationStatusLabel] ?? status}
                    </span>
                  </div>
                </SheetDescription>
              </div>
              <dl className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-soft px-4 py-2">
                <div className="flex items-center gap-1.5">
                  <dt className="text-xs text-muted">Trước thuế</dt>
                  <dd className="text-sm font-semibold tabular-nums text-ink">{formatCount(tongDong)}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <Percent className="size-3.5 shrink-0 text-muted" aria-hidden />
                  <dt className="text-xs text-muted">Tiền thuế</dt>
                  <dd className="text-sm font-semibold tabular-nums text-ink">{formatCount(tongTienThue)}</dd>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2 py-1 text-primary">
                  <Wallet className="size-3.5 shrink-0" aria-hidden />
                  <dt className="text-xs text-primary">Tổng sau thuế</dt>
                  <dd className="text-sm font-semibold tabular-nums">{formatCount(tongDong + tongTienThue)}</dd>
                </div>
              </dl>
            </div>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {workshops.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line bg-soft px-3 py-4 text-sm text-muted">
                  Chưa có đối tác vai trò xưởng gia công. Thêm ở Đối tác rồi gán vai trò Xưởng gia công.
                </p>
              ) : null}

              <div className="overflow-x-auto rounded-2xl border border-line bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-soft px-3 py-2">
                  <p className="text-sm font-semibold text-ink">Khối lượng gia công</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs text-muted">m² · VAT từng dòng</p>
                    {canEdit ? (
                      <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setLines((current) => [...current, dongTrong("", taxBps)])}>
                        <Plus className="size-4" />Thêm dòng
                      </Button>
                    ) : null}
                  </div>
                </div>
                  <table className="w-full table-fixed text-sm">
                    <thead>
                      <tr className="border-b border-line bg-soft text-muted">
                        <th className={cn(tieuDe, "w-10 text-center")}>STT</th>
                        <th className={cn(tieuDe, "w-[24%]")}>Nội dung, hạng mục</th>
                        <th className={cn(tieuDe, "w-12 text-center")}>ĐVT</th>
                        <th className={cn(tieuDeSo, "w-16")}>Rộng</th>
                        <th className={cn(tieuDeSo, "w-16")}>Cao</th>
                        <th className={cn(tieuDeSo, "w-14")}>SL</th>
                        <th className={cn(tieuDeSo, "w-24")}>Khối lượng</th>
                        <th className={cn(tieuDeSo, "w-24")}>Đơn giá</th>
                        <th className={cn(tieuDeSo, "w-28")}>Thành tiền</th>
                        <th className={cn(tieuDeSo, "w-16")}>Thuế</th>
                        <th className={cn(tieuDeSo, "w-28")}>Tiền thuế</th>
                        {canEdit ? <th className={cn(tieuDe, "w-14")}>Xóa</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((dong, index) => {
                        const congThuc = khoiLuongCongThuc(dong.widthMm, dong.heightMm, dong.quantity);
                        const dangDe = dong.areaOverride.trim() !== "";
                        const tienDong = thanhTien(dong);
                        const thueDong = tienThueDong(dong);
                        return (
                          <tr key={dong.key} className="border-b border-line last:border-0">
                            <td className="p-0 text-center align-top"><span className="flex h-9 items-center justify-center px-2 text-sm tabular-nums text-muted">{index + 1}</span></td>
                            <td className="p-0 align-top">
                              <textarea
                                className={oNoiDung}
                                rows={3}
                                value={dong.name}
                                disabled={!canEdit}
                                placeholder="Nội dung, hạng mục"
                                onChange={(event) => setLines((current) => current.map((item) => item.key === dong.key ? { ...item, name: event.target.value } : item))}
                              />
                            </td>
                            <td className="p-0 text-center align-top"><span className="flex h-9 items-center justify-center px-2 text-sm text-muted">m²</span></td>
                            <td className="p-0 align-top"><input className={num} value={dong.widthMm} disabled={!canEdit} onChange={(event) => setLines((current) => current.map((item) => item.key === dong.key ? { ...item, widthMm: digitsVnd(event.target.value) } : item))} inputMode="numeric" /></td>
                            <td className="p-0 align-top"><input className={num} value={dong.heightMm} disabled={!canEdit} onChange={(event) => setLines((current) => current.map((item) => item.key === dong.key ? { ...item, heightMm: digitsVnd(event.target.value) } : item))} inputMode="numeric" /></td>
                            <td className="p-0 align-top"><input className={num} value={dong.quantity} disabled={!canEdit} onChange={(event) => setLines((current) => current.map((item) => item.key === dong.key ? { ...item, quantity: event.target.value } : item))} /></td>
                            <td className="p-0 align-top">
                              <input
                                className={cn(num, dangDe ? "border-primary bg-primary/5" : "")}
                                value={hienKhoiLuong(dong.areaOverride)}
                                placeholder={congThuc ? hienKhoiLuongTuSo(congThuc) : "—"}
                                disabled={!canEdit}
                                title={dangDe ? "Đã nhập khối lượng tay — rộng/cao/SL đã xóa. Xóa khối lượng để nhập lại theo công thức." : "Gõ 1473448 → 1.473.448 ; thập phân gõ phẩy: 1473,448 → 1.473,448"}
                                onChange={(event) => {
                                  // Lưu canonical, hiện format VN (giống ô đơn giá).
                                  const areaOverride = khoiLuongLuuTuNhap(event.target.value);
                                  setLines((current) => current.map((item) => item.key === dong.key
                                    ? areaOverride
                                      ? { ...item, areaOverride, widthMm: "", heightMm: "", quantity: "" }
                                      : { ...item, areaOverride: "" }
                                    : item));
                                }}
                                inputMode="decimal"
                              />
                            </td>
                            <td className="p-0 align-top">
                              <input
                                className={num}
                                value={dong.unitPrice ? formatCount(Number(dong.unitPrice)) : ""}
                                disabled={!canEdit}
                                onChange={(event) => setLines((current) => current.map((item) => item.key === dong.key ? { ...item, unitPrice: digitsVnd(event.target.value) } : item))}
                                inputMode="numeric"
                              />
                            </td>
                            <td className="p-0 align-top"><span className="flex h-9 items-center justify-end px-2 text-sm font-medium tabular-nums">{formatCount(tienDong)}</span></td>
                            <td className="p-0 align-top">
                              <select
                                className={cn(num, "px-1")}
                                value={dong.taxBps}
                                disabled={!canEdit}
                                onChange={(event) => setLines((current) => current.map((item) => item.key === dong.key ? { ...item, taxBps: Number(event.target.value) } : item))}
                              >
                                {fabricationVatBpsOptions.map((bps) => (
                                  <option key={bps} value={bps}>{bps / 100}%</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-0 align-top"><span className="flex h-9 items-center justify-end px-2 text-sm tabular-nums text-muted">{formatCount(thueDong)}</span></td>
                            {canEdit ? (
                              <td className="p-0 align-top">
                                <button type="button" disabled={lines.length <= 1} onClick={() => setLines((current) => current.filter((item) => item.key !== dong.key))} className="flex h-9 items-center px-2 text-xs font-semibold text-danger hover:bg-danger/10 disabled:opacity-40"><Trash2 className="size-4" aria-hidden /> Xóa</button>
                              </td>
                            ) : null}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
              </div>

              {suaId ? (
                <div className="overflow-hidden rounded-2xl border border-line bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-soft px-3 py-2">
                    <p className="text-sm font-semibold text-ink">Lịch sử giao hàng</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs text-muted">Phiếu gắn HĐ · chờ nhận / đã nhận</p>
                      {deliveries.length > 0 ? (
                        <>
                          <span className="inline-flex h-6 items-center rounded-full bg-amber-100 px-2.5 text-xs font-medium text-amber-800">
                            Chờ nhận {deliveries.filter((item) => item.status === "cho_nhan").length}
                          </span>
                          <span className="inline-flex h-6 items-center rounded-full bg-emerald-100 px-2.5 text-xs font-medium text-emerald-700">
                            Đã nhận {deliveries.filter((item) => item.status === "da_nhan").length}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="p-3">
                    {deliveries.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-line bg-soft/50 px-4 py-6 text-center">
                        <Truck className="mx-auto size-8 text-muted/50" aria-hidden />
                        <p className="mt-2 text-sm text-muted">Chưa có phiếu giao hàng gắn HĐ này.</p>
                        <p className="mt-1 text-xs text-muted">Khi giao đơn ra xưởng và chọn hợp đồng, phiếu sẽ hiện tại đây.</p>
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {deliveries.map((phieu) => {
                          const moLuoi = phieuMoId === phieu.id;
                          const anh = phieu.photos ?? [];
                          return (
                            <li key={phieu.id} className="overflow-hidden rounded-xl border border-line bg-soft/40">
                              <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
                                <button
                                  type="button"
                                  className="min-w-0 flex-1 space-y-1 text-left"
                                  onClick={() => setPhieuMoId(moLuoi ? "" : phieu.id)}
                                  aria-expanded={moLuoi}
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <ChevronDown className={cn("size-4 shrink-0 text-muted transition", moLuoi && "rotate-180")} aria-hidden />
                                    <span className="text-sm font-semibold tabular-nums text-ink">{phieu.code}</span>
                                    <span
                                      className={cn(
                                        "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium",
                                        phieu.status === "da_nhan" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800",
                                      )}
                                    >
                                      {phieu.statusLabel}
                                    </span>
                                    {phieu.orderCode ? (
                                      <span className="inline-flex h-6 items-center rounded-full border border-line bg-white px-2.5 text-xs font-medium text-ink">
                                        {phieu.orderCode}
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="pl-6 text-xs text-muted">
                                    {phieu.lineCount} dòng
                                    {phieu.supplierName ? ` · ${phieu.supplierName}` : ""}
                                    {phieu.expectedAt ? ` · Dự kiến ${gioPhieu(phieu.expectedAt)}` : ""}
                                    {` · Tạo ${gioPhieu(phieu.createdAt)}`}
                                  </p>
                                </button>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {/* Luôn hiện nút như bên Đơn đặt hàng; không ảnh thì khóa. */}
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5"
                                    disabled={anh.length === 0}
                                    title={anh.length === 0 ? "Phiếu chưa có ảnh chứng từ" : "Xem ảnh chứng từ nhận hàng"}
                                    onClick={() => {
                                      if (anh.length === 0) return;
                                      setXemChungTu({ code: phieu.code, photos: anh, index: 0 });
                                    }}
                                  >
                                    <Images className="size-3.5" aria-hidden />
                                    Xem chứng từ
                                    {anh.length > 0 ? (
                                      <span className="tabular-nums text-muted">({anh.length})</span>
                                    ) : null}
                                  </Button>
                                  <Button type="button" size="sm" variant="outline" className="gap-1.5" asChild>
                                    <Link href={`/xuong/nhan?phieu=${phieu.id}`} target="_blank" rel="noreferrer">
                                      <ExternalLink className="size-3.5" aria-hidden />
                                      Xem phiếu
                                    </Link>
                                  </Button>
                                </div>
                              </div>
                              {moLuoi ? (
                                <div className="border-t border-line bg-white">
                                  {(phieu.lines ?? []).length === 0 ? (
                                    <p className="px-3 py-4 text-center text-sm text-muted">Phiếu không có dòng vật tư.</p>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="w-full min-w-[720px] text-sm">
                                        <thead>
                                          <tr className="border-b border-line bg-soft text-muted">
                                            <th className={cn(tieuDe, "w-28")}>Mã VT</th>
                                            <th className={tieuDe}>Vật tư</th>
                                            <th className={cn(tieuDe, "w-32")}>Loại</th>
                                            <th className={cn(tieuDe, "min-w-[14rem]")}>Nhà cung cấp</th>
                                            <th className={cn(tieuDeSo, "w-24")}>SL giao</th>
                                            <th className={cn(tieuDeSo, "w-24")}>SL nhận</th>
                                            <th className={cn(tieuDe, "w-16")}>ĐVT</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {phieu.lines.map((dong) => (
                                            <tr key={dong.id} className="border-b border-line last:border-0">
                                              <td className="px-2 py-2 align-top tabular-nums text-muted">{dong.code}</td>
                                              <td className="px-2 py-2 align-top text-ink">
                                                <span className="font-medium">{dong.name}</span>
                                                {dong.lengthMm ? (
                                                  <span className="mt-0.5 block text-xs text-muted">
                                                    Dài {(Math.round(dong.lengthMm / 10) / 100).toString().replace(".", ",")} m
                                                  </span>
                                                ) : null}
                                              </td>
                                              <td className="px-2 py-2 align-top text-muted">{dong.groupName || "—"}</td>
                                              <td className="min-w-[14rem] whitespace-normal break-words px-2 py-2 align-top text-muted">{phieu.supplierName || "—"}</td>
                                              <td className="px-2 py-2 align-top text-right tabular-nums text-ink">{formatStockQty(dong.documentQty)}</td>
                                              <td className="px-2 py-2 align-top text-right tabular-nums text-ink">
                                                {phieu.status === "da_nhan" ? formatStockQty(dong.receivedQty) : "—"}
                                              </td>
                                              <td className="px-2 py-2 align-top text-muted">{dong.unit}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              ) : null}

              {suaId ? (
                <div className="overflow-hidden rounded-2xl border border-line bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-soft px-3 py-2">
                    <p className="text-sm font-semibold text-ink">Lịch sử thanh toán</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs text-muted">Không cộng vào chi phí công trình</p>
                      {canEdit && hopDongChoThanhToan(status) ? (
                        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setMoThemThanhToan((v) => !v)}>
                          <Plus className="size-4" />Thêm thanh toán
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="space-y-3 p-3">
                  {canEdit && hopDongChoThanhToan(status) && moThemThanhToan ? (
                    <div className="rounded-xl border border-line bg-soft/50 px-3 py-3">
                      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[140px_minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1.4fr)_auto]">
                        <label className="space-y-1 text-sm">
                          <span className="text-xs font-medium text-muted">Ngày</span>
                          <NgayNhap value={ttNgay} onChange={setTtNgay} className={cn(o, "w-full")} />
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-xs font-medium text-muted">Số tiền</span>
                          <input
                            className={cn(o, "tabular-nums")}
                            value={ttTien ? formatCount(Number(ttTien)) : ""}
                            onChange={(event) => setTtTien(digitsVnd(event.target.value))}
                            placeholder="0"
                            inputMode="numeric"
                          />
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-xs font-medium text-muted">Người chi</span>
                          <select className={o} value={ttNguoi} onChange={(event) => setTtNguoi(event.target.value)}>
                            <option value="">Chọn người chi</option>
                            {staff.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                          </select>
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-xs font-medium text-muted">Ghi chú</span>
                          <input className={o} value={ttGhi} onChange={(event) => setTtGhi(event.target.value)} placeholder="Nội dung thanh toán" />
                        </label>
                        <Button type="button" className="h-9 shrink-0 gap-1.5 px-4" disabled={dangLuu} onClick={() => void themThanhToan()}>
                          <Save className="size-4" />Lưu
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  <ul className="space-y-2">
                    {advances.length === 0 ? <li className="px-1 py-4 text-center text-sm text-muted">Chưa có thanh toán.</li> : null}
                    {advances.map((dong) => {
                      const nguoiChi = staff.find((item) => item.id === dong.payerId)?.name || "—";
                      return (
                        <li
                          key={dong.id}
                          className="grid items-center gap-3 rounded-xl border border-line bg-soft/50 px-3 py-2 text-sm"
                          style={{ gridTemplateColumns: canEdit ? "7.5rem 8.5rem minmax(11rem,14rem) minmax(0,1fr) auto" : "7.5rem 8.5rem minmax(11rem,14rem) minmax(0,1fr)" }}
                        >
                          <span className="tabular-nums text-ink">{ngayHien(dong.occurredOn)}</span>
                          <span className="text-right font-medium tabular-nums text-ink">{formatCount(dong.amount)}</span>
                          <span className="inline-flex h-6 max-w-full items-center truncate rounded-full border border-line bg-white px-2.5 text-xs font-medium text-ink" title={`Người chi: ${nguoiChi}`}>
                            Người chi: {nguoiChi}
                          </span>
                          <span className="truncate text-muted">Ghi chú: {dong.note || "—"}</span>
                          {canEdit ? (
                            <ActionBadge tone="danger" className="justify-self-end" onClick={() => void xoaThanhToan(dong.id)}>
                              <Trash2 className="size-3.5" aria-hidden /> Xóa
                            </ActionBadge>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                  </div>
                </div>
              ) : null}

              <div className="overflow-hidden rounded-2xl border border-line bg-white">
                <div className="flex items-center justify-between border-b border-line bg-soft px-3 py-2">
                  <p className="text-sm font-semibold text-ink">Thông tin hợp đồng</p>
                  <p className="text-xs text-muted">Xưởng · trạng thái · ngày ký</p>
                </div>
                <div className="grid gap-3 p-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-xs font-medium text-muted">Xưởng gia công</span>
                    <select className={o} value={partnerId} disabled={!canEdit} onChange={(event) => setPartnerId(event.target.value)}>
                      <option value="">Chọn xưởng</option>
                      {workshops.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-xs font-medium text-muted">Trạng thái hợp đồng</span>
                    <select className={o} value={status} disabled={!canEdit} title={contractStatusMoTa[status as keyof typeof contractStatusMoTa]} onChange={(event) => setStatus(event.target.value)}>
                      {contractStatusList.map((id) => (
                        <option key={id} value={id} title={contractStatusMoTa[id]}>{fabricationStatusLabel[id]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm sm:col-span-2">
                    <span className="text-xs font-medium text-muted">Tên hợp đồng</span>
                    <input className={o} value={name} disabled={!canEdit} onChange={(event) => setName(event.target.value)} placeholder="Gia công kính Dom C" />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-xs font-medium text-muted">Ngày ký</span>
                    <NgayNhap value={signedOn} onChange={setSignedOn} disabled={!canEdit} />
                  </label>
                  <label className="space-y-1 text-sm sm:col-span-2">
                    <span className="text-xs font-medium text-muted">Ghi chú</span>
                    <input className={o} value={note} disabled={!canEdit} onChange={(event) => setNote(event.target.value)} />
                  </label>
                </div>
              </div>
            </div>

            {canEdit ? (
              <SheetFooter className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm text-muted" title="Áp VAT mặc định cho mọi dòng">
                  <Percent className="size-3.5 shrink-0" aria-hidden />
                  <span>VAT mặc định</span>
                  <select
                    value={taxBps}
                    disabled={!canEdit}
                    onChange={(event) => {
                      // Đổi VAT footer → áp luôn cho toàn bộ dòng; header tổng chạy theo.
                      const next = Number(event.target.value);
                      setTaxBps(next);
                      setLines((current) => current.map((item) => ({ ...item, taxBps: next })));
                    }}
                    className="h-9 rounded-md border border-line bg-white px-2 text-sm font-semibold tabular-nums text-ink outline-none focus:border-primary"
                  >
                    {fabricationVatBpsOptions.map((bps) => (
                      <option key={bps} value={bps}>{bps / 100}%</option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {loi ? (
                    <span className="inline-flex h-8 items-center rounded-full border border-danger/30 bg-danger/10 px-3 text-xs font-medium text-danger" role="alert">
                      {loi}
                    </span>
                  ) : null}
                  {bao ? (
                    <span className="inline-flex h-8 items-center rounded-full border border-emerald-300 bg-emerald-100 px-3 text-xs font-semibold text-emerald-700">
                      {bao}
                    </span>
                  ) : null}
                  {suaId && !hopDongDangKhoa(status) ? (
                    <Button type="button" variant="outline" className="gap-1.5 text-danger" onClick={() => setXoaId(suaId)} disabled={dangLuu}>
                      <Trash2 className="size-4" />Xóa hợp đồng
                    </Button>
                  ) : null}
                  <Button type="button" className="gap-1.5" disabled={dangLuu || workshops.length === 0} onClick={() => void luu()}>
                    <Save className="size-4" />
                    {dangLuu ? "Đang lưu" : "Lưu hợp đồng"}
                  </Button>
                </div>
              </SheetFooter>
            ) : (
              <SheetFooter className="flex flex-wrap items-center justify-end gap-2 bg-white">
                {loi ? (
                  <span className="inline-flex h-8 items-center rounded-full border border-danger/30 bg-danger/10 px-3 text-xs font-medium text-danger" role="alert">
                    {loi}
                  </span>
                ) : null}
                {bao ? (
                  <span className="inline-flex h-8 items-center rounded-full border border-emerald-300 bg-emerald-100 px-3 text-xs font-semibold text-emerald-700">
                    {bao}
                  </span>
                ) : null}
                <Button type="button" variant="outline" onClick={() => setMo(false)}>
                  <X className="size-4" aria-hidden /> Đóng
                </Button>
              </SheetFooter>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet riêng xem chứng từ — tránh nested trong sheet HĐ. */}
      <Sheet open={xemChungTu !== null} onOpenChange={(open) => { if (!open) setXemChungTu(null); }}>
        <SheetContent className="z-[70] flex w-full flex-col gap-0 border-0 bg-slate-950 p-0 text-white sm:max-w-3xl">
          {xemChungTu ? (
            <ChungTuSlide
              code={xemChungTu.code}
              photos={xemChungTu.photos}
              index={xemChungTu.index}
              onIndex={(index) => setXemChungTu((hien) => (hien ? { ...hien, index } : hien))}
              onStep={(delta) => setXemChungTu((hien) => {
                if (!hien || hien.photos.length < 2) return hien;
                const n = hien.photos.length;
                return { ...hien, index: (hien.index + delta + n) % n };
              })}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={Boolean(xoaId)} onOpenChange={(open) => { if (!open) setXoaId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa hợp đồng gia công</AlertDialogTitle>
            <AlertDialogDescription>Chỉ xóa được khi chưa có thanh toán. Thao tác không hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setXoaId(null)}><X className="size-4" aria-hidden /> Hủy</Button>
            <Button type="button" disabled={dangLuu} onClick={() => void xoaHop()}><Trash2 className="size-4" aria-hidden /> Xóa</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
