export function formatTax(bps: number) {
  const percent = bps / 100;
  const text = Number.isInteger(percent) ? String(percent) : String(percent).replace(".", ",");
  return `${text}%`;
}

export function formatReferencePrice(value: number | null) {
  if (value === null) return "—";
  const text = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${text} đ`;
}

export function formatMeasure(value: number | null, suffix: string) {
  if (value === null) return "—";
  const scaled = value / 1000;
  const rounded = Math.round(scaled * 1000) / 1000;
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
  return `${text} ${suffix}`;
}

export function measureInput(value: number | null) {
  if (value === null) return "";
  return String(value / 1000);
}
