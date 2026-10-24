import { AppError } from "@/shared/errors";

export const partnerRoles = ["nha_cung_cap", "xuong_gia_cong", "van_tai", "khoan_nhan_cong"] as const;

export type PartnerRole = (typeof partnerRoles)[number];

export const partnerRoleLabel: Record<PartnerRole, string> = {
  nha_cung_cap: "Nhà cung cấp",
  xuong_gia_cong: "Xưởng gia công",
  van_tai: "Vận tải",
  khoan_nhan_cong: "Khoán nhân công",
};

export const partnerRoleHint: Record<PartnerRole, string> = {
  nha_cung_cap: "Mua nhôm, kính, phụ kiện",
  xuong_gia_cong: "Thuê gia công cửa",
  van_tai: "Thuê chở hàng theo chuyến",
  khoan_nhan_cong: "Đội thi công thuê ngoài",
};

export function isPartnerRole(value: string): value is PartnerRole {
  return (partnerRoles as readonly string[]).includes(value);
}

export function parseRoles(input: unknown): PartnerRole[] {
  const raw = Array.isArray(input) ? input : typeof input === "string" && input ? [input] : [];
  const picked = raw.map((item) => String(item).trim()).filter(Boolean);
  if (picked.length === 0) throw new AppError("Chọn ít nhất một vai trò.", 400);
  const unique: PartnerRole[] = [];
  for (const role of picked) {
    if (!isPartnerRole(role)) throw new AppError("Vai trò không hợp lệ.", 400);
    if (!unique.includes(role)) unique.push(role);
  }
  return partnerRoles.filter((role) => unique.includes(role));
}
