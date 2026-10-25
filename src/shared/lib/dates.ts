export const TIME_ZONE = "Asia/Ho_Chi_Minh";

export function todayYmd(now: Date, timeZone = TIME_ZONE) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function zonedHour(now: Date, timeZone = TIME_ZONE) {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(now)
    .find((part) => part.type === "hour")?.value;
  return Number(hour ?? "0");
}

export function formatDateTime(now: Date, timeZone = TIME_ZONE) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
}

export function isYmd(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

// Gõ ngày/tháng/năm. Hai số đầu là ngày, không tự nhảy tháng.
export function maskNgay(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return [day, month, year].filter((part) => part.length > 0).join("/");
}

export function parseNgay(text: string) {
  const masked = maskNgay(text);
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(masked)) return "";
  const [day, month, year] = masked.split("/");
  const ymd = `${year}-${month}-${day}`;
  return isYmd(ymd) ? ymd : "";
}

export function addDays(ymd: string, days: number) {
  const [year, month, day] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function formatYmd(ymd: string) {
  const [year, month, day] = ymd.split("-");
  return `${day}/${month}/${year}`;
}

// Giờ trước, ngày sau: 14:30 25/10/2026. Trả về YYYY-MM-DDTHH:mm khi đủ và hợp lệ.
export function maskGioNgay(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 12);
  const hour = digits.slice(0, 2);
  const minute = digits.slice(2, 4);
  const day = digits.slice(4, 6);
  const month = digits.slice(6, 8);
  const year = digits.slice(8, 12);
  const gio = [hour, minute].filter((part) => part.length > 0).join(":");
  const ngay = [day, month, year].filter((part) => part.length > 0).join("/");
  return [gio, ngay].filter((part) => part.length > 0).join(" ");
}

export function parseGioNgay(text: string) {
  const masked = maskGioNgay(text);
  const match = /^(\d{2}):(\d{2}) (\d{2})\/(\d{2})\/(\d{4})$/.exec(masked);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return "";
  const ymd = `${match[5]}-${match[4]}-${match[3]}`;
  return isYmd(ymd) ? `${ymd}T${match[1]}:${match[2]}` : "";
}

export function dayCount(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

export function daysInclusive(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000) + 1;
}

export function inRange(ymd: string, from: string, to: string) {
  return ymd >= from && ymd <= to;
}

export function greetingFor(hour: number) {
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 13) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}
