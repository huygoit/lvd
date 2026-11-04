import { AppError } from "@/shared/errors";

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
  // Trạng thái VAT theo ghi chú trên đơn.
  vatMode: VatMode;
  // Bảng PDF có cột VAT từng dòng hay không. Có thì tin dữ liệu dòng, không ép cả đơn.
  vatInline: boolean;
  // Dưới bảng đã có khối tính VAT tổng (tiền hàng / thuế GTGT / tổng sau thuế) hay chưa.
  // true → không suy ngược; không hỏi popup; thuế lấy đúng số tổng trên PDF.
  vatTongDaTinh: boolean;
  // Số thuế GTGT tổng dưới bảng (đồng). Không đọc được thì 0.
  vatTongTien: number;
  // Câu/chỗ dùng để nhận diện vatMode. Hiển thị tooltip khi cần.
  vatEvidence: string;
  // Phụ thu / phí cộng thêm bóc ngoài bảng hàng.
  surcharges: PdfSurcharge[];
  // Đặt cọc / tạm ứng: tỉ lệ % (50 = 50%), số tiền tuyệt đối, câu gốc.
  depositPercent: number;
  depositAmount: number;
  depositNote: string;
  lines: PdfLine[];
};

const prompt = `Đọc đơn đặt hàng hoặc hợp đồng mua bán trong PDF. Trả về một JSON, không markdown.
Có ba kiểu:
- nhom: bảng thanh nhôm. Cột mã hàng, diễn giải, mã màu, số thanh, độ dài mét, tỉ trọng kg/m, tổng kg, đơn giá theo kg. Bỏ dòng tiêu đề nhóm, dòng cộng tiền, tổng cộng. Khoản phí cộng thêm và phần đặt cọc/tạm ứng không đưa vào lines — tách sang surcharges và các trường deposit.
- bo_cai: bảng phụ kiện tính theo bộ hoặc chiếc. Cột mã, tên, mô tả, đơn vị, số lượng, đơn giá, VAT từng dòng nếu có. Bỏ điều khoản hợp đồng và dòng tổng. Phí cộng thêm / đặt cọc xử lý như trên.
- kinh: bảng thống kê kính. Mỗi dòng là một ký hiệu cửa. Cột ký hiệu, rộng mm, cao mm, số lượng tấm, đơn giá. Đơn giá là giá một mét vuông, ghi unitPrice, không phải giá một tấm. Nếu tách số tấm theo nhà thì ghi houseNote, ví dụ "CV 4 · HB 18". Ghi chú là kính trong hoặc kính mờ. Độ dày lấy ở tiêu đề. Đợt đặt và hạng mục ghi headerNote. code là ký hiệu cửa. name là "Kính {độ dày} {trong hoặc mờ}", ví dụ "Kính 6,38mm trong". Bỏ dòng tổng cộng. Phí cộng thêm / đặt cọc xử lý như trên.
Nhà cung cấp là bên bán. Không lấy khối Khách hàng hay Bên mua.
Tên, địa chỉ, điện thoại, website, email, mã số thuế của bên bán thường nằm trên đầu thư, kể cả khi đầu thư là hình logo.
supplierPhone là hotline bên bán. Có hai số thì lấy số đầu. Không lấy số người liên hệ của khách hàng. Không thấy số thì để chuỗi rỗng.
supplierAddress là địa chỉ bên bán, không lấy địa chỉ khách hàng. Không thấy địa chỉ thì để chuỗi rỗng.
supplierWebsite là website bên bán. supplierEmail là email bên bán.
supplierTaxCode là mã số thuế bên bán. Không thấy thì để chuỗi rỗng. Không lấy số tài khoản ngân hàng.
supplierRepresentativeName là tên người ở khối chữ ký của bên bán, tức khối không ghi Bên mua và không phải Khách hàng. Nếu khối đó chỉ có tên công ty, không có tên người, để chuỗi rỗng.
supplierRepresentativeTitle là chức vụ ghi cạnh tên người đó. Không có tên người thì để chuỗi rỗng.
vatMode, vatInline và vatTongDaTinh là ba trường độc lập. Không suy vatMode chỉ vì bảng có hoặc không có cột VAT.
vatInline = true khi bảng hàng có cột VAT/thuế GTGT từng dòng. Khi đó vatPercent từng dòng lấy đúng số trên cột đó. Không có cột thì false, vatPercent dòng để 0.
Khi vatInline = true thì vatMode luôn là chua_vat (giá/thành tiền trên cột là trước thuế, thuế nằm cột riêng) — không chọn gom_vat hay khong_ro.
Khi vatInline = false, vatMode theo câu ghi chú trên đơn (đầu trang, cuối bảng, chú thích dưới tổng tiền), theo ý nghĩa chứ không chỉ khớp cụm từ.
VAT và GTGT (thuế giá trị gia tăng) là cùng một loại thuế. Câu dùng VAT hoặc GTGT đều nhận diện như nhau.
- gom_vat: giá/thành tiền đã gồm thuế. Ví dụ "bao gồm VAT", "đã bao gồm GTGT", "giá đã có thuế GTGT", "đã bao gồm thuế", "giá đã gồm GTGT" và câu cùng nghĩa. unitPrice vẫn ghi nguyên số trên bảng, không tự trừ thuế.
- chua_vat: giá/thành tiền chưa gồm thuế. Ví dụ "chưa bao gồm VAT", "chưa bao gồm GTGT", "chưa có VAT", "chưa có GTGT", "không bao gồm VAT", "không bao gồm GTGT", "không có VAT", "không có GTGT", "VAT tính riêng", "GTGT tính riêng", "cộng VAT", "cộng GTGT" và câu cùng nghĩa.
- khong_ro: không thấy dấu hiệu rõ. Không đoán.
vatEvidence là đúng một câu ngắn trích từ đơn dùng để chọn vatMode. Không thấy thì chuỗi rỗng.

vatTongDaTinh = true khi DƯỚI bảng hàng (khối tổng / cuối trang) đã tách sẵn các dòng tính thuế tổng: ví dụ "Tiền hàng", "Thuế GTGT", "Tiền thuế", "VAT", "Thành tiền sau thuế", "Tổng thanh toán" kèm số thuế riêng — tức đơn đã tính VAT tổng, không chỉ ghi chú "giá gồm VAT".
vatTongDaTinh = false khi dưới bảng không có khối tính thuế tổng như vậy (chỉ có tổng cộng một số, hoặc không có dòng thuế).
vatTongTien = đúng số tiền thuế GTGT/VAT tổng dưới bảng (số nguyên đồng, bỏ dấu chấm ngăn nghìn). Chỉ điền khi vatTongDaTinh = true và đọc được số thuế. Không thấy số thì 0. Không bịa, không lấy nhầm thành tiền hàng hay tổng sau thuế.
Lưu ý: cột VAT từng dòng trong bảng (vatInline) khác với khối tính VAT tổng dưới bảng (vatTongDaTinh). Có thể vatInline=false mà vatTongDaTinh=true.
vatTongDaTinh độc lập với vatMode:
- Đơn giá/thành tiền dòng ĐÃ gồm thuế (gom_vat) nhưng cuối trang vẫn ghi "Trong đó: trước thuế / thuế GTGT / tổng" → vatMode=gom_vat VÀ vatTongDaTinh=true. Tổng thanh toán = tổng thành tiền dòng (đã gồm thuế), vatTongTien chỉ để hiển thị số thuế, KHÔNG cộng thêm.
- Đơn giá/thành tiền dòng CHƯA gồm thuế, cuối trang cộng thuế → vatMode=chua_vat VÀ vatTongDaTinh=true. Tổng = thành tiền dòng + vatTongTien.
Ví dụ câu gom_vat: "đã bao gồm thuế GTGT 8%", "đơn giá đã bao gồm VAT".

surcharges là mảng các khoản phí cộng thêm ngoài danh mục hàng hóa chính — nhận theo ngữ nghĩa, không phụ thuộc một cụm chữ cố định. Đó là khoản tính thêm trên đơn: phí khi số lượng/thanh dưới ngưỡng, phí gia công phụ, cước phát sinh, khoản phụ ngoài đơn giá hàng. Mỗi phần tử có name (diễn giải đủ nghĩa như trên đơn), quantity (không rõ thì 1), unitPrice (số tiền đơn vị nếu có; chỉ có diễn giải không có giá thì 0), vatPercent (nếu kèm thuế riêng; không thì 0). Không đưa dòng tổng cộng, thành tiền cuối bảng, hay dòng hàng hóa chính vào surcharges. Không thấy khoản nào thì mảng rỗng.

depositPercent, depositAmount, depositNote mô tả phần khách phải ứng trước / đặt trước khi giao hoặc giữ giá — nhận theo ngữ nghĩa điều khoản thanh toán, không phụ thuộc một cụm chữ cố định.
- depositPercent: tỉ lệ phần trăm nếu đơn nêu theo tỷ lệ (ví dụ nêu ứng trước một nửa giá trị thì 50). Không thấy tỉ lệ thì 0.
- depositAmount: số tiền tuyệt đối nếu đơn nêu bằng đồng. Đơn giá là số nguyên đồng, bỏ dấu chấm ngăn nghìn. Không thấy số tiền thì 0.
- depositNote: đúng một câu ngắn trích từ đơn nói về khoản ứng trước đó. Không thấy thì chuỗi rỗng.
Có thể vừa có tỉ lệ vừa có số tiền. Không nhầm lịch thanh toán nhiều đợt (ví dụ sau nghiệm thu) với khoản phải đặt trước nếu câu không nói rõ phải ứng ngay / đặt trước. Không bịa.

Không thấy thì để chuỗi rỗng hoặc 0, không bịa.
JSON:
{"kind":"kinh","supplierName":"","supplierCode":"","supplierAddress":"","supplierPhone":"","supplierBankName":"","supplierAccountNumber":"","supplierWebsite":"","supplierEmail":"","supplierTaxCode":"","supplierRepresentativeName":"","supplierRepresentativeTitle":"","headerNote":"","vatMode":"khong_ro","vatInline":false,"vatTongDaTinh":false,"vatTongTien":0,"vatEvidence":"","surcharges":[{"name":"","quantity":1,"unitPrice":0,"vatPercent":0}],"depositPercent":0,"depositAmount":0,"depositNote":"","lines":[{"code":"","name":"","spec":"","unit":"tấm","colorCode":"","barCount":0,"lengthM":0,"kgPerM":0,"totalKg":0,"quantity":0,"unitPrice":0,"vatPercent":0,"widthMm":0,"heightMm":0}]}
Với kính, widthMm và heightMm là milimét (giữ nửa mm nếu có, ví dụ 387.5 hoặc 848.5; 1.250 nghĩa là 1250). quantity là tổng số tấm. colorCode nhận houseNote. spec nhận ghi chú trong hoặc mờ.
Số để dạng số. Đơn giá là số nguyên đồng, bỏ dấu chấm ngăn nghìn. kind chỉ được là nhom, bo_cai hoặc kinh.`;

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
      const vatTongDaTinh = nhanVatTongDaTinh(data.vatTongDaTinh, headerNote, vatEvidence);
      const vatTongTien = vatTongDaTinh ? money(data.vatTongTien) : 0;
      // Cột VAT dòng → net. Không vì có footer thuế mà ép chua_vat (nhiều đơn giá đã gồm thuế).
      const vatMode = (vatInline ? "chua_vat" : nhanVatMode(data.vatMode, headerNote)) as VatMode;
      return {
        vatInline,
        vatTongDaTinh,
        vatTongTien,
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
  // Lọc nhầm dòng tổng / cộng tiền nếu model vẫn nhét vào surcharges.
  const chu = fold(name);
  if (chu.includes("tong cong") || chu.includes("cong tien") || chu === "tong") return null;
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

// Dưới bảng đã tách khối tính thuế tổng hay chưa. Ưu tiên cờ AI; thiếu thì dò chữ trên note/evidence.
function nhanVatTongDaTinh(flag: unknown, headerNote: string, vatEvidence: string) {
  if (flag === true || flag === "true" || flag === 1 || flag === "1") return true;
  if (flag === false || flag === "false" || flag === 0 || flag === "0") return false;
  const chu = fold(`${headerNote} ${vatEvidence}`);
  // Chỉ dấu hiệu khối tổng dưới bảng — không lấy câu "cộng VAT" (đó thuộc vatMode chua_vat).
  return coChu(chu, [
    "tien hang", "tien thue", "thue gtgt", "thue vat", "thue gia tri gia tang",
    "thanh tien sau thue", "tong sau thue", "gia tri sau thue", "gia tri truoc thue",
    "vat amount", "tax amount", "amount excluding tax", "amount including tax",
  ]);
}

export async function readOrderPdf(file: Buffer): Promise<PdfOrder> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  const model = process.env.ANTHROPIC_MODEL?.trim();
  if (!key || !model) throw new AppError("Chưa cấu hình khóa đọc PDF.", 400);
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
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: file.toString("base64") } },
          { type: "text", text: prompt },
        ],
      }],
    }),
  });
  const body = await response.json().catch(() => ({})) as { error?: { message?: string }; content?: { type?: string; text?: string }[] };
  if (!response.ok) throw new AppError(body.error?.message || "Không đọc được tệp PDF.", 400);
  const text = (body.content ?? []).map((block) => block.text ?? "").join("\n");
  return parseOrder(text);
}
