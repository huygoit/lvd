import { AppError } from "@/shared/errors";

export type CalcMethod = "bo" | "dien_tich";

export type ItemInput = {
  groupKey: string;
  name: string;
  unit?: string;
  widthMm?: number | null;
  heightMm?: number | null;
  quantity: number;
  mainUnitPrice: number;
  accessoryUnitPrice: number;
};

export type PricedItem = {
  calcMethod: CalcMethod;
  mainAmount: number;
  accessoryAmount: number;
  pretax: number;
};

export type QuoteTotals = {
  pretax: number;
  tax: number;
  posttax: number;
  taxBps: number;
  retail: boolean;
};

const SAFE = 9_007_199_254_740_991n;

function fail(message: string): never {
  throw new AppError(message, 400);
}

function whole(value: number, label: string) {
  if (!Number.isInteger(value)) fail(`${label} phải là số nguyên.`);
  return value;
}

function nonNegativeInt(value: number, label: string) {
  const number = whole(value, label);
  if (number < 0) fail(`${label} không được âm.`);
  return number;
}

function positiveInt(value: number, label: string) {
  const number = whole(value, label);
  if (number <= 0) fail(`${label} phải lớn hơn 0.`);
  return number;
}

function asMoney(value: bigint) {
  if (value < 0n || value > SAFE) fail("Thành tiền vượt quá phạm vi có thể lưu.");
  return Number(value);
}

function divRoundHalfUp(numerator: bigint, denominator: bigint) {
  const negative = numerator < 0n;
  const value = negative ? -numerator : numerator;
  const quotient = value / denominator;
  const remainder = value % denominator;
  const rounded = remainder * 2n >= denominator ? quotient + 1n : quotient;
  return negative ? -rounded : rounded;
}

export function taxRateBps(percent: number) {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) fail("Thuế suất phải từ 0 đến 100.");
  const bps = Math.round(percent * 100);
  if (Math.abs(percent * 100 - bps) > 1e-6) fail("Thuế suất chỉ lấy tối đa 2 chữ số thập phân.");
  return bps;
}

function edge(value: number | null | undefined, label: string) {
  if (value === null || value === undefined || value === 0) return null;
  return positiveInt(value, label);
}

export function priceItem(input: ItemInput): PricedItem {
  if (!input.groupKey.trim()) fail("Chọn hạng mục.");
  if (!input.name.trim()) fail("Dòng hạng mục cần có tên.");
  const quantity = positiveInt(input.quantity, "Số lượng");
  const price = nonNegativeInt(input.mainUnitPrice, "Đơn giá cửa");
  const accessory = nonNegativeInt(input.accessoryUnitPrice, "Đơn giá phụ kiện");
  const width = edge(input.widthMm, "Chiều rộng");
  const height = edge(input.heightMm, "Chiều cao");
  const byArea = width !== null && height !== null;
  // Có đủ rộng và cao thì nhân m². Thiếu một cạnh thì đơn giá cửa tính theo bộ. Phụ kiện luôn theo bộ.
  const pretax = byArea
    ? divRoundHalfUp(
        (BigInt(width) * BigInt(height) * BigInt(price) + BigInt(accessory) * 1_000_000n) * BigInt(quantity),
        1_000_000n,
      )
    : (BigInt(price) + BigInt(accessory)) * BigInt(quantity);
  const accessoryAmount = BigInt(accessory) * BigInt(quantity);
  return {
    calcMethod: byArea ? "dien_tich" : "bo",
    mainAmount: asMoney(pretax - accessoryAmount),
    accessoryAmount: asMoney(accessoryAmount),
    pretax: asMoney(pretax),
  };
}

export function applyTax(pretax: number, taxBps: number): QuoteTotals {
  const goods = nonNegativeInt(pretax, "Tiền hàng");
  const rate = whole(taxBps, "Thuế suất");
  if (rate < 0 || rate > 10_000) fail("Thuế suất phải từ 0 đến 100.");
  const tax = divRoundHalfUp(BigInt(goods) * BigInt(rate), 10_000n);
  return {
    pretax: goods,
    tax: asMoney(tax),
    posttax: asMoney(BigInt(goods) + tax),
    taxBps: rate,
    retail: rate === 0,
  };
}
