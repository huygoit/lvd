export const stockSlipKinds = [
  { code: "nhap", label: "Nhập kho", hint: "Nhà cung cấp về kho công ty" },
  { code: "chuyen", label: "Chuyển", hint: "Đổi chỗ giữ, hàng vẫn còn" },
  { code: "giao_thang", label: "Giao thẳng", hint: "Tới công trình, không qua kho" },
  { code: "xuat_lap", label: "Xuất lắp", hint: "Hàng tại công trình sang đã lắp" },
  { code: "tra_hong", label: "Trả / hỏng", hint: "Phiếu riêng, không sửa phiếu gốc" },
  { code: "kinh", label: "Kính", hint: "Theo từng nhà, làm từng phần" },
  { code: "giao_hang", label: "Giao đến công trình", hint: "Chờ công trình xác nhận khi nhận hàng" },
] as const;

export type StockSlipKind = (typeof stockSlipKinds)[number]["code"];

export const stockPlaces = [
  { code: "kho", label: "Kho công ty", usable: true },
  { code: "dang_giao", label: "Đang giao", usable: false },
  { code: "cong_trinh", label: "Công trình", usable: true },
  { code: "ncc", label: "Nhà cung cấp đang giữ", usable: true },
  { code: "xuong", label: "Xưởng", usable: true },
  { code: "da_lap", label: "Đã lắp", usable: false },
  { code: "hong", label: "Hỏng, vỡ, trả", usable: false },
  { code: "da_dat", label: "Đã đặt", usable: false },
  { code: "da_san_xuat", label: "Đã sản xuất", usable: false },
] as const;

export type StockPlaceKind = (typeof stockPlaces)[number]["code"];

export const stockSlipStatuses = [
  { code: "nhap", label: "Nháp" },
  { code: "da_ghi", label: "Đã ghi sổ" },
  { code: "cho_nhan", label: "Chờ nhận" },
  { code: "da_nhan", label: "Đã nhận" },
] as const;

export type StockSlipStatus = (typeof stockSlipStatuses)[number]["code"];

export function isStockSlipKind(value: string): value is StockSlipKind {
  return stockSlipKinds.some((item) => item.code === value);
}

export function isStockPlaceKind(value: string): value is StockPlaceKind {
  return stockPlaces.some((item) => item.code === value);
}

export function isMovablePlace(value: string): value is StockPlaceKind {
  return stockPlaces.some((item) => item.code === value && item.usable);
}

export function stockSlipKindLabel(value: string) {
  return stockSlipKinds.find((item) => item.code === value)?.label ?? value;
}

export function stockPlaceLabel(value: string) {
  return stockPlaces.find((item) => item.code === value)?.label ?? value;
}

export function stockSlipStatusLabel(value: string) {
  return stockSlipStatuses.find((item) => item.code === value)?.label ?? value;
}

export const glassStates = [
  { code: "da_dat", label: "Đã đặt" },
  { code: "da_san_xuat", label: "Đã sản xuất" },
  { code: "ncc", label: "Nhà cung cấp đang giữ" },
  { code: "da_giao", label: "Đã giao" },
  { code: "da_lap", label: "Đã lắp" },
  { code: "vo", label: "Vỡ" },
] as const;

export type GlassState = (typeof glassStates)[number]["code"];

export function isGlassState(value: string): value is GlassState {
  return glassStates.some((item) => item.code === value);
}

export function glassStateLabel(value: string) {
  return glassStates.find((item) => item.code === value)?.label ?? value;
}

export function glassStateIndex(value: string) {
  return glassStates.findIndex((item) => item.code === value);
}

export function glassStepText(state: string, project: string, partner: string) {
  if (!state) return "";
  const label = glassStateLabel(state);
  if (state === "ncc") return [label, partner, project].filter(Boolean).join(" · ");
  return project ? `${label} · ${project}` : label;
}

export const kgReceiveStates = [
  { code: "tam_nhap", label: "Tạm nhập theo hóa đơn" },
  { code: "da_xac_nhan", label: "Đã có phiếu" },
] as const;

export type KgReceiveState = (typeof kgReceiveStates)[number]["code"];

export function isKgReceiveState(value: string): value is KgReceiveState {
  return kgReceiveStates.some((item) => item.code === value);
}

export function kgReceiveLabel(value: string) {
  return kgReceiveStates.find((item) => item.code === value)?.label ?? value;
}

export function theoryGrams(barCount: number, lengthMm: number | null, gramsPerMeter: number | null, gramsPerBar: number | null) {
  if (barCount <= 0) return 0;
  if (lengthMm && gramsPerMeter) return Math.round((barCount * lengthMm * gramsPerMeter) / 1_000_000);
  if (gramsPerBar) return Math.round((barCount * gramsPerBar) / 1000);
  return 0;
}

export function formatStockQty(value: number) {
  const scaled = value / 1000;
  const rounded = Math.round(scaled * 1000) / 1000;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
}
