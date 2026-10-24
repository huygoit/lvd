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
  lines: PdfLine[];
};

const prompt = `Đọc đơn đặt hàng hoặc hợp đồng mua bán trong PDF. Trả về một JSON, không markdown.
Có ba kiểu:
- nhom: bảng thanh nhôm. Cột mã hàng, diễn giải, mã màu, số thanh, độ dài mét, tỉ trọng kg/m, tổng kg, đơn giá theo kg. Bỏ dòng tiêu đề nhóm, dòng cộng tiền, phụ thu, đặt cọc, tổng cộng.
- bo_cai: bảng phụ kiện tính theo bộ hoặc chiếc. Cột mã, tên, mô tả, đơn vị, số lượng, đơn giá, VAT từng dòng nếu có. Bỏ điều khoản hợp đồng và dòng tổng.
- kinh: bảng thống kê kính. Mỗi dòng là một ký hiệu cửa. Cột ký hiệu, rộng mm, cao mm, số lượng tấm. Nếu tách số tấm theo nhà thì ghi houseNote, ví dụ "CV 4 · HB 18". Ghi chú là kính trong hoặc kính mờ. Độ dày lấy ở tiêu đề. Đợt đặt và hạng mục ghi headerNote. code là ký hiệu cửa. name là "Kính {độ dày} {trong hoặc mờ}", ví dụ "Kính 6,38mm trong".
Nhà cung cấp là bên bán. Không lấy khối Khách hàng hay Bên mua.
Tên, địa chỉ, điện thoại, website, email, mã số thuế của bên bán thường nằm trên đầu thư, kể cả khi đầu thư là hình logo.
supplierPhone là hotline bên bán. Có hai số thì lấy số đầu. Không lấy số người liên hệ của khách hàng.
supplierAddress là địa chỉ bên bán, không lấy địa chỉ khách hàng.
supplierWebsite là website bên bán. supplierEmail là email bên bán.
supplierTaxCode là mã số thuế bên bán. Không thấy thì để chuỗi rỗng. Không lấy số tài khoản ngân hàng.
supplierRepresentativeName là tên người ở khối chữ ký của bên bán, tức khối không ghi Bên mua và không phải Khách hàng. Nếu khối đó chỉ có tên công ty, không có tên người, để chuỗi rỗng.
supplierRepresentativeTitle là chức vụ ghi cạnh tên người đó. Không có tên người thì để chuỗi rỗng.
Không thấy thì để chuỗi rỗng, không bịa.
JSON:
{"kind":"kinh","supplierName":"","supplierCode":"","supplierAddress":"","supplierPhone":"","supplierBankName":"","supplierAccountNumber":"","supplierWebsite":"","supplierEmail":"","supplierTaxCode":"","supplierRepresentativeName":"","supplierRepresentativeTitle":"","headerNote":"","lines":[{"code":"","name":"","spec":"","unit":"tấm","colorCode":"","barCount":0,"lengthM":0,"kgPerM":0,"totalKg":0,"quantity":0,"unitPrice":0,"vatPercent":0,"widthMm":0,"heightMm":0}]}
Với kính, widthMm và heightMm là số nguyên milimét, 1.250 nghĩa là 1250. quantity là tổng số tấm. colorCode nhận houseNote. spec nhận ghi chú trong hoặc mờ.
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
    widthMm: Math.max(0, Math.round(num(row.widthMm))),
    heightMm: Math.max(0, Math.round(num(row.heightMm))),
  };
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
  const missing = [
    supplierName ? "" : "tên nhà cung cấp",
    supplierAddress ? "" : "địa chỉ nhà cung cấp",
    supplierPhone ? "" : "số điện thoại",
  ].filter(Boolean);
  if (missing.length) throw new AppError(`Đơn hàng không hợp lệ. Thiếu ${missing.join(", ")}.`, 400);
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
    headerNote: textOf(data.headerNote).slice(0, 300),
    lines,
  };
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
