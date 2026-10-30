import { hasAnyCapability, type Capability, type User } from "@/shared/auth/types";
import { routes } from "@/shared/config/routes";

export type ModuleId =
  | "customers"
  | "projects"
  | "quotations"
  | "contracts"
  | "engineering"
  | "procurement"
  | "partners"
  | "inventory"
  | "fabrication"
  | "installation"
  | "quality"
  | "finance"
  | "reports"
  | "system";

export type ModuleState = "available" | "planned";

export const moduleState: Record<ModuleId, ModuleState> = {
  customers: "available",
  projects: "available",
  quotations: "available",
  contracts: "available",
  engineering: "planned",
  procurement: "planned",
  partners: "available",
  inventory: "available",
  fabrication: "planned",
  installation: "available",
  quality: "planned",
  finance: "planned",
  reports: "planned",
  system: "available",
};

export type NavItem = {
  id: string;
  label: string;
  href?: string;
  icon?: string;
  state: "link" | "disabled";
  badge?: string;
};

export type NavGroup = {
  id: string;
  label: string;
  href?: string;
  icon?: string;
  items: NavItem[];
};

type Screen = {
  id: string;
  label: string;
  href?: string;
  icon?: string;
  module: ModuleId;
  ready: boolean;
  caps: Capability[];
};

type GroupDef = {
  id: string;
  label: string;
  href?: string;
  icon?: string;
  items?: Screen[];
};

const groups: GroupDef[] = [
  { id: "tong-quan", label: "Tổng quan", href: routes.home, icon: "layout-dashboard" },
  {
    id: "kinh-doanh",
    label: "Kinh doanh",
    icon: "handshake",
    items: [
      {
        id: "khach-hang",
        label: "Khách hàng",
        icon: "contact",
        href: routes.customers,
        module: "customers",
        ready: true,
        caps: ["customers.view", "customers.view.assigned"],
      },
      {
        id: "bao-gia",
        label: "Báo giá",
        icon: "file-text",
        href: routes.quotations,
        module: "quotations",
        ready: true,
        caps: ["quotations.view", "quotations.view.assigned"],
      },
      {
        id: "hop-dong",
        label: "Hợp đồng",
        icon: "file-signature",
        href: routes.contracts,
        module: "contracts",
        ready: true,
        caps: ["contracts.view", "contracts.view.assigned"],
      },
    ],
  },
  {
    id: "nhan-su",
    label: "Nhân sự",
    icon: "users",
    items: [
      {
        id: "nhan-vien",
        label: "Nhân viên",
        icon: "user-round",
        href: routes.employees,
        module: "system",
        ready: true,
        caps: ["settings.manage"],
      },
      {
        id: "phong-ban",
        label: "Phòng ban",
        icon: "network",
        href: routes.departments,
        module: "system",
        ready: true,
        caps: ["settings.manage"],
      },
      {
        id: "chuc-vu",
        label: "Chức vụ",
        icon: "id-card",
        href: routes.positions,
        module: "system",
        ready: true,
        caps: ["settings.manage"],
      },
      {
        id: "chuc-danh",
        label: "Chức danh",
        icon: "badge-check",
        href: routes.jobTitles,
        module: "system",
        ready: true,
        caps: ["settings.manage"],
      },
    ],
  },
  {
    id: "cong-trinh",
    label: "Công trình",
    icon: "building-2",
    items: [
      {
        id: "danh-sach-cong-trinh",
        label: "Danh sách công trình",
        icon: "building-2",
        href: routes.projects,
        module: "projects",
        ready: true,
        caps: ["projects.view", "projects.view.assigned"],
      },
      {
        id: "thiet-ke",
        label: "Thiết kế/bóc tách",
        icon: "pen-tool",
        module: "engineering",
        ready: false,
        caps: ["engineering.view"],
      },
      {
        id: "tien-do",
        label: "Tiến độ",
        icon: "calendar-range",
        module: "projects",
        ready: false,
        caps: ["projects.view", "projects.view.assigned"],
      },
      {
        id: "ho-so",
        label: "Hồ sơ công trình",
        icon: "folder-open",
        module: "projects",
        ready: false,
        caps: ["projects.view", "projects.view.assigned"],
      },
    ],
  },
  {
    id: "cung-ung",
    label: "Cung ứng",
    icon: "boxes",
    items: [
      {
        id: "mua-hang",
        label: "Mua hàng",
        icon: "shopping-cart",
        module: "procurement",
        ready: false,
        caps: ["procurement.view"],
      },
      {
        id: "doi-tac",
        label: "Đối tác",
        icon: "handshake",
        href: routes.partners,
        module: "partners",
        ready: true,
        caps: ["partners.view"],
      },
      {
        id: "danh-muc-vat-tu",
        label: "Danh mục vật tư",
        icon: "boxes",
        href: routes.materials,
        module: "inventory",
        ready: true,
        caps: ["inventory.view"],
      },
      {
        id: "kho",
        label: "Kho/vật tư",
        icon: "warehouse",
        href: routes.stock,
        module: "inventory",
        ready: true,
        caps: ["inventory.view"],
      },
      {
        id: "nhan-kho",
        label: "Nhận tại kho",
        icon: "package-check",
        href: routes.receiveWarehouse,
        module: "inventory",
        ready: true,
        caps: ["receive.warehouse"],
      },
      {
        id: "van-chuyen",
        label: "Vận chuyển",
        icon: "truck",
        href: routes.projects,
        module: "partners",
        ready: true,
        caps: ["transport.view"],
      },
    ],
  },
  {
    id: "san-xuat",
    label: "Sản xuất & thi công",
    icon: "hard-hat",
    items: [
      {
        id: "hien-truong",
        label: "Hiện trường",
        icon: "hard-hat",
        href: routes.field,
        module: "installation",
        ready: true,
        caps: ["receive.site", "field.supply", "field.progress"],
      },
      {
        id: "nhan-xuong",
        label: "Nhận tại xưởng",
        icon: "factory",
        href: routes.receiveWorkshop,
        module: "installation",
        ready: true,
        caps: ["receive.workshop"],
      },
      {
        id: "gia-cong-noi-bo",
        label: "Gia công nội bộ",
        icon: "wrench",
        module: "fabrication",
        ready: false,
        caps: ["fabrication.view"],
      },
      {
        id: "gia-cong-thue",
        label: "Gia công thuê ngoài",
        icon: "factory",
        href: routes.projects,
        module: "fabrication",
        ready: true,
        caps: ["fabrication.view"],
      },
      {
        id: "lap-dat",
        label: "Giao hàng/lắp đặt",
        icon: "hammer",
        module: "installation",
        ready: false,
        caps: ["installation.view"],
      },
      {
        id: "bao-hanh",
        label: "Chất lượng/bảo hành",
        icon: "shield-check",
        module: "quality",
        ready: false,
        caps: ["quality.view"],
      },
    ],
  },
  {
    id: "tai-chinh",
    label: "Tài chính",
    icon: "wallet",
    items: [
      {
        id: "thu-chi",
        label: "Thu chi",
        icon: "arrow-left-right",
        module: "finance",
        ready: false,
        caps: ["finance.cashflow.view"],
      },
      {
        id: "cong-no",
        label: "Công nợ",
        icon: "receipt",
        module: "finance",
        ready: false,
        caps: ["finance.receivables.view"],
      },
      {
        id: "tam-ung",
        label: "Tạm ứng",
        icon: "banknote",
        module: "finance",
        ready: false,
        caps: ["finance.cashflow.view"],
      },
      {
        id: "chi-phi",
        label: "Chi phí công trình",
        icon: "calculator",
        module: "finance",
        ready: false,
        caps: ["finance.cashflow.view"],
      },
      {
        id: "dong-tien",
        label: "Dòng tiền",
        icon: "line-chart",
        module: "finance",
        ready: false,
        caps: ["finance.cashflow.view"],
      },
    ],
  },
  {
    id: "bao-cao",
    label: "Báo cáo",
    icon: "chart-column",
    items: [
      {
        id: "bao-cao-cong-trinh",
        label: "Báo cáo công trình",
        icon: "building-2",
        module: "reports",
        ready: false,
        caps: ["reports.view"],
      },
      {
        id: "bao-cao-vat-tu",
        label: "Vật tư/gia công",
        icon: "boxes",
        module: "reports",
        ready: false,
        caps: ["reports.view"],
      },
      {
        id: "bao-cao-tai-chinh",
        label: "Tài chính quản trị",
        icon: "pie-chart",
        module: "reports",
        ready: false,
        caps: ["reports.view"],
      },
    ],
  },
  {
    id: "he-thong",
    label: "Hệ thống",
    icon: "settings",
    items: [
      {
        id: "ho-so-cong-ty",
        label: "Hồ sơ công ty",
        icon: "building",
        href: routes.companyProfile,
        module: "system",
        ready: true,
        caps: ["settings.manage"],
      },
      {
        id: "cai-dat",
        label: "Cài đặt",
        icon: "settings",
        href: routes.settings,
        module: "system",
        ready: true,
        caps: ["settings.manage"],
      },
      {
        id: "sao-luu",
        label: "Sao lưu",
        icon: "database-backup",
        href: routes.backup,
        module: "system",
        ready: true,
        caps: ["settings.manage"],
      },
      {
        id: "hang-muc-bao-gia",
        label: "Hạng mục báo giá",
        icon: "list-tree",
        href: routes.quoteCategories,
        module: "system",
        ready: true,
        caps: ["settings.manage"],
      },
      {
        id: "vai-tro",
        label: "Vai trò và quyền",
        icon: "shield",
        href: routes.roles,
        module: "system",
        ready: true,
        caps: ["settings.manage"],
      },
      {
        id: "nguoi-dung",
        label: "Người dùng",
        icon: "key-round",
        href: routes.users,
        module: "system",
        ready: true,
        caps: ["settings.manage"],
      },
      {
        id: "cau-hinh",
        label: "Cấu hình công ty",
        icon: "sliders-horizontal",
        module: "system",
        ready: false,
        caps: ["system.view"],
      },
    ],
  },
];

function screenState(screen: Screen): NavItem["state"] {
  if (!screen.ready || moduleState[screen.module] !== "available") return "disabled";
  return "link";
}

export function buildNavigation(user: User): NavGroup[] {
  return groups.flatMap((group) => {
    if (!group.items) {
      return [{ id: group.id, label: group.label, href: group.href, icon: group.icon, items: [] }];
    }
    const items = group.items.flatMap((screen) => {
      if (!hasAnyCapability(user, screen.caps)) return [];
      const state = screenState(screen);
      return [
        {
          id: screen.id,
          label: screen.label,
          href: state === "link" ? screen.href : undefined,
          icon: screen.icon,
          state,
          badge: state === "disabled" ? "Sắp triển khai" : undefined,
        } satisfies NavItem,
      ];
    });
    if (items.length === 0) return [];
    return [{ id: group.id, label: group.label, icon: group.icon, items }];
  });
}
