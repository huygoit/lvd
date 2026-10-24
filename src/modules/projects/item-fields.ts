import { canonMeasureUnit } from "@/shared/catalog/units";
import { AppError } from "@/shared/errors";

export function hangMucAmount(unitPrice: number, quantityMilli: number) {
  return Math.round((unitPrice * quantityMilli) / 1000);
}

export function parseQuantityMilli(value: unknown) {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) throw new AppError("Cần nhập khối lượng.", 400);
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) throw new AppError("Khối lượng không hợp lệ.", 400);
  return Math.round(amount * 1000);
}

export function parseUnitPrice(value: unknown) {
  const raw = String(value ?? "").trim().replace(/\s/g, "").replace(/\./g, "");
  if (!raw) return 0;
  if (!/^\d+$/.test(raw)) throw new AppError("Đơn giá không hợp lệ.", 400);
  const amount = Number(raw);
  if (!Number.isSafeInteger(amount)) throw new AppError("Đơn giá không hợp lệ.", 400);
  return amount;
}

export function parseSortOrder(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!/^\d+$/.test(raw)) throw new AppError("Số thứ tự không hợp lệ.", 400);
  const order = Number(raw);
  if (order < 1 || order > 9999) throw new AppError("Số thứ tự không hợp lệ.", 400);
  return order;
}

export function parseItemUnit(value: unknown) {
  const unit = canonMeasureUnit(String(value ?? ""));
  if (!unit) throw new AppError("Đơn vị tính không có trong danh mục.", 400);
  return unit;
}

export function formatQuantityMilli(value: number) {
  const scaled = value / 1000;
  const rounded = Math.round(scaled * 1000) / 1000;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
}

export function formatUnitPrice(value: number) {
  return Math.abs(Math.round(value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
