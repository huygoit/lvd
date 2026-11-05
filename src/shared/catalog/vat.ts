/**
 * Mức thuế GTGT (VAT) dùng chung toàn hệ thống.
 * Chỉ bốn mức này: 0%, 5%, 8%, 10%.
 */
export const vatPercents = [0, 5, 8, 10] as const;

export type VatPercent = (typeof vatPercents)[number];

export function isVatPercent(value: unknown): value is VatPercent {
  const so = typeof value === "number" ? value : Number(String(value ?? "").trim().replace(",", "."));
  return (vatPercents as readonly number[]).includes(so);
}

/** Ép về một trong bốn mức; lệch thì lấy mức gần nhất. */
export function canonVatPercent(value: unknown): VatPercent {
  const so = typeof value === "number" ? value : Number(String(value ?? "").trim().replace(",", "."));
  if (!Number.isFinite(so)) return 0;
  if ((vatPercents as readonly number[]).includes(so)) return so as VatPercent;
  return vatPercents.reduce((tot, muc) => (Math.abs(muc - so) < Math.abs(tot - so) ? muc : tot));
}

/** Chuỗi "0" | "5" | "8" | "10" cho <select>. */
export function canonVatText(value: unknown): string {
  return String(canonVatPercent(value));
}

export function nhanVatPercent(muc: VatPercent) {
  return `${muc}%`;
}
