import type { Capability } from "@/shared/auth/types";
import { capabilities } from "@/shared/auth/types";

export type PermissionItem = {
  id: Capability;
  label: string;
  hint?: string;
};

export type PermissionGroup = {
  id: string;
  label: string;
  items: PermissionItem[];
};

export const permissionGroups: PermissionGroup[] = [
  {
    id: "khach-hang",
    label: "Khách hàng",
    items: [
      { id: "customers.view", label: "Xem mọi khách hàng" },
      { id: "customers.view.assigned", label: "Xem khách mình phụ trách" },
      { id: "customers.create", label: "Thêm khách hàng" },
      { id: "customers.update", label: "Sửa khách hàng" },
      { id: "customers.archive", label: "Ngừng dùng khách hàng" },
      { id: "customers.contacts", label: "Sửa người liên hệ" },
    ],
  },
  {
    id: "cong-trinh",
    label: "Công trình",
    items: [
      { id: "projects.view", label: "Xem mọi công trình" },
      { id: "projects.view.assigned", label: "Xem công trình mình phụ trách" },
      { id: "projects.create", label: "Thêm công trình" },
      { id: "projects.update", label: "Sửa công trình" },
    ],
  },
  {
    id: "bao-gia",
    label: "Báo giá",
    items: [
      { id: "quotations.view", label: "Xem mọi báo giá" },
      { id: "quotations.view.assigned", label: "Xem báo giá mình phụ trách" },
      { id: "quotations.create", label: "Thêm báo giá" },
      { id: "quotations.update", label: "Sửa báo giá" },
      { id: "quotations.submit", label: "Trình duyệt" },
      { id: "quotations.withdraw", label: "Rút lại" },
      { id: "quotations.approve", label: "Duyệt" },
      { id: "quotations.request_change", label: "Yêu cầu sửa" },
      { id: "quotations.deliver", label: "Gửi khách" },
      { id: "quotations.respond", label: "Ghi phản hồi khách" },
      { id: "quotations.version", label: "Tạo phiên bản" },
      { id: "quotations.copy", label: "Sao chép" },
    ],
  },
  {
    id: "hop-dong",
    label: "Hợp đồng",
    items: [
      { id: "contracts.view", label: "Xem mọi hợp đồng" },
      { id: "contracts.view.assigned", label: "Xem hợp đồng mình phụ trách" },
      { id: "contracts.create", label: "Thêm hợp đồng" },
      { id: "contracts.update", label: "Sửa hợp đồng" },
      { id: "contracts.submit", label: "Trình duyệt" },
      { id: "contracts.approve", label: "Duyệt" },
      { id: "contracts.sign", label: "Ghi đã ký" },
      { id: "contracts.effect", label: "Ghi hiệu lực" },
      { id: "contracts.prices.admin", label: "Ghi giá quản trị", hint: "Không nằm trong vai trò quản trị mặc định." },
    ],
  },
  {
    id: "doi-tac",
    label: "Đối tác",
    items: [
      { id: "partners.view", label: "Xem đối tác" },
      { id: "partners.create", label: "Thêm đối tác" },
      { id: "partners.update", label: "Sửa đối tác" },
      { id: "partners.archive", label: "Ngừng dùng đối tác" },
    ],
  },
  {
    id: "kho",
    label: "Kho và vật tư",
    items: [
      { id: "inventory.view", label: "Xem kho và vật tư" },
      { id: "inventory.create", label: "Thêm phiếu kho, vật tư" },
      { id: "inventory.update", label: "Sửa phiếu kho, vật tư" },
      { id: "orders.confirm", label: "Xác nhận đơn hàng", hint: "Xác nhận khi hàng tới công trình." },
    ],
  },
  {
    id: "phan-he",
    label: "Phân hệ khác",
    items: [
      { id: "engineering.view", label: "Xem thiết kế" },
      { id: "procurement.view", label: "Xem mua hàng" },
      { id: "fabrication.view", label: "Xem gia công" },
      { id: "installation.view", label: "Xem lắp đặt" },
      { id: "quality.view", label: "Xem chất lượng" },
    ],
  },
  {
    id: "tai-chinh",
    label: "Tài chính và báo cáo",
    items: [
      { id: "finance.cashflow.view", label: "Xem dòng tiền" },
      { id: "finance.receivables.view", label: "Xem công nợ phải thu" },
      { id: "reports.view", label: "Xem báo cáo" },
    ],
  },
  {
    id: "he-thong",
    label: "Hệ thống",
    items: [
      { id: "system.view", label: "Vào khu vực hệ thống" },
      { id: "settings.manage", label: "Sửa danh mục, vai trò và quyền" },
    ],
  },
];

const known = new Set<string>(capabilities);

export function isCapability(value: string): value is Capability {
  return known.has(value);
}

export function permissionLabel(id: string) {
  for (const group of permissionGroups) {
    const item = group.items.find((row) => row.id === id);
    if (item) return item.label;
  }
  return id;
}
