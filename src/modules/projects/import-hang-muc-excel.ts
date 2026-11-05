import * as XLSX from "xlsx";
import { canonMeasureUnit } from "@/shared/catalog/units";
import { formatQuantityMilli, formatUnitPrice } from "@/modules/projects/item-fields";

/** Ba bậc đơn giá trên file đơn giá nhôm LV Door. */
export type BacDonGia = "ban_dau" | "l1" | "l2";

export const nhanBacDonGia: Record<BacDonGia, string> = {
  ban_dau: "Đơn giá ban đầu",
  l1: "Điều chỉnh L1",
  l2: "Điều chỉnh L2",
};

export type HangMucTuExcel = {
  name: string;
  spec: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  note: string;
};

export type KetQuaNapExcel = {
  hangMuc: HangMucTuExcel[];
  bac: BacDonGia;
};

type CotGia = { vatTu: number; nhanCong: number; tongDonGia: number; thanhTien: number };

function oChu(value: unknown) {
  return String(value ?? "").replace(/\r\n/g, "\n").replace(/\u00a0/g, " ").trim();
}

function oSo(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = oChu(value).replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (!raw) return null;
  const so = Number(raw);
  return Number.isFinite(so) ? so : null;
}

function dongTieuDe(row: unknown[]) {
  const a = oChu(row[0]).toLocaleLowerCase("vi");
  const b = oChu(row[1]).toLocaleLowerCase("vi");
  const c = oChu(row[2]).toLocaleLowerCase("vi");
  return a === "stt" || b.includes("ký hiệu") || c.includes("tên công tác");
}

function dongTong(row: unknown[]) {
  const a = oChu(row[0]).toLocaleLowerCase("vi");
  return a.startsWith("tổng") || a.startsWith("thuế") || a === "sch (s1)";
}

function cotDangAn(cols: XLSX.ColInfo[] | undefined, index: number) {
  const info = cols?.[index];
  return Boolean(info?.hidden);
}

function timNhomGia(hang1: unknown[]): { bac: BacDonGia; start: number }[] {
  const nhom: { bac: BacDonGia; start: number }[] = [];
  for (let i = 0; i < hang1.length; i += 1) {
    const tieu = oChu(hang1[i]).toLocaleLowerCase("vi");
    if (!tieu) continue;
    if (tieu.includes("ban đầu")) nhom.push({ bac: "ban_dau", start: i });
    else if (tieu.includes("l1")) nhom.push({ bac: "l1", start: i });
    else if (tieu.includes("l2")) nhom.push({ bac: "l2", start: i });
  }
  return nhom;
}

function docCotGia(hang2: unknown[], start: number): CotGia {
  let vatTu = start;
  let nhanCong = start + 1;
  let tongDonGia = start + 2;
  let thanhTien = start + 3;
  for (let i = start; i < Math.min(start + 6, hang2.length); i += 1) {
    const nhan = oChu(hang2[i]).toLocaleLowerCase("vi");
    if (nhan.includes("vật tư")) vatTu = i;
    else if (nhan.includes("nhân công")) nhanCong = i;
    else if (nhan.includes("tổng đơn giá")) tongDonGia = i;
    else if (nhan.includes("thành tiền")) thanhTien = i;
  }
  return { vatTu, nhanCong, tongDonGia, thanhTien };
}

/** Chọn bậc giá đang hiện trên sheet; nếu nhiều bậc hiện thì lấy bậc cuối (thường là L2). */
function chonBacDangHien(
  nhom: { bac: BacDonGia; start: number }[],
  hang2: unknown[],
  cols: XLSX.ColInfo[] | undefined,
): { bac: BacDonGia; tatCa: { bac: BacDonGia; gia: CotGia }[] } {
  const tatCa = nhom.map((item) => ({ bac: item.bac, gia: docCotGia(hang2, item.start) }));
  const dangHien = tatCa.filter((item) => !cotDangAn(cols, item.gia.tongDonGia));
  const chon = (dangHien.length > 0 ? dangHien : tatCa).at(-1);
  if (!chon) throw new Error("Không tìm thấy cột đơn giá trên file.");
  return { bac: chon.bac, tatCa };
}

/** Chọn đơn giá sao cho thành tiền ≈ đơn giá × khối lượng (khớp cột thành tiền Excel). */
function donGiaKhopThanhTien(thanhTien: number, quantityMilli: number) {
  if (quantityMilli <= 0) return 0;
  const mucTieu = Math.round(thanhTien);
  const goc = Math.round((mucTieu * 1000) / quantityMilli);
  let totNhat = goc;
  let lechNho = Number.POSITIVE_INFINITY;
  for (const thu of [goc - 1, goc, goc + 1]) {
    const thanh = Math.round((thu * quantityMilli) / 1000);
    const lech = Math.abs(thanh - mucTieu);
    if (lech < lechNho) {
      lechNho = lech;
      totNhat = thu;
    }
  }
  return totNhat;
}

/**
 * Ưu tiên cột thành tiền bậc đang hiện (kể cả âm), suy ra đơn giá khớp thành tiền.
 * Không có thành tiền thì lấy tổng đơn giá; rồi mới thử các bậc khác.
 */
function layDonGia(
  row: unknown[],
  quantityMilli: number,
  bacUuTien: BacDonGia,
  tatCa: { bac: BacDonGia; gia: CotGia }[],
): number {
  const thuTu = [
    ...tatCa.filter((item) => item.bac === bacUuTien),
    ...tatCa.filter((item) => item.bac !== bacUuTien),
  ];
  for (const { gia } of thuTu) {
    const thanhTien = oSo(row[gia.thanhTien]);
    if (thanhTien !== null) return donGiaKhopThanhTien(thanhTien, quantityMilli);
  }
  for (const { gia } of thuTu) {
    const tong = oSo(row[gia.tongDonGia]);
    if (tong !== null) return Math.round(tong);
  }
  return 0;
}

function timCotCoBan(hang1: unknown[], hang2: unknown[]) {
  let stt = 0;
  let kyHieu = 1;
  let ten = 2;
  let donVi = 3;
  let soLuong = 4;
  let rong = 5;
  let cao = 6;
  let dienTich = 7;
  let ghiChu = 23;

  for (let i = 0; i < hang1.length; i += 1) {
    const nhan = oChu(hang1[i]).toLocaleLowerCase("vi");
    if (nhan === "stt") stt = i;
    else if (nhan.includes("ký hiệu")) kyHieu = i;
    else if (nhan.includes("tên công tác") || nhan.includes("nội dung")) ten = i;
    else if (nhan === "đơn vị") donVi = i;
    else if (nhan.includes("tổng số lượng") || nhan === "số lượng") soLuong = i;
    else if (nhan.includes("ghi chú")) ghiChu = i;
  }
  for (let i = 0; i < hang2.length; i += 1) {
    const nhan = oChu(hang2[i]).toLocaleLowerCase("vi");
    if (nhan.includes("rộng")) rong = i;
    else if (nhan.includes("cao")) cao = i;
    else if (nhan.startsWith("s (") || nhan === "s" || nhan.includes("(m2)")) dienTich = i;
  }
  return { stt, kyHieu, ten, donVi, soLuong, rong, cao, dienTich, ghiChu };
}

/** Excel chỉ có một khối nội dung — đưa hết vào cột Nội dung, không tách Quy cách. */
function catNoiDung(kyHieu: string, tenDay: string) {
  const than = tenDay
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .join("\n");
  const name = kyHieu ? (than ? `${kyHieu} — ${than}` : kyHieu) : than || "Hạng mục";
  return { name: name.slice(0, 8000), spec: "" };
}

/**
 * Đọc file đơn giá Excel thành hạng mục.
 * Tự lấy bậc đơn giá đang hiện (không ẩn cột); khối lượng = S(m2).
 */
export async function docHangMucTuExcel(file: File): Promise<KetQuaNapExcel> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("File Excel không có sheet nào.");
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  }) as unknown[][];

  let chiSoTieuDe = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i += 1) {
    if (dongTieuDe(rows[i] ?? [])) {
      chiSoTieuDe = i;
      break;
    }
  }
  if (chiSoTieuDe < 0) throw new Error("Không nhận ra bảng đơn giá (thiếu dòng STT / Tên công tác).");

  const hang1 = rows[chiSoTieuDe] ?? [];
  const hang2 = rows[chiSoTieuDe + 1] ?? [];
  const nhom = timNhomGia(hang1);
  if (nhom.length === 0) throw new Error("Không tìm thấy cột đơn giá trên file.");
  const { bac, tatCa } = chonBacDangHien(nhom, hang2, sheet["!cols"]);
  const cot = timCotCoBan(hang1, hang2);

  const hangMuc: HangMucTuExcel[] = [];
  for (let i = chiSoTieuDe + 2; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    if (dongTong(row)) continue;

    const kyHieu = oChu(row[cot.kyHieu]);
    const tenDay = oChu(row[cot.ten]);
    if (!kyHieu && !tenDay) continue;
    // Bỏ dòng tiêu đề nhóm (không có ký hiệu, không có S).
    if (!kyHieu && !oChu(row[cot.donVi])) continue;

    const dienTich = oSo(row[cot.dienTich]);
    if (dienTich === null || dienTich <= 0) continue;
    const quantityMilli = Math.round(dienTich * 1000);
    const donGia = layDonGia(row, quantityMilli, bac, tatCa);

    const donViTho = oChu(row[cot.donVi]) || "m2";
    const unit = canonMeasureUnit(donViTho) ?? canonMeasureUnit(donViTho.replace("²", "2")) ?? "m2";
    const { name, spec } = catNoiDung(kyHieu, tenDay);

    const soCai = oSo(row[cot.soLuong]);
    const rong = oSo(row[cot.rong]);
    const cao = oSo(row[cot.cao]);
    const ghiChuFile = oChu(row[cot.ghiChu]);
    const phu: string[] = [];
    if (soCai !== null) phu.push(`Số lượng: ${soCai} cái`);
    if (rong !== null && cao !== null) phu.push(`KT: ${rong}×${cao} m`);
    if (ghiChuFile) phu.push(ghiChuFile);

    hangMuc.push({
      name,
      spec,
      unit,
      quantity: formatQuantityMilli(quantityMilli),
      unitPrice: formatUnitPrice(donGia),
      note: phu.join(" · "),
    });
  }

  if (hangMuc.length === 0) throw new Error("Không có dòng hạng mục hợp lệ trong file.");
  return { hangMuc, bac };
}
