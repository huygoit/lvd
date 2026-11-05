import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "@/shared/errors";
import { isVatPercent } from "@/shared/catalog/vat";

// Đổi khi đổi logic parse sau Claude — cache file PDF cũ vẫn tái dùng được nếu cùng ver.
const PARSE_CACHE_VER = "3";

export type PdfLine = {
  code: string;
  name: string;
  spec: string;
  unit: string;
  colorCode: string;
  barCount: number;
  lengthM: number;
  kgPerM: number;
  totalKg: number;
  quantity: number;
  unitPrice: number;
  vatPercent: number;
  widthMm: number;
  heightMm: number;
};

export type VatMode = "gom_vat" | "chua_vat" | "khong_ro";

// Khoản phí cộng thêm ngoài dòng hàng (không nhập kho).
export type PdfSurcharge = {
  name: string;
  quantity: number;
  unitPrice: number;
  vatPercent: number;
};

export type PdfOrder = {
  kind: "nhom" | "bo_cai" | "kinh";
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
  headerNote: string;
  // Trạng thái VAT theo ghi chú trên đơn: gom_vat / chua_vat / khong_ro.
  vatMode: VatMode;
  // Bảng PDF có cột VAT từng dòng hay không. Có → chua_vat, tin % từng dòng.
  vatInline: boolean;
  // Mức thuế 0/5/8/10 đọc được trên đơn. null = không thấy → cần popup.
  vatPercent: number | null;
  // Giữ tương thích DB/UI cũ — không dùng để quyết định gom/chua hay popup.
  vatTongDaTinh: boolean;
  vatTongTien: number;
  // Câu ngắn giải thích vatMode hoặc mức thuế.
  vatEvidence: string;
  // Phụ thu / phí cộng thêm bóc ngoài bảng hàng.
  surcharges: PdfSurcharge[];
  // Đặt cọc / tạm ứng: tỉ lệ % (50 = 50%), số tiền tuyệt đối, câu gốc.
  depositPercent: number;
  depositAmount: number;
  depositNote: string;
  lines: PdfLine[];
};

const prompt = `Bạn đọc PDF đơn đặt hàng / báo giá / hợp đồng mua bán và trả ĐÚNG MỘT object JSON (không markdown, không giải thích ngoài JSON).

## 1. Phân loại kind (chỉ một trong ba)
- "nhom": bảng thanh nhôm (mã, diễn giải, màu, số thanh, mét dài, kg/m, tổng kg, đơn giá/kg).
- "bo_cai": phụ kiện theo bộ/cái/chiếc (mã, tên, ĐVT, SL, đơn giá; VAT dòng nếu có).
- "kinh": bảng kính theo ô/ký hiệu (ký hiệu, rộng mm, cao mm, số tấm, đơn giá/m²).

Bỏ khỏi lines: tiêu đề nhóm, dòng trống, "Cộng tiền hàng", "Tổng cộng", điều khoản dài, chữ ký.
Đặt cọc / tạm ứng → deposit*. Phí phụ đã cộng trên đơn → surcharges. Không nhét hai nhóm này vào lines.

## 2. Bên bán (nhà cung cấp)
Lấy khối Bên bán / đầu thư / logo — KHÔNG lấy Khách hàng / Bên mua.
- supplierName, supplierAddress, supplierPhone (hotline bên bán; nhiều số thì số đầu; không lấy SĐT người liên hệ khách).
- supplierBankName, supplierAccountNumber (STK bên bán).
- supplierWebsite, supplierEmail, supplierTaxCode (MST bên bán; không nhầm STK).
- supplierRepresentativeName / Title: người ký bên bán. Không có tên người → "".
Không thấy trường nào → "".

## 3. headerNote
Một câu ngắn: hạng mục / đợt / công trình / hệ nhôm… nếu có. Không có → "".

## 4. Thuế VAT / GTGT (cùng một loại thuế)
Tách ba tín hiệu độc lập — chỉ theo ngữ nghĩa trên giấy, không đoán.

### 4.1. vatInline
true chỉ khi BẢNG HÀNG có cột VAT/GTGT từng dòng và các dòng điền số thuế.
Khi vatInline=true: vatMode luôn "chua_vat"; vatPercent từng dòng = đúng số trên cột (5/8/10…).

### 4.2. vatMode (khi vatInline=false)
Chỉ theo câu chữ đã gồm / chưa gồm:
- "gom_vat": đã bao gồm VAT/GTGT/thuế; giá đã gồm thuế; tổng đã bao gồm GTGT…
- "chua_vat": chưa bao gồm VAT/GTGT; VAT tính riêng; cộng VAT…
- "khong_ro": không thấy câu rõ → giữ "khong_ro", KHÔNG đoán.

### 4.3. vatPercent (mức thuế cả đơn: 0 | 5 | 8 | 10 | null)
Chỉ lấy khi thấy NGỮ NGHĨA mức thuế, ví dụ:
- "GTGT 8%", "VAT 10%", "thuế suất 5%", "đã bao gồm thuế GTGT 8%"
- hoặc cột VAT dòng đa số là 5/8/10.
Quy tắc bắt buộc:
- Không thấy mức → vatPercent = null (JSON null, không phải 0).
- vatPercent trên từng line = 0 nghĩa là dòng không ghi thuế, KHÔNG phải thuế suất 0%.
- Chỉ ghi 0 khi đơn nói rõ miễn thuế / thuế 0% / không chịu thuế.
vatEvidence: một câu ngắn trích từ đơn giải thích vatMode hoặc mức thuế; không có → "".
vatTongDaTinh=false, vatTongTien=0 (không dùng).

## 5. surcharges (phụ thu) — dễ nhầm, đọc kỹ
CHỈ đưa khoản phí ĐÃ ĐƯỢC TÍNH VÀO ĐƠN NÀY:
- Có dòng/khoản phụ thu kèm số tiền của đơn này (ngoài bảng hàng hoặc dòng phụ thu có thành tiền).
- Ví dụ hợp lệ: "Phụ thu gia công … 1.500.000", "Cước vận chuyển … 500.000" đã cộng trên đơn.

KHÔNG đưa vào surcharges:
- Câu lưu ý / điều khoản / quy định có ĐIỀU KIỆN chưa áp cho đơn này.
- Ví dụ CẤM: "Mã dưới 10 thanh phụ thu 2.000.000đ/1 mã", "Nếu dưới N thanh thì phụ thu…", "Phụ thu khi…".
- Đó là chính sách; trừ khi đơn đã cộng sẵn một dòng/số tiền phụ thu tương ứng.
- Không đưa: tổng cộng, tiền hàng, đặt cọc, dòng hàng chính.

Mỗi phần tử: name, quantity (mặc định 1), unitPrice (số nguyên đồng, bỏ dấu chấm nghìn), vatPercent (không thì 0).
Không có khoản đã tính → surcharges = [] (mảng rỗng).

## 6. deposit (đặt cọc / tạm ứng)
Theo ngữ nghĩa điều khoản thanh toán:
- depositPercent: % nếu nêu tỷ lệ (ứng 50% → 50). Không có → 0.
- depositAmount: số tiền nếu nêu bằng đồng (số nguyên). Không có → 0.
- depositNote: một câu gốc. Không có → "".
Có thể vừa % vừa số tiền. Không nhầm đợt thanh toán sau (nghiệm thu…) với đặt cọc nếu không nói phải ứng trước.

## 7. lines theo kind
### nhom
code, name/diễn giải, colorCode=mã màu, barCount=số thanh, lengthM=mét dài, kgPerM, totalKg, unitPrice=đơn giá/kg, quantity không bắt buộc.
### bo_cai
code, name, spec, unit, quantity, unitPrice, vatPercent nếu có cột.
### kinh
code=ký hiệu cửa; widthMm, heightMm (mm; giữ nửa mm như 387.5; "1.250" = 1250); quantity=số tấm; unitPrice=đơn giá/m² (không phải giá/tấm).
name = "Kính {độ dày} {trong|mờ}" (ví dụ "Kính 8,38mm trong"). spec=ghi chú trong/mờ. colorCode nhận houseNote nếu tách theo nhà (ví dụ "CV 4 · HB 18").

## 8. Định dạng số & nguyên tắc chung
- Tiền: số nguyên đồng, bỏ dấu chấm ngăn nghìn (155.000 → 155000).
- Không bịa. Không thấy → "" hoặc 0 hoặc null đúng kiểu trường.
- kind chỉ: "nhom" | "bo_cai" | "kinh".

JSON mẫu (cấu trúc; giá trị minh họa):
{"kind":"kinh","supplierName":"","supplierCode":"","supplierAddress":"","supplierPhone":"","supplierBankName":"","supplierAccountNumber":"","supplierWebsite":"","supplierEmail":"","supplierTaxCode":"","supplierRepresentativeName":"","supplierRepresentativeTitle":"","headerNote":"","vatMode":"khong_ro","vatInline":false,"vatPercent":null,"vatTongDaTinh":false,"vatTongTien":0,"vatEvidence":"","surcharges":[],"depositPercent":0,"depositAmount":0,"depositNote":"","lines":[{"code":"","name":"","spec":"","unit":"tấm","colorCode":"","barCount":0,"lengthM":0,"kgPerM":0,"totalKg":0,"quantity":0,"unitPrice":0,"vatPercent":0,"widthMm":0,"heightMm":0}]}`;

function textOf(value: unknown) {
  return String(value ?? "").trim();
}

function num(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = textOf(value).replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const amount = Number(raw);
  return Number.isFinite(amount) ? amount : 0;
}

function money(value: unknown) {
  const amount = Math.round(num(value));
  return amount > 0 ? amount : 0;
}

function firstPhone(value: string) {
  const chunks = value.split(/[,;/|]|\s+hoặc\s+|\s+-\s+/i).map((part) => part.trim()).filter(Boolean);
  for (const chunk of chunks.length ? chunks : [value]) {
    const digits = chunk.replace(/\D/g, "");
    if (digits.length >= 9 && digits.length <= 12) return chunk.slice(0, 40);
  }
  return "";
}

function accountNumber(value: string) {
  const digits = value.replace(/[\s.-]/g, "");
  return /^\d{6,20}$/.test(digits) ? digits : "";
}

function fold(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function websiteOf(value: string) {
  for (const raw of textOf(value).split(/[\s,;]+/)) {
    const token = raw.replace(/^https?:\/\//i, "").replace(/[),.;]+$/, "").split("/")[0] ?? "";
    if (!token || token.length > 200 || token.includes("@")) continue;
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(token)) continue;
    return token.slice(0, 200);
  }
  return "";
}

function emailOf(value: string) {
  const token = textOf(value).toLowerCase().split(/[\s,;]/).find((part) => part.includes("@")) ?? "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(token) ? token.slice(0, 120) : "";
}

function taxCodeOf(value: string) {
  const match = textOf(value).replace(/\s/g, "").match(/\d{10}(?:-?\d{3})?/);
  if (!match) return "";
  const digits = match[0].replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 13) return `${digits.slice(0, 10)}-${digits.slice(10)}`;
  return "";
}

function personName(value: string, supplierName: string) {
  const name = textOf(value).slice(0, 120);
  const folded = fold(name);
  const company = fold(supplierName);
  if (!folded) return "";
  if (company && (folded === company || company.includes(folded) || folded.includes(company))) return "";
  if (/\b(cong ty|chi nhanh|cty|ben ban|ben mua|khach hang)\b/.test(folded)) return "";
  return name;
}

export function cleanSupplierContact(supplierName: string, input: { website?: unknown; email?: unknown; taxCode?: unknown; representativeName?: unknown; representativeTitle?: unknown }, keepRepresentative = false) {
  const typedName = textOf(input.representativeName).slice(0, 120);
  const representativeName = keepRepresentative ? typedName : personName(typedName, supplierName);
  return {
    supplierWebsite: websiteOf(textOf(input.website)),
    supplierEmail: emailOf(textOf(input.email)),
    supplierTaxCode: taxCodeOf(textOf(input.taxCode)),
    supplierRepresentativeName: representativeName,
    supplierRepresentativeTitle: representativeName ? textOf(input.representativeTitle).slice(0, 80) : "",
  };
}

function foldGlass(spec: string) {
  const raw = spec.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  if (raw.includes("mo")) return " mờ";
  if (raw.includes("trong")) return " trong";
  return "";
}

function lineOf(value: unknown): PdfLine | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const code = textOf(row.code);
  const name = textOf(row.name);
  if (!code) return null;
  return {
    code,
    name,
    spec: textOf(row.spec),
    unit: textOf(row.unit),
    colorCode: textOf(row.colorCode),
    barCount: Math.max(0, Math.round(num(row.barCount))),
    lengthM: Math.max(0, num(row.lengthM)),
    kgPerM: Math.max(0, num(row.kgPerM)),
    totalKg: Math.max(0, num(row.totalKg)),
    quantity: Math.max(0, num(row.quantity)),
    unitPrice: money(row.unitPrice),
    vatPercent: Math.max(0, num(row.vatPercent)),
    widthMm: sizeMm(row.widthMm),
    heightMm: sizeMm(row.heightMm),
  };
}

// Kích thước mm từ PDF/JSON: giữ 0,1 mm. Phân biệt 1.250 (nghìn) với 387.5 (thập phân).
function sizeMm(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value * 10) / 10;
  }
  const raw = textOf(value).replace(/\s/g, "");
  if (!raw) return 0;
  let amount = NaN;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(raw) || /^\d+,\d+$/.test(raw)) {
    amount = Number(raw.replace(/\./g, "").replace(",", "."));
  } else {
    amount = Number(raw.replace(",", "."));
  }
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 10) / 10 : 0;
}

function parseOrder(raw: string): PdfOrder {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new AppError("Không đọc được bảng hàng trong tệp.", 400);
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    throw new AppError("Không đọc được bảng hàng trong tệp.", 400);
  }
  const kind = data.kind === "nhom" || data.kind === "bo_cai" || data.kind === "kinh" ? data.kind : "";
  if (!kind) throw new AppError("Tệp không phải đơn nhôm, đơn kính hoặc đơn bộ, cái.", 400);
  const thickness = textOf(data.thickness);
  const lines = (Array.isArray(data.lines) ? data.lines.map(lineOf).filter((line): line is PdfLine => line !== null) : []).map((line) => {
    if (kind !== "kinh") return line;
    const note = foldGlass(line.spec);
    const name = line.name || (thickness ? `Kính ${thickness}${note}` : "Kính");
    return { ...line, name, unit: "tấm", quantity: line.quantity || line.barCount };
  }).filter((line) => kind === "kinh" ? line.quantity > 0 || line.widthMm > 0 : Boolean(line.name));
  if (!lines.length) throw new AppError("Không bóc được dòng hàng nào trong tệp.", 400);
  if (lines.length > 800) throw new AppError("Tệp có quá nhiều dòng.", 400);
  const supplierName = textOf(data.supplierName).slice(0, 200);
  const supplierAddress = textOf(data.supplierAddress).slice(0, 300);
  const supplierPhone = firstPhone(textOf(data.supplierPhone));
  const missing = [supplierName ? "" : "tên nhà cung cấp"].filter(Boolean);
  if (missing.length) throw new AppError(`Đơn hàng không hợp lệ. Thiếu ${missing.join(", ")}.`, 400);
  const headerNote = textOf(data.headerNote).slice(0, 300);
  const surcharges = (Array.isArray(data.surcharges) ? data.surcharges : [])
    .map(surchargeOf)
    .filter((row): row is PdfSurcharge => row !== null)
    .slice(0, 50);
  const depositPercent = percentOf(data.depositPercent);
  const depositAmount = money(data.depositAmount);
  const depositNote = textOf(data.depositNote).slice(0, 300);
  return {
    kind,
    supplierName,
    supplierCode: textOf(data.supplierCode).slice(0, 40),
    supplierAddress,
    supplierPhone,
    supplierBankName: textOf(data.supplierBankName).slice(0, 80),
    supplierAccountNumber: accountNumber(textOf(data.supplierAccountNumber)),
    ...cleanSupplierContact(supplierName, {
      website: data.supplierWebsite,
      email: data.supplierEmail,
      taxCode: data.supplierTaxCode,
      representativeName: data.supplierRepresentativeName,
      representativeTitle: data.supplierRepresentativeTitle,
    }),
    headerNote,
    ...(() => {
      const vatInline = nhanVatInline(data.vatInline, lines);
      const vatEvidence = textOf(data.vatEvidence).slice(0, 300);
      const vatMode: VatMode = vatInline ? "chua_vat" : nhanVatMode(data.vatMode, `${headerNote} ${vatEvidence}`);
      const vatPercent = timMucThueVat(data.vatPercent, lines, headerNote, vatEvidence);
      return {
        vatInline,
        vatPercent,
        vatTongDaTinh: false,
        vatTongTien: 0,
        vatMode,
        vatEvidence,
      };
    })(),
    surcharges,
    depositPercent,
    depositAmount,
    depositNote,
    lines,
  };
}

function percentOf(value: unknown) {
  const amount = num(value);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  // Cho phép 0.5 nghĩa là 0.5%, hoặc 50 nghĩa là 50%. Chặn quá 100.
  const pct = amount > 100 ? 100 : amount;
  return Math.round(pct * 1000) / 1000;
}

function surchargeOf(raw: unknown): PdfSurcharge | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const name = textOf(row.name).slice(0, 300);
  if (!name) return null;
  // Lọc nhầm: tổng cộng, hoặc ghi chú điều kiện "nếu/dưới N thanh thì phụ thu" (không phải khoản đã tính).
  const chu = fold(name);
  if (chu.includes("tong cong") || chu.includes("cong tien") || chu === "tong") return null;
  if (
    (chu.includes("duoi") || chu.includes("neu") || chu.includes("khi ") || chu.includes("nho hon"))
    && (chu.includes("phu thu") || chu.includes("thu them") || chu.includes("phu phi"))
  ) return null;
  const quantity = num(row.quantity);
  return {
    name,
    quantity: quantity > 0 ? quantity : 1,
    unitPrice: money(row.unitPrice),
    vatPercent: Math.max(0, num(row.vatPercent)),
  };
}

function coChu(chu: string, mau: string[]) {
  return mau.some((item) => chu.includes(item));
}

// Ưu tiên vatMode Claude trả. Thiếu hoặc sai thì mới dò headerNote. Không rõ thì giữ khong_ro.
function nhanVatMode(flag: unknown, headerNote: string): VatMode {
  const raw = textOf(flag);
  if (raw === "gom_vat" || raw === "chua_vat" || raw === "khong_ro") return raw;
  const chu = fold(`${headerNote} ${raw}`);
  if (coChu(chu, [
    "chua bao gom vat", "chua bao gom gtgt", "chua co vat", "chua co gtgt",
    "khong bao gom vat", "khong bao gom gtgt", "khong co vat", "khong co gtgt",
    "vat tinh rieng", "gtgt tinh rieng", "cong vat", "cong gtgt",
    "chua gom thue", "chua bao gom thue", "chua gom gtgt", "gia chua gom",
    "gia chua bao gom", "tax excluded",
  ])) return "chua_vat";
  if (coChu(chu, [
    "bao gom vat", "bao gom gtgt", "bao gom thue",
    "da bao gom vat", "da bao gom gtgt", "da bao gom thue",
    "da bao gom thue gtgt", "bao gom thue gtgt",
    "gia da co vat", "gia da co gtgt", "gia da gom gtgt", "gia da gom vat",
    "don hang bao gom vat", "don hang bao gom gtgt",
    "don gia da bao gom", "gia tri don hang da bao gom",
    "gia bao gom vat", "gia bao gom gtgt", "da gom thue", "da gom gtgt",
  ])) return "gom_vat";
  return "khong_ro";
}

function nhanVatInline(flag: unknown, lines: PdfLine[]) {
  if (flag === true || flag === "true" || flag === 1 || flag === "1") return true;
  if (flag === false || flag === "false" || flag === 0 || flag === "0") return false;
  const coVat = lines.filter((line) => line.vatPercent > 0).length;
  return coVat >= Math.max(1, Math.ceil(lines.length / 2));
}

// Mức thuế 0/5/8/10 trên đơn. Không thấy → null (cần popup).
// Lưu ý: vatPercent=0 trên dòng PDF thường là "không ghi", KHÔNG phải thuế 0%.
export function timMucThueVat(
  flag: unknown,
  lines: PdfLine[],
  headerNote = "",
  vatEvidence = "",
): number | null {
  // Claude trả vatPercent cấp đơn: 0/null/thiếu = chưa rõ (trừ khi văn bản nói 0%).
  const tuSo = chuanMucThueRo(flag);
  if (tuSo !== null) return tuSo;
  const dem = new Map<number, number>();
  for (const line of lines) {
    // Bỏ qua 0 trên dòng — coi như chưa điền cột thuế.
    const muc = chuanMucThueRo(line.vatPercent);
    if (muc === null || muc === 0) continue;
    dem.set(muc, (dem.get(muc) ?? 0) + 1);
  }
  if (dem.size) {
    const [muc] = [...dem.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
    return muc;
  }
  const chu = fold(`${headerNote} ${vatEvidence}`);
  const khop = chu.match(/(?:gtgt|vat|thue(?:\s*suat)?)\s*(?:la\s*)?(\d{1,2})\s*%/);
  if (khop) return chuanMucThueRo(khop[1]);
  if (coChu(chu, ["thue gtgt 8", "gtgt 8", "vat 8", "thue 8%", "thue suat 8"])) return 8;
  if (coChu(chu, ["thue gtgt 10", "gtgt 10", "vat 10", "thue 10%", "thue suat 10"])) return 10;
  if (coChu(chu, ["thue gtgt 5", "gtgt 5", "vat 5", "thue 5%", "thue suat 5"])) return 5;
  if (coChu(chu, ["thue gtgt 0", "gtgt 0%", "vat 0%", "thue 0%", "khong chiu thue", "mien thue"])) return 0;
  return null;
}

// Chỉ nhận mức trong danh mục VAT dùng chung. Số 0 chỉ nhận khi gọi kèm choPhep0 (văn bản nói rõ 0%).
function chuanMucThueRo(value: unknown, choPhep0 = false): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (value === false) return null;
  const amount = typeof value === "number" ? value : Number(String(value).trim().replace(",", ".").replace("%", ""));
  if (!Number.isFinite(amount)) return null;
  const muc = Math.round(amount > 100 ? amount / 100 : amount);
  if (muc === 0) return choPhep0 ? 0 : null;
  return isVatPercent(muc) && muc !== 0 ? muc : null;
}

// Chỉ theo hash PDF (+ ver). Đổi PARSE_CACHE_VER khi muốn bỏ cache cũ sau khi sửa prompt lớn.
function khoaCachePdf(fileHash: string) {
  return path.resolve(process.cwd(), "storage", "pdf-claude-cache", `${PARSE_CACHE_VER}-${fileHash}.json`);
}

async function docCacheClaude(fileHash: string) {
  try {
    const raw = await readFile(khoaCachePdf(fileHash), "utf8");
    const data = JSON.parse(raw) as { ver?: string; text?: string };
    if (data.ver !== PARSE_CACHE_VER || typeof data.text !== "string" || !data.text.trim()) return null;
    return data.text;
  } catch {
    return null;
  }
}

async function ghiCacheClaude(fileHash: string, model: string, text: string) {
  try {
    const file = khoaCachePdf(fileHash);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify({ ver: PARSE_CACHE_VER, model, text, at: new Date().toISOString() }), "utf8");
  } catch (error) {
    console.warn("[pdf-cache] ghi thất bại", error);
  }
}

export async function readOrderPdf(file: Buffer, fileHash = ""): Promise<{ order: PdfOrder; fromCache: boolean }> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  const model = process.env.ANTHROPIC_MODEL?.trim();
  if (!key || !model) throw new AppError("Chưa cấu hình khóa đọc PDF.", 400);
  const hash = fileHash || createHash("sha256").update(file).digest("hex");

  // 1) Trùng hash PDF → không gọi Claude.
  const cached = await docCacheClaude(hash);
  if (cached) {
    console.info("[pdf-cache] HIT", hash.slice(0, 12));
    return { order: parseOrder(cached), fromCache: true };
  }
  console.info("[pdf-cache] MISS", hash.slice(0, 12));

  // 2) Prompt cố định trong system + cache_control (Anthropic).
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 16000,
      system: [
        {
          type: "text",
          text: prompt,
          cache_control: { type: "ephemeral", ttl: "1h" },
        },
      ],
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: file.toString("base64") } },
          { type: "text", text: "Đọc PDF đơn hàng và trả đúng một JSON theo hướng dẫn hệ thống." },
        ],
      }],
    }),
  });
  const body = await response.json().catch(() => ({})) as { error?: { message?: string }; content?: { type?: string; text?: string }[] };
  if (!response.ok) throw new AppError(body.error?.message || "Không đọc được tệp PDF.", 400);
  const text = (body.content ?? []).map((block) => block.text ?? "").join("\n");
  const order = parseOrder(text);
  await ghiCacheClaude(hash, model, text);
  return { order, fromCache: false };
}
