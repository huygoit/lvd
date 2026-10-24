export const materialGroups = [
  "Nhôm",
  "Phụ kiện",
  "Keo – gioăng – vật tư phụ",
  "NVL",
] as const;

export type MaterialGroup = (typeof materialGroups)[number];

export function isMaterialGroup(value: string): value is MaterialGroup {
  return (materialGroups as readonly string[]).includes(value);
}

export const materialNatures = [
  { code: "vat_tu", label: "Vật tư hàng hóa" },
  { code: "dich_vu", label: "Dịch vụ" },
  { code: "thanh_pham", label: "Thành phẩm" },
  { code: "dien_giai", label: "Chỉ là diễn giải" },
] as const;

export type MaterialNature = (typeof materialNatures)[number]["code"];

export function isMaterialNature(value: string): value is MaterialNature {
  return materialNatures.some((item) => item.code === value);
}

export function materialNatureLabel(value: string) {
  return materialNatures.find((item) => item.code === value)?.label ?? value;
}

export const materialPriceBases = [
  { code: "sl", label: "Theo số lượng" },
  { code: "kg", label: "Theo kg" },
] as const;

export type MaterialPriceBasis = (typeof materialPriceBases)[number]["code"];

export function isMaterialPriceBasis(value: string): value is MaterialPriceBasis {
  return materialPriceBases.some((item) => item.code === value);
}

export function materialPriceBasisLabel(value: string) {
  return materialPriceBases.find((item) => item.code === value)?.label ?? value;
}

export function foldVi(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function isGlassMaterial(material: { name: string; stockUnit: string }) {
  return material.stockUnit === "m2" && foldVi(material.name).startsWith("kinh");
}
