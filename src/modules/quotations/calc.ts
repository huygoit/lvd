import { AppError } from "@/shared/errors";

export type CalcMethod = "bo" | "dien_tich";

/** Một phụ kiện gắn dưới dòng cửa. */
export type AccessoryInput = {
  name?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
};

export type ItemInput = {
  groupKey?: string;
  name: string;
  unit?: string;
  widthMm?: number | null;
  heightMm?: number | null;
  quantity: number;
  mainUnitPrice: number;
  /** Giữ tương thích bản cũ — form mới ưu tiên danh sách accessories. */
  accessoryUnitPrice?: number;
  /** Danh sách phụ kiện con; có mảng thì thành tiền PK = tổng SL × ĐG từng món. */
  accessories?: AccessoryInput[];
  /** Khối lượng m² nhập tay; có giá trị thì không dùng rộng/cao. */
  areaOverride?: number | null;
};

export type PricedItem = {
  calcMethod: CalcMethod;
  /** Khối lượng m² ×1000 dùng để tính tiền. */
  areaMilli: number;
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

/** Khối lượng m² ×1000 = rộng × cao × số lượng / 1_000_000 × 1000. */
export function areaFromSizeMilli(widthMm: number, heightMm: number, quantity: number) {
  if (widthMm <= 0 || heightMm <= 0 || quantity <= 0) return 0;
  return Math.round((widthMm * heightMm * quantity) / 1_000);
}

/** Đổi m² → milli (×1000). */
export function areaToMilli(areaM2: number) {
  if (!Number.isFinite(areaM2) || areaM2 < 0) fail("Khối lượng không hợp lệ.");
  const milli = Math.round(areaM2 * 1000);
  if (milli > 1_000_000_000) fail("Khối lượng quá lớn.");
  return milli;
}

export function formatAreaMilli(milli: number) {
  if (!milli) return "";
  const text = (milli / 1000).toFixed(3).replace(/\.?0+$/, "");
  return text;
}

/** Chuẩn hóa danh sách phụ kiện từ JSON / form. */
export function normalizeAccessories(raw: unknown): AccessoryInput[] {
  if (!Array.isArray(raw)) return [];
  const out: AccessoryInput[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const name = String(item.name ?? "").trim();
    const unit = String(item.unit ?? "bộ").trim() || "bộ";
    const quantity = Number(item.quantity ?? 0);
    const unitPrice = Number(item.unitPrice ?? 0);
    if (!name && !quantity && !unitPrice) continue;
    if (!Number.isInteger(quantity) || quantity < 0) fail("Số lượng phụ kiện phải là số nguyên không âm.");
    if (!Number.isInteger(unitPrice) || unitPrice < 0) fail("Đơn giá phụ kiện phải là số nguyên không âm.");
    out.push({ name, unit, quantity, unitPrice });
  }
  return out;
}

/** Tổng tiền phụ kiện = Σ (số lượng × đơn giá). */
export function sumAccessories(list: AccessoryInput[] | undefined) {
  if (!list?.length) return 0;
  let total = 0n;
  for (const item of list) {
    const quantity = nonNegativeInt(item.quantity, "Số lượng phụ kiện");
    const unitPrice = nonNegativeInt(item.unitPrice, "Đơn giá phụ kiện");
    total += BigInt(quantity) * BigInt(unitPrice);
  }
  return asMoney(total);
}

export function priceItem(input: ItemInput): PricedItem {
  // Nội dung bắt buộc lúc lưu; lúc gõ vẫn cho tính thành tiền để ô nhảy số ngay.
  const price = nonNegativeInt(input.mainUnitPrice, "Đơn giá");
  const accessory = nonNegativeInt(input.accessoryUnitPrice ?? 0, "Đơn giá phụ kiện");
  const width = edge(input.widthMm, "Chiều rộng");
  const height = edge(input.heightMm, "Chiều cao");
  const override =
    input.areaOverride === null || input.areaOverride === undefined
      ? null
      : areaToMilli(input.areaOverride);
  const dungDanhSach = Array.isArray(input.accessories);

  // Nhập khối lượng tay: thành tiền cửa = khối lượng × đơn giá (không cần số lượng).
  if (override !== null && override > 0) {
    const main = divRoundHalfUp(BigInt(override) * BigInt(price), 1000n);
    const accessoryAmount = dungDanhSach
      ? BigInt(sumAccessories(input.accessories))
      : 0n;
    return {
      calcMethod: "dien_tich",
      areaMilli: override,
      mainAmount: asMoney(main),
      accessoryAmount: asMoney(accessoryAmount),
      pretax: asMoney(main + accessoryAmount),
    };
  }

  const quantity = positiveInt(input.quantity, "Số lượng");
  let areaMilli = 0;
  let calcMethod: CalcMethod = "bo";
  if (width !== null && height !== null) {
    areaMilli = areaFromSizeMilli(width, height, quantity);
    calcMethod = "dien_tich";
  }

  // Có danh sách PK thì cộng từng món; không thì giữ công thức cũ (đơn giá PK × số bộ cửa).
  const accessoryAmount = dungDanhSach
    ? BigInt(sumAccessories(input.accessories))
    : BigInt(accessory) * BigInt(quantity);
  const main =
    calcMethod === "dien_tich"
      ? divRoundHalfUp(BigInt(areaMilli) * BigInt(price), 1000n)
      : BigInt(price) * BigInt(quantity);
  const pretax = main + accessoryAmount;
  return {
    calcMethod,
    areaMilli,
    mainAmount: asMoney(main),
    accessoryAmount: asMoney(accessoryAmount),
    pretax: asMoney(pretax),
  };
}

/** taxBps < 0 = báo giá chưa bao gồm VAT (không in dòng thuế). 0 = thuế 0%. */
export function applyTax(pretax: number, taxBps: number): QuoteTotals {
  const goods = nonNegativeInt(pretax, "Tiền hàng");
  if (!Number.isInteger(taxBps)) fail("Thuế suất phải là số nguyên.");
  if (taxBps < 0) {
    return { pretax: goods, tax: 0, posttax: goods, taxBps: 0, retail: true };
  }
  if (taxBps > 10_000) fail("Thuế suất phải từ 0 đến 100.");
  const tax = divRoundHalfUp(BigInt(goods) * BigInt(taxBps), 10_000n);
  return {
    pretax: goods,
    tax: asMoney(tax),
    posttax: asMoney(BigInt(goods) + tax),
    taxBps,
    retail: false,
  };
}

/** Chuỗi select thuế: "chua" | "0" | "5" | "8" | "10". */
export function taxSelectValue(taxBps: number) {
  if (taxBps < 0) return "chua";
  return String(taxBps / 100);
}

/** Đổi giá trị select → phần vạn. "chua" = -1. */
export function taxSelectToBps(value: string) {
  if (value === "chua") return -1;
  return taxRateBps(Number(value || 0));
}
