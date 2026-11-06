import * as XLSX from "xlsx";
import { canonMeasureUnit } from "@/shared/catalog/units";
import { formatQuantityMilli, formatUnitPrice } from "@/modules/projects/item-fields";

/** Bậc đơn giá: 3 bậc LV Door hoặc cột «Đơn giá» thường trên báo giá. */
export type BacDonGia = "ban_dau" | "l1" | "l2" | "don_gia";

export const nhanBacDonGia: Record<BacDonGia, string> = {
  ban_dau: "Đơn giá ban đầu",
  l1: "Điều chỉnh L1",
  l2: "Điều chỉnh L2",
  don_gia: "Đơn giá",
};

export type HangMucTuExcel = {
  symbol: string;
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

type CotCoBan = {
  stt: number;
  kyHieu: number;
  ten: number;
  quyCach: number;
  quyCachCao: number;
  donVi: number;
  soLuong: number;
  khoiLuong: number;
  rong: number;
  cao: number;
  dienTich: number;
  donGia: number;
  thanhTien: number;
  ghiChu: number;
};

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
  for (const cell of row) {
    const nhan = oChu(cell).toLocaleLowerCase("vi");
    if (nhan === "stt") return true;
    if (nhan === "kh" || nhan.includes("ký hiệu")) return true;
    if (nhan.includes("tên công tác") || nhan.includes("chủng loại") || nhan.includes("nội dung")) return true;
  }
  return false;
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
function layDonGiaTheoBac(
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

/** Báo giá thường: cột «Đơn giá» + «Thành tiền». */
function layDonGiaDon(row: unknown[], quantityMilli: number, cot: CotCoBan): number {
  if (cot.thanhTien >= 0) {
    const thanhTien = oSo(row[cot.thanhTien]);
    if (thanhTien !== null) return donGiaKhopThanhTien(thanhTien, quantityMilli);
  }
  if (cot.donGia >= 0) {
    const donGia = oSo(row[cot.donGia]);
    if (donGia !== null) return Math.round(donGia);
  }
  return 0;
}

function timCotCoBan(hang1: unknown[], hang2: unknown[]): CotCoBan {
  let stt = 0;
  let kyHieu = 1;
  let ten = 2;
  let quyCach = -1;
  let quyCachCao = -1;
  let donVi = 3;
  let soLuong = -1;
  let khoiLuong = -1;
  let rong = -1;
  let cao = -1;
  let dienTich = -1;
  let donGia = -1;
  let thanhTien = -1;
  let ghiChu = -1;

  for (let i = 0; i < hang1.length; i += 1) {
    const nhan = oChu(hang1[i]).toLocaleLowerCase("vi").replace(/\s+/g, " ");
    if (!nhan) continue;
    if (nhan === "stt") stt = i;
    else if (nhan === "kh" || nhan === "ký hiệu" || nhan.includes("ký hiệu")) kyHieu = i;
    else if (
      nhan.includes("chủng loại sản phẩm")
      || nhan.includes("chủng loại")
      || nhan.includes("tên công tác")
      || nhan.includes("nội dung")
    ) {
      ten = i;
    } else if (nhan.includes("quy cách")) quyCach = i;
    // «Khối lượng…» phải trước «đơn vị» — tránh «Khối lượng đơn vị» bị nhận nhầm thành Đvt.
    else if (nhan.includes("khối lượng")) khoiLuong = i;
    else if (nhan === "đơn vị" || nhan.includes("đơn vị tính") || (nhan.includes("đơn vị") && !nhan.includes("giá"))) {
      donVi = i;
    } else if (nhan.includes("tổng số lượng") || nhan.includes("số lượng")) soLuong = i;
    else if (nhan.includes("thành tiền")) thanhTien = i;
    // «Đơn giá» thường — không lẫn nhóm «tổng đơn giá» của sheet 3 bậc.
    else if (nhan.includes("đơn giá") && !nhan.includes("tổng đơn giá") && !nhan.includes("ban đầu")) donGia = i;
    else if (nhan.includes("ghi chú")) ghiChu = i;
  }
  for (let i = 0; i < hang2.length; i += 1) {
    const nhan = oChu(hang2[i]).toLocaleLowerCase("vi");
    if (nhan.startsWith("s (") || nhan === "s" || nhan.includes("(m2)")) dienTich = i;
    else if (nhan.includes("rộng")) rong = i;
    else if (nhan.includes("cao") && nhan !== "h") cao = i;
  }
  // Sheet BOQ: hàng phụ dưới «Quy cách (mm)» là W / H.
  if (quyCach >= 0) {
    const w = oChu(hang2[quyCach]).toLocaleLowerCase("vi");
    const h = oChu(hang2[quyCach + 1] ?? "").toLocaleLowerCase("vi");
    if (w === "w" || w.includes("rộng")) {
      if (h === "h" || h.includes("cao")) quyCachCao = quyCach + 1;
    }
  }
  return {
    stt,
    kyHieu,
    ten,
    quyCach,
    quyCachCao,
    donVi,
    soLuong,
    khoiLuong,
    rong,
    cao,
    dienTich,
    donGia,
    thanhTien,
    ghiChu,
  };
}

function chuanNoiDung(tenDay: string) {
  const than = tenDay
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .join("\n");
  return (than || "Hạng mục").slice(0, 8000);
}

/**
 * Khối lượng: S(m2) → khối lượng đơn vị → số lượng.
 * Sheet 3 bậc có cột S: thiếu S thì bỏ dòng (không lấy «số cái» làm KL).
 */
function layKhoiLuongMilli(row: unknown[], cot: CotCoBan, batBuocS = false): number | null {
  if (cot.dienTich >= 0) {
    const s = oSo(row[cot.dienTich]);
    if (s !== null && s > 0) return Math.round(s * 1000);
    if (batBuocS) return null;
  }
  if (cot.khoiLuong >= 0) {
    const kl = oSo(row[cot.khoiLuong]);
    if (kl !== null && kl > 0) return Math.round(kl * 1000);
  }
  if (cot.soLuong >= 0) {
    const sl = oSo(row[cot.soLuong]);
    if (sl !== null && sl > 0) return Math.round(sl * 1000);
  }
  return null;
}

function layQuyCach(row: unknown[], cot: CotCoBan): string {
  if (cot.quyCach < 0) return "";
  if (cot.quyCachCao >= 0) {
    const rong = oSo(row[cot.quyCach]);
    const cao = oSo(row[cot.quyCachCao]);
    if (rong !== null && cao !== null) return `${rong}×${cao}`;
  }
  return oChu(row[cot.quyCach]).slice(0, 4000);
}

/**
 * Đọc file đơn giá / báo giá Excel thành hạng mục.
 * Hỗ trợ sheet 3 bậc (ban đầu/L1/L2) và báo giá cột «Đơn giá» thường.
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
  for (let i = 0; i < Math.min(rows.length, 20); i += 1) {
    if (dongTieuDe(rows[i] ?? [])) {
      chiSoTieuDe = i;
      break;
    }
  }
  if (chiSoTieuDe < 0) throw new Error("Không nhận ra bảng hạng mục (thiếu dòng STT / KH / Nội dung).");

  const hang1 = rows[chiSoTieuDe] ?? [];
  const hang2 = rows[chiSoTieuDe + 1] ?? [];
  const cot = timCotCoBan(hang1, hang2);
  const nhom = timNhomGia(hang1);

  let bac: BacDonGia = "don_gia";
  let tatCa: { bac: BacDonGia; gia: CotGia }[] = [];
  let dungBacNhieu = false;

  if (nhom.length > 0) {
    const chon = chonBacDangHien(nhom, hang2, sheet["!cols"]);
    bac = chon.bac;
    tatCa = chon.tatCa;
    dungBacNhieu = true;
  } else if (cot.donGia < 0 && cot.thanhTien < 0) {
    throw new Error("Không tìm thấy cột đơn giá trên file.");
  }

  const hangMuc: HangMucTuExcel[] = [];
  for (let i = chiSoTieuDe + 1; i < rows.length; i += 1) {
    // Bỏ qua đúng 1 dòng phụ đề (W/H) nếu có; các dòng còn lại là dữ liệu.
    if (i === chiSoTieuDe + 1) {
      const phu = hang2.some((cell) => {
        const nhan = oChu(cell).toLocaleLowerCase("vi");
        return nhan === "w" || nhan === "h" || nhan.includes("rộng") || nhan.includes("cao") || nhan.includes("vật tư");
      });
      if (phu) continue;
    }

    const row = rows[i] ?? [];
    if (dongTong(row)) continue;

    const kyHieu = oChu(row[cot.kyHieu]);
    const tenDay = oChu(row[cot.ten]);
    if (!kyHieu && !tenDay) continue;

    const donViTho = oChu(row[cot.donVi]);
    // Dòng nhóm (chỉ tên mục) — bỏ qua.
    if (!kyHieu && !donViTho) continue;

    const quantityMilli = layKhoiLuongMilli(row, cot, dungBacNhieu && cot.dienTich >= 0);
    if (quantityMilli === null || quantityMilli <= 0) continue;

    const donGia = dungBacNhieu
      ? layDonGiaTheoBac(row, quantityMilli, bac, tatCa)
      : layDonGiaDon(row, quantityMilli, cot);
    if (donGia === 0 && (dungBacNhieu || cot.donGia < 0)) {
      // Cho phép 0 nếu có thành tiền suy ra; còn không thì bỏ dòng nhóm có KL nhưng không giá.
      const coGia = dungBacNhieu
        || (cot.donGia >= 0 && oSo(row[cot.donGia]) !== null)
        || (cot.thanhTien >= 0 && oSo(row[cot.thanhTien]) !== null);
      if (!coGia) continue;
    }

    const unit = canonMeasureUnit(donViTho || "m2") ?? canonMeasureUnit((donViTho || "m2").replace("²", "2")) ?? "m2";
    const name = chuanNoiDung(tenDay);
    const spec = layQuyCach(row, cot);

    const soCai = cot.soLuong >= 0 ? oSo(row[cot.soLuong]) : null;
    const rong = cot.rong >= 0 ? oSo(row[cot.rong]) : cot.quyCach >= 0 ? oSo(row[cot.quyCach]) : null;
    const cao = cot.cao >= 0 ? oSo(row[cot.cao]) : cot.quyCachCao >= 0 ? oSo(row[cot.quyCachCao]) : null;
    const ghiChuFile = cot.ghiChu >= 0 ? oChu(row[cot.ghiChu]) : "";
    const phu: string[] = [];
    if (soCai !== null) phu.push(`Số lượng: ${soCai}`);
    if (rong !== null && cao !== null && !spec.includes("×")) phu.push(`KT: ${rong}×${cao}`);
    if (ghiChuFile) phu.push(ghiChuFile);

    hangMuc.push({
      symbol: kyHieu.slice(0, 120),
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
