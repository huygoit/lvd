import { AppError } from "@/shared/errors";
import { isYmd } from "@/shared/lib/dates";
import {
  contractStatusLabel,
  parseContractStatus,
  type ContractStatus,
} from "@/shared/catalog/contract-status";

// Alias dùng chung — trạng thái hợp đồng gia công = catalog dùng chung.
export const fabricationStatusLabel = contractStatusLabel;
export type FabricationStatus = ContractStatus;
export const parseStatus = parseContractStatus;

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
  if (!isYmd(text)) throw new AppError("Ngày thanh toán không hợp lệ.", 400);
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

// VAT ×100 (0 / 500 / 800 / 1000). Thêm giá trị mới chỉ cần sửa whitelist này.
export const fabricationVatBpsOptions = [0, 500, 800, 1000] as const;

export function parseVat(value: unknown) {
  if (value === undefined || value === null || String(value).trim() === "") return 0;
  const raw = String(value).trim().replace(",", ".");
  const so = Number(raw);
  if (!Number.isFinite(so) || so < 0) throw new AppError("Thuế VAT không hợp lệ.", 400);
  const bps = Math.round(so * 100);
  if (!fabricationVatBpsOptions.includes(bps as (typeof fabricationVatBpsOptions)[number])) {
    throw new AppError("VAT chỉ nhận 0, 5, 8 hoặc 10 phần trăm.", 400);
  }
  return bps;
}

// Đọc số kiểu VN: 1.473,448 → 1473.448 (chấm nghìn, phẩy thập phân).
function parseSoVn(value: string) {
  const raw = value.trim().replace(/\s/g, "");
  if (!raw) return NaN;
  if (raw.includes(",") && raw.includes(".")) return Number(raw.replace(/\./g, "").replace(",", "."));
  if (raw.includes(",")) return Number(raw.replace(",", "."));
  // Chỉ có chấm: nếu ≥2 chấm hoặc nhóm 3 số sau chấm cuối → coi là phân tách nghìn.
  const cham = raw.match(/\./g)?.length ?? 0;
  if (cham >= 2) return Number(raw.replace(/\./g, ""));
  if (cham === 1 && /^\d{1,3}(\.\d{3})+$/.test(raw)) return Number(raw.replace(/\./g, ""));
  return Number(raw);
}

// Khối lượng m² ×1000 do người dùng nhập đè. Trả null nếu không có.
export function khoiLuongOverrideMilli(value: unknown) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim().replace(/,$/, "");
  if (!text) return null;
  const so = parseSoVn(text);
  if (!Number.isFinite(so) || so < 0) throw new AppError("Khối lượng không hợp lệ.", 400);
  const milli = Math.round(so * 1000);
  if (milli > 1_000_000_000) throw new AppError("Khối lượng quá lớn.", 400);
  return milli;
}
