import { AppError } from "@/shared/errors";
import { isYmd } from "@/shared/lib/dates";

export const transportPricingLabel = {
  theo_chuyen: "Theo chuyến",
  theo_tan: "Theo tấn",
  theo_kg: "Theo kg",
  tron_goi: "Trọn gói",
} as const;

export type TransportPricing = keyof typeof transportPricingLabel;

export const transportStatusLabel = {
  nhap: "Nháp",
  da_luu: "Đã lưu",
  ket_thuc: "Kết thúc",
} as const;

export type TransportStatus = keyof typeof transportStatusLabel;

export const transportUnits = ["chuyến", "tấn", "kg", "gói"] as const;

export function parsePricing(value: unknown): TransportPricing {
  const text = String(value ?? "").trim();
  if (text in transportPricingLabel) return text as TransportPricing;
  throw new AppError("Chọn cách tính cước vận chuyển.", 400);
}

export function parseStatus(value: unknown): TransportStatus {
  const text = String(value ?? "").trim();
  if (text in transportStatusLabel) return text as TransportStatus;
  throw new AppError("Trạng thái hợp đồng vận chuyển không hợp lệ.", 400);
}

export function chuoi(value: unknown, dai: number) {
  return String(value ?? "").trim().slice(0, dai);
}

export function ngayTuyChon(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (!isYmd(text)) throw new AppError("Ngày ký không hợp lệ.", 400);
  return text;
}

export function ngayBatBuoc(value: unknown) {
  const text = String(value ?? "").trim();
  if (!isYmd(text)) throw new AppError("Ngày tạm ứng không hợp lệ.", 400);
  return text;
}

export function soTien(value: unknown) {
  const digits = String(value ?? "").trim().replace(/\D/g, "");
  if (!digits || digits === "0") throw new AppError("Cần số tiền lớn hơn 0.", 400);
  if (!/^\d{1,15}$/.test(digits)) throw new AppError("Số tiền không hợp lệ.", 400);
  const amount = Number(digits);
  if (!Number.isSafeInteger(amount)) throw new AppError("Số tiền quá lớn.", 400);
  return amount;
}

export function soNguyenKhongAm(value: unknown, ten: string) {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) return 0;
  const so = Number(raw);
  if (!Number.isFinite(so) || so < 0) throw new AppError(`${ten} không hợp lệ.`, 400);
  return Math.round(so);
}

export function soLuongMilli(value: unknown) {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) return 0;
  const so = Number(raw);
  if (!Number.isFinite(so) || so < 0) throw new AppError("Số lượng không hợp lệ.", 400);
  const milli = Math.round(so * 1000);
  if (milli > 1_000_000_000) throw new AppError("Số lượng quá lớn.", 400);
  return milli;
}

export function donVi(value: unknown) {
  const text = chuoi(value, 20) || "chuyến";
  return text;
}

export function thanhTienDong(quantityMilli: number, unitPrice: number) {
  if (!quantityMilli || !unitPrice) return 0;
  return Math.round((quantityMilli * unitPrice) / 1000);
}

export function donViMacDinh(pricing: TransportPricing) {
  if (pricing === "theo_tan") return "tấn";
  if (pricing === "theo_kg") return "kg";
  if (pricing === "tron_goi") return "gói";
  return "chuyến";
}
