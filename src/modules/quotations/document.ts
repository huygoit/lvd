import { dayCount, formatYmd } from "@/shared/lib/dates";
import { formatCount } from "@/shared/lib/money";

export function printCode(customerCode: string) {
  return `BG-${customerCode}/LVD`;
}

export function placeAndDate(ymd: string) {
  const [year, month, day] = ymd.split("-");
  return `Đà Nẵng, ngày ${day} tháng ${month} năm ${year}`;
}

export function quoteIntro(content: string, location: string) {
  const subject = content.trim() || "hạng mục cửa";
  const place = location.trim();
  return place
    ? `Công ty TNHH Liên Việt Door xin gửi đến Quý Công ty báo giá: ${subject} tại ${place} như sau:`
    : `Công ty TNHH Liên Việt Door xin gửi đến Quý Công ty báo giá: ${subject} như sau:`;
}

export function quoteClauses(input: {
  quoteDate: string;
  validUntil: string;
  scheduleText: string;
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
  if (input.scheduleText.trim()) lines.push(`Thời gian thi công: ${input.scheduleText.trim()}.`);
  lines.push(input.warrantyMonths > 0 ? `Bảo hành: ${input.warrantyMonths} tháng.` : "Không áp dụng bảo hành.");
  if (input.advanceAmount > 0) {
    lines.push(
      `Thanh toán: tạm ứng ${formatCount(input.advanceAmount)} đồng trong vòng ${input.advanceDays} ngày làm việc sau khi ký hợp đồng; phần còn lại thanh toán trong ${input.paymentDays} ngày kể từ ngày nghiệm thu bàn giao.`,
    );
  } else if (input.paymentDays > 0) {
    lines.push(`Thanh toán trong ${input.paymentDays} ngày kể từ ngày nghiệm thu bàn giao.`);
  }
  return lines;
}
