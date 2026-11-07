import { dayCount, formatYmd } from "@/shared/lib/dates";
import { formatCount } from "@/shared/lib/money";

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

/** Dòng ghi chú tự chèn khi chọn báo giá chưa gồm VAT. */
export const CHUA_VAT_NOTE = "- Báo giá chưa bao gồm VAT";

function laDongChuaVat(line: string) {
  const text = line.trim();
  return text === CHUA_VAT_NOTE || text === "Báo giá chưa bao gồm VAT" || text === "- Báo giá chưa bao gồm VAT";
}

/** Thêm / gỡ dòng chưa VAT trong ghi chú theo cấu hình thuế. */
export function withChuaVatNote(note: string | null | undefined, chuaVat: boolean) {
  const lines = String(note ?? "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd());
  const coDong = lines.some(laDongChuaVat);
  if (chuaVat) {
    if (coDong) return lines.join("\n").trim();
    const body = lines.join("\n").trim();
    return body ? `${body}\n${CHUA_VAT_NOTE}` : CHUA_VAT_NOTE;
  }
  return lines.filter((line) => !laDongChuaVat(line)).join("\n").trim();
}

/** Câu bảo hành đưa ra bản in / đồng bộ warrantyTerms. */
export function warrantyClause(months: number) {
  return months > 0 ? `Bảo hành: ${months} tháng.` : "Không áp dụng bảo hành.";
}

/** Câu thời gian thi công — rỗng thì không đưa vào điều khoản. */
export function constructionClause(constructionTime: string) {
  const text = constructionTime.trim();
  return text ? `Thời gian thi công: ${text}.` : "";
}

/** Câu thanh toán từ tạm ứng + ngày sau nghiệm thu. */
export function paymentClause(input: { advanceAmount: number; advanceDays: number; paymentDays: number }) {
  if (input.advanceAmount > 0) {
    return `Thanh toán: tạm ứng ${formatCount(input.advanceAmount)} đồng trong vòng ${input.advanceDays} ngày làm việc sau khi ký hợp đồng; phần còn lại thanh toán trong ${input.paymentDays} ngày kể từ ngày nghiệm thu bàn giao.`;
  }
  if (input.paymentDays > 0) {
    return `Thanh toán trong ${input.paymentDays} ngày kể từ ngày nghiệm thu bàn giao.`;
  }
  return "";
}

/** Đồng bộ các cột chữ từ bộ số/ô có cấu trúc (một nguồn sự thật). */
export function derivedCommercialTexts(input: {
  constructionTime: string;
  warrantyMonths: number;
  advanceAmount: number;
  advanceDays: number;
  paymentDays: number;
}) {
  return {
    deliveryTerms: constructionClause(input.constructionTime).replace(/^Thời gian thi công:\s*/, "").replace(/\.$/, ""),
    warrantyTerms: warrantyClause(input.warrantyMonths),
    paymentTerms: paymentClause(input),
  };
}

export function quoteClauses(input: {
  quoteDate: string;
  validUntil: string;
  constructionTime: string;
  warrantyMonths: number;
  advanceAmount: number;
  advanceDays: number;
  paymentDays: number;
}) {
  const days = dayCount(input.quoteDate, input.validUntil);
  const lines = [
    days > 0
      ? `Báo giá có hiệu lực ${days} ngày kể từ ngày báo giá (đến hết ngày ${formatYmd(input.validUntil)}). Khối lượng phát sinh ngoài phạm vi sẽ được báo giá bổ sung.`
      : "Khối lượng phát sinh ngoài phạm vi sẽ được báo giá bổ sung.",
  ];
  const construction = constructionClause(input.constructionTime);
  if (construction) lines.push(construction);
  lines.push(warrantyClause(input.warrantyMonths));
  const payment = paymentClause(input);
  if (payment) lines.push(payment);
  return lines;
}

/** Dòng hiệu lực ngắn cho header bản in. */
export function hieuLucHeader(quoteDate: string, validUntil: string) {
  const days = dayCount(quoteDate, validUntil);
  if (days <= 0) return "";
  return `Hiệu lực: ${days} ngày (đến ${formatYmd(validUntil)})`;
}
