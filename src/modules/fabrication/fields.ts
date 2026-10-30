import { AppError } from "@/shared/errors";
import { isYmd } from "@/shared/lib/dates";

export const fabricationSupplyLabel = {
  lvd_cap_vat_tu: "Liên Việt cấp kính, vật tư",
  ncc_tron_goi: "Xưởng lo trọn vật tư và gia công",
} as const;

export type FabricationSupply = keyof typeof fabricationSupplyLabel;

export const fabricationStatusLabel = {
  nhap: "Nháp",
  da_luu: "Đã lưu",
  ket_thuc: "Kết thúc",
} as const;

export type FabricationStatus = keyof typeof fabricationStatusLabel;

export function parseSupply(value: unknown): FabricationSupply {
  const text = String(value ?? "").trim();
  if (text in fabricationSupplyLabel) return text as FabricationSupply;
  throw new AppError("Chọn hình thức cấp vật tư.", 400);
}

export function parseStatus(value: unknown): FabricationStatus {
  const text = String(value ?? "").trim();
  if (text in fabricationStatusLabel) return text as FabricationStatus;
  throw new AppError("Trạng thái hợp đồng gia công không hợp lệ.", 400);
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

// Diện tích m² ×1000 từ rộng × cao × số tấm.
export function dienTichMilli(widthMm: number, heightMm: number, quantityMilli: number) {
  if (widthMm <= 0 || heightMm <= 0 || quantityMilli <= 0) return 0;
  return Math.round((widthMm * heightMm * quantityMilli) / 1_000_000);
}

export function thanhTienDong(areaMilli: number, unitPrice: number) {
  if (!areaMilli || !unitPrice) return 0;
  return Math.round((areaMilli * unitPrice) / 1000);
}
