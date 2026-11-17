import { dayCount, formatYmd } from "@/shared/lib/dates";

export function printCode(customerCode: string) {
  return `BG-${customerCode}/LVD`;
}

export function placeAndDate(ymd: string) {
  const [year, month, day] = ymd.split("-");
  return `Đà Nẵng, ngày ${day} tháng ${month} năm ${year}`;
}

/** Một dòng nhãn: giá trị — bỏ cả dòng nếu giá trị trống. */
export function labeledLine(label: string, value: string | null | undefined) {
  const text = String(value ?? "").trim();
  return text ? `${label}: ${text}` : "";
}

/** Ưu tiên snapshot; trống thì lấy nguồn đang có (khách / hồ sơ công ty). */
export function pickText(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

/** Dòng ghi chú cố định khi báo giá chưa gồm VAT (không nằm trong ô ghi chú tay). */
export const CHUA_VAT_NOTE = "- Báo giá chưa bao gồm VAT";

function laDongChuaVat(line: string) {
  const text = line.trim();
  return text === CHUA_VAT_NOTE || text === "Báo giá chưa bao gồm VAT" || text === "- Báo giá chưa bao gồm VAT";
}

/** Gỡ dòng chưa VAT khỏi ghi chú người dùng (tránh lẫn vào ô textarea). Chỉ gọi lúc load/lưu. */
export function stripChuaVatNote(note: string | null | undefined) {
  return String(note ?? "")
    .split(/\r?\n/)
    .filter((line) => !laDongChuaVat(line))
    .join("\n")
    .replace(/^\n+/, "")
    .replace(/\n+$/, "");
}

/** @deprecated Giữ tương thích — không còn chèn vào note; chỉ strip. */
export function withChuaVatNote(note: string | null | undefined, _chuaVat?: boolean) {
  return stripChuaVatNote(note);
}

/** Câu bảo hành đưa ra bản in / đồng bộ warrantyTerms. */
export function warrantyClause(months: number) {
  return months > 0 ? `Bảo hành kỹ thuật: ${months} tháng.` : "Không áp dụng bảo hành kỹ thuật.";
}

/** Một đợt thanh toán trên báo giá. */
export type PaymentMilestone = {
  content: string;
  value: string;
};

/** Mẫu 3 đợt mặc định khi tạo báo giá mới — value là số % (vd "40"). */
export function defaultPaymentMilestones(): PaymentMilestone[] {
  return [
    { content: "Tạm ứng, ngay sau khi ký kết hợp đồng", value: "40" },
    { content: "Ngay khi tập kết vật tư xuống công trình", value: "30" },
    { content: "Quyết toán còn lại", value: "30" },
  ];
}

/** Lấy số phần trăm từ chuỗi lưu (chịu dữ liệu cũ dạng "40% giá trị…"). */
export function soPhanTramThanhToan(raw: string | null | undefined) {
  const match = String(raw ?? "").match(/\d+/);
  return match ? match[0] : "";
}

/** Hiển thị giá trị đợt trên bản in / câu điều khoản. */
export function nhanGiaTriThanhToan(raw: string | null | undefined) {
  const so = soPhanTramThanhToan(raw);
  return so ? `${so}% giá trị hợp đồng` : "";
}

/** Chuẩn hóa JSON / payload đợt thanh toán — value chỉ giữ số %. */
export function chuanDotThanhToan(raw: unknown): PaymentMilestone[] {
  if (!Array.isArray(raw)) return [];
  const out: PaymentMilestone[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const content = String(item.content ?? "").trim();
    const value = soPhanTramThanhToan(String(item.value ?? ""));
    if (!content && !value) continue;
    out.push({ content, value });
  }
  return out;
}

/** Tổng % các đợt thanh toán. */
export function tongPhanTramThanhToan(milestones: PaymentMilestone[] | unknown) {
  return chuanDotThanhToan(milestones).reduce((sum, row) => sum + Number(row.value || 0), 0);
}

/** Rỗng nếu hợp lệ; có chữ thì tổng % > 100. */
export function loiTongPhanTramThanhToan(milestones: PaymentMilestone[] | unknown) {
  const tong = tongPhanTramThanhToan(milestones);
  if (tong > 100) return `Tổng tỷ lệ thanh toán là ${tong}%, không được vượt quá 100%.`;
  return "";
}

/** Các dòng đợt thanh toán (không gồm tiêu đề) — dùng in/web thụt lề. */
export function paymentMilestoneLines(milestones: PaymentMilestone[]) {
  return chuanDotThanhToan(milestones).map((row) => {
    const so = soPhanTramThanhToan(row.value);
    const noiDung = row.content.trim() || "Đợt thanh toán";
    if (so) return `${noiDung}: ${so}% giá trị hợp đồng`;
    return `${noiDung}:`;
  });
}

/**
 * Câu thanh toán dạng chữ (đồng bộ paymentTerms).
 * Form: - Thanh toán: rồi từng đợt một dòng.
 */
export function paymentClause(milestones: PaymentMilestone[]) {
  const dong = paymentMilestoneLines(milestones);
  if (!dong.length) return "";
  return `- Thanh toán:\n${dong.join("\n")}`;
}

/** Đồng bộ các cột chữ từ bảo hành + đợt thanh toán. */
export function derivedCommercialTexts(input: {
  warrantyMonths: number;
  paymentMilestones: PaymentMilestone[];
}) {
  return {
    deliveryTerms: "",
    warrantyTerms: warrantyClause(input.warrantyMonths),
    paymentTerms: paymentClause(input.paymentMilestones),
  };
}

export function quoteClauses(input: {
  quoteDate: string;
  validUntil: string;
  warrantyMonths: number;
  paymentMilestones: PaymentMilestone[];
}) {
  const days = dayCount(input.quoteDate, input.validUntil);
  const lines = [
    days > 0
      ? `Báo giá có hiệu lực ${days} ngày kể từ ngày báo giá (đến hết ngày ${formatYmd(input.validUntil)}). Khối lượng phát sinh ngoài phạm vi sẽ được báo giá bổ sung.`
      : "Khối lượng phát sinh ngoài phạm vi sẽ được báo giá bổ sung.",
  ];
  lines.push(warrantyClause(input.warrantyMonths));
  const payment = paymentClause(input.paymentMilestones);
  if (payment) lines.push(payment);
  return lines;
}

/** Dòng hiệu lực ngắn cho header bản in. */
export function hieuLucHeader(quoteDate: string, validUntil: string) {
  const days = dayCount(quoteDate, validUntil);
  if (days <= 0) return "";
  return `Hiệu lực: ${days} ngày (đến ${formatYmd(validUntil)})`;
}
