import { AppError } from "@/shared/errors";

/**
 * Trạng thái hợp đồng dùng chung (gia công, vận chuyển, mua bán, thi công…).
 * Lưu DB dạng string snake_case. Không dùng Prisma enum để dễ mở rộng.
 */
export const contractStatusLabel = {
  nhap: "Nháp",
  cho_phe_duyet: "Chờ phê duyệt",
  da_phe_duyet: "Đã phê duyệt",
  cho_ky: "Đang trình ký / Chờ ký",
  da_ky: "Đã ký",
  co_hieu_luc: "Có hiệu lực",
  dang_thuc_hien: "Đang thực hiện",
  tam_dung: "Tạm dừng",
  qua_han: "Quá hạn / Vi phạm",
  da_het_han: "Đã hết hạn",
  da_thanh_ly: "Đã thanh lý / Hoàn thành",
  da_huy: "Đã hủy bỏ / Vô hiệu",
} as const;

export type ContractStatus = keyof typeof contractStatusLabel;

/** Mô tả nghiệp vụ — tooltip / tài liệu UI. */
export const contractStatusMoTa: Record<ContractStatus, string> = {
  nhap: "Hợp đồng đang soạn thảo, thu thập thông tin hoặc chỉnh sửa điều khoản.",
  cho_phe_duyet: "Đã soạn xong, đang gửi cấp có thẩm quyền xem xét và thông qua.",
  da_phe_duyet: "Cấp có thẩm quyền đã chấp thuận, sẵn sàng trình ký.",
  cho_ky: "Đã gửi các bên liên quan để ký kết (ký tay hoặc ký số).",
  da_ky: "Các bên đã ký xong; có thể chưa đến ngày phát sinh hiệu lực.",
  co_hieu_luc: "Chính thức có giá trị ràng buộc pháp lý; các bên bắt đầu thực hiện.",
  dang_thuc_hien: "Đang thực hiện cam kết: giao hàng, dịch vụ hoặc thanh toán.",
  tam_dung: "Tạm hoãn thực hiện do sự cố, thỏa thuận mới hoặc bất khả kháng.",
  qua_han: "Không hoàn thành đúng tiến độ hoặc vi phạm điều khoản đã cam kết.",
  da_het_han: "Hết thời hạn theo văn bản mà không gia hạn thêm.",
  da_thanh_ly: "Hoàn tất toàn bộ quyền và nghĩa vụ; hợp đồng kết thúc hợp pháp.",
  da_huy: "Bị hủy trước/sau khi ký do sai sót pháp lý, không đủ điều kiện hoặc các bên đồng ý hủy.",
};

export const contractStatusList = Object.keys(contractStatusLabel) as ContractStatus[];

/** Trạng thái khóa — không sửa / không xóa mềm qua form. */
export const contractStatusKhoa: readonly ContractStatus[] = ["da_thanh_ly", "da_het_han", "da_huy"];

/** Trạng thái tính vào chi phí công trình (không gồm nháp / chờ duyệt / đã hủy). */
export const contractStatusTinhChiPhi: readonly ContractStatus[] = [
  "da_phe_duyet",
  "cho_ky",
  "da_ky",
  "co_hieu_luc",
  "dang_thuc_hien",
  "tam_dung",
  "qua_han",
  "da_het_han",
  "da_thanh_ly",
];

/** Map mã cũ (gia công / vận chuyển trước đây) → mã mới. */
const mapCu: Record<string, ContractStatus> = {
  nhap: "nhap",
  da_luu: "dang_thuc_hien",
  ket_thuc: "da_thanh_ly",
};

export function isContractStatus(value: string): value is ContractStatus {
  return value in contractStatusLabel;
}

/** Đổi mã cũ sang mã catalog; giữ nguyên nếu không nhận ra (đọc DB an toàn). */
export function chuanHoaContractStatus(status: string): string {
  if (isContractStatus(status)) return status;
  return mapCu[status] ?? status;
}

export function parseContractStatus(value: unknown): ContractStatus {
  const text = String(value ?? "").trim();
  if (isContractStatus(text)) return text;
  if (text in mapCu) return mapCu[text]!;
  throw new AppError("Trạng thái hợp đồng không hợp lệ.", 400);
}

export function nhanContractStatus(value: string) {
  if (isContractStatus(value)) return contractStatusLabel[value];
  if (value in mapCu) return contractStatusLabel[mapCu[value]!];
  return value || "—";
}

export function hopDongDangKhoa(status: string) {
  const chuan = isContractStatus(status) ? status : mapCu[status];
  return chuan ? contractStatusKhoa.includes(chuan) : false;
}

/** Cho phép ghi lịch sử thanh toán (không nháp, không trạng thái khóa). */
export function hopDongChoThanhToan(status: string) {
  const chuan = isContractStatus(status) ? status : mapCu[status];
  if (!chuan) return false;
  if (chuan === "nhap") return false;
  return !contractStatusKhoa.includes(chuan);
}

export function hopDongTinhChiPhi(status: string) {
  const chuan = isContractStatus(status) ? status : mapCu[status];
  return chuan ? contractStatusTinhChiPhi.includes(chuan) : false;
}
