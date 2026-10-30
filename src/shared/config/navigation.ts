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
  state: "link" | "disabled";
  badge?: string;
};

export type NavGroup = {
  id: string;
  label: string;
  href?: string;
  items: NavItem[];
};

type Screen = {
  id: string;
  label: string;
  href?: string;
  module: ModuleId;
  ready: boolean;
  caps: Capability[];
};

type GroupDef = {
  id: string;
  label: string;
  href?: string;
  items?: Screen[];
};

const groups: GroupDef[] = [
  { id: "tong-quan", label: "Tổng quan", href: routes.home },
  {
    id: "kinh-doanh",
    label: "Kinh doanh",
    items: [
      {
        id: "khach-hang",
        label: "Khách hàng",
        href: routes.customers,
        module: "customers",
        ready: true,
        caps: ["customers.view", "customers.view.assigned"],
      },
      {
        id: "bao-gia",
        label: "Báo giá",
        href: routes.quotations,
        module: "quotations",
        ready: true,
        caps: ["quotations.view", "quotations.view.assigned"],
      },
      {
        id: "hop-dong",
        label: "Hợp đồng",
        href: routes.contracts,
        module: "contracts",
        ready: true,
        caps: ["contracts.view", "contracts.view.assigned"],
      },
    ],
  },
  {
    id: "cong-trinh",
    label: "Công trình",
    items: [
      {
        id: "danh-sach-cong-trinh",
        label: "Danh sách công trình",
        href: routes.projects,
        module: "projects",
        ready: true,
        caps: ["projects.view", "projects.view.assigned"],
      },
      {
        id: "thiet-ke",
        label: "Thiết kế/bóc tách",
        module: "engineering",
        ready: false,
        caps: ["engineering.view"],
      },
      {
        id: "tien-do",
        label: "Tiến độ",
        module: "projects",
        ready: false,
        caps: ["projects.view", "projects.view.assigned"],
      },
      {
        id: "ho-so",
        label: "Hồ sơ công trình",
        module: "projects",
        ready: false,
        caps: ["projects.view", "projects.view.assigned"],
      },
    ],
  },
  {
    id: "cung-ung",
    label: "Cung ứng",
    items: [
      {
        id: "mua-hang",
        label: "Mua hàng",
        module: "procurement",
        ready: false,
        caps: ["procurement.view"],
      },
      {
        id: "doi-tac",
        label: "Đối tác",
        href: routes.partners,
        module: "partners",
        ready: true,
        caps: ["partners.view"],
      },
      {
        id: "danh-muc-vat-tu",
        label: "Danh mục vật tư",
        href: routes.materials,
        module: "inventory",
        ready: true,
        caps: ["inventory.view"],
      },
      {
        id: "kho",
        label: "Kho/vật tư",
        href: routes.stock,
        module: "inventory",
        ready: true,
        caps: ["inventory.view"],
      },
      {
        id: "nhan-kho",
        label: "Nhận tại kho",
        href: routes.receiveWarehouse,
        module: "inventory",
        ready: true,
        caps: ["receive.warehouse"],
      },
    ],
  },
  {
    id: "san-xuat",
    label: "Sản xuất & thi công",
    items: [
      {
        id: "hien-truong",
        label: "Hiện trường",
        href: routes.field,
        module: "installation",
        ready: true,
        caps: ["receive.site", "field.supply", "field.progress"],
      },
      {
        id: "nhan-xuong",
        label: "Nhận tại xưởng",
        href: routes.receiveWorkshop,
        module: "installation",
        ready: true,
        caps: ["receive.workshop"],
      },
      {
        id: "gia-cong-noi-bo",
        label: "Gia công nội bộ",
        module: "fabrication",
        ready: false,
        caps: ["fabrication.view"],
      },
      {
        id: "gia-cong-thue",
        label: "Gia công thuê ngoài",
        module: "fabrication",
        ready: false,
        caps: ["fabrication.view"],
      },
      {
        id: "lap-dat",
        label: "Giao hàng/lắp đặt",
        module: "installation",
        ready: false,
        caps: ["installation.view"],
      },
      {
        id: "bao-hanh",
        label: "Chất lượng/bảo hành",
        module: "quality",
        ready: false,
        caps: ["quality.view"],
      },
    ],
  },
  {
    id: "tai-chinh",
    label: "Tài chính",
    items: [
      {
        id: "thu-chi",
        label: "Thu chi",
        module: "finance",
        ready: false,
        caps: ["finance.cashflow.view"],
      },
      {
        id: "cong-no",
        label: "Công nợ",
        module: "finance",
        ready: false,
        caps: ["finance.receivables.view"],
      },
      {
        id: "tam-ung",
        label: "Tạm ứng",
        module: "finance",
        ready: false,
        caps: ["finance.cashflow.view"],
      },
      {
        id: "chi-phi",
        label: "Chi phí công trình",
        module: "finance",
        ready: false,
        caps: ["finance.cashflow.view"],
      },
      {
        id: "dong-tien",
        label: "Dòng tiền",
        module: "finance",
        ready: false,
        caps: ["finance.cashflow.view"],
      },
    ],
  },
  {
    id: "bao-cao",
    label: "Báo cáo",
    items: [
      {
        id: "bao-cao-cong-trinh",
        label: "Báo cáo công trình",
        module: "reports",
        ready: false,
        caps: ["reports.view"],
      },
      {
        id: "bao-cao-vat-tu",
        label: "Vật tư/gia công",
        module: "reports",
        ready: false,
        caps: ["reports.view"],
      },
      {
        id: "bao-cao-tai-chinh",
        label: "Tài chính quản trị",
        module: "reports",
        ready: false,
        caps: ["reports.view"],
      },
    ],
  },
  {
    id: "he-thong",
    label: "Hệ thống",
    items: [
      {
        id: "ho-so-cong-ty",
        label: "Hồ sơ công ty",
        href: routes.companyProfile,
        module: "system",
        ready: true,
        caps: ["settings.manage"],
      },
      {
        id: "cai-dat",
        label: "Cài đặt",
        href: routes.settings,
        module: "system",
        ready: true,
        caps: ["settings.manage"],
      },
      {
        id: "sao-luu",
        label: "Sao lưu",
        href: routes.backup,
        module: "system",
        ready: true,
        caps: ["settings.manage"],
      },
      {
        id: "hang-muc-bao-gia",
        label: "Hạng mục báo giá",
        href: routes.quoteCategories,
        module: "system",
        ready: true,
        caps: ["settings.manage"],
      },
      {
        id: "chuc-danh",
        label: "Chức danh",
        href: routes.jobTitles,
        module: "system",
        ready: true,
        caps: ["settings.manage"],
      },
      {
        id: "phong-ban",
        label: "Phòng ban",
        href: routes.departments,
        module: "system",
        ready: true,
        caps: ["settings.manage"],
      },
      {
        id: "chuc-vu",
        label: "Chức vụ",
        href: routes.positions,
        module: "system",
        ready: true,
        caps: ["settings.manage"],
      },
      {
        id: "nhan-vien",
        label: "Nhân viên",
        href: routes.employees,
        module: "system",
        ready: true,
        caps: ["settings.manage"],
      },
      {
        id: "vai-tro",
        label: "Vai trò và quyền",
        href: routes.roles,
        module: "system",
        ready: true,
        caps: ["settings.manage"],
      },
      {
        id: "nguoi-dung",
        label: "Người dùng",
        href: routes.users,
        module: "system",
        ready: true,
        caps: ["settings.manage"],
      },
      {
        id: "cau-hinh",
        label: "Cấu hình công ty",
        module: "system",
        ready: false,
        caps: ["system.view"],
      },
    ],
  },
];

function screenState(screen: Screen, showPlanned: boolean): NavItem["state"] | "omit" {
  if (!screen.ready || moduleState[screen.module] !== "available") {
    return showPlanned ? "disabled" : "omit";
  }
  return "link";
}

export function buildNavigation(user: User, showPlanned: boolean): NavGroup[] {
  return groups.flatMap((group) => {
    if (!group.items) {
      return [{ id: group.id, label: group.label, href: group.href, items: [] }];
    }
    const items = group.items.flatMap((screen) => {
      if (!hasAnyCapability(user, screen.caps)) return [];
      const state = screenState(screen, showPlanned);
      if (state === "omit") return [];
      return [
        {
          id: screen.id,
          label: screen.label,
          href: state === "link" ? screen.href : undefined,
          state,
          badge: state === "disabled" ? "Sắp triển khai" : undefined,
        } satisfies NavItem,
      ];
    });
    if (items.length === 0) return [];
    return [{ id: group.id, label: group.label, items }];
  });
}
