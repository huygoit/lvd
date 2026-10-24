import type { User } from "@/shared/auth/types";
import { formatVnd } from "@/shared/lib/money";
import { formatYmd } from "@/shared/lib/dates";
import { collectScope, parseFilters } from "@/modules/dashboard/services/dashboard";
import type { CustomerStatus, Dataset, InternalStatus, ProjectStage, QuoteRow, Tone } from "@/modules/dashboard/types";
import { routes } from "@/shared/config/routes";

export type CustomerListRow = {
  id: string;
  href: string;
  code: string;
  name: string;
  owner: string;
  createdLabel: string;
};

export type RecordList<T> = {
  status: "ok" | "empty" | "unavailable" | "forbidden";
  title: string;
  description: string;
  message: string | null;
  rows: T[];
  focus: T | null;
};

function personName(dataset: Dataset, id: string) {
  return dataset.people.find((person) => person.id === id)?.name ?? "Chưa gán";
}

export function listCustomers(user: User, dataset: Dataset, params: URLSearchParams, now: Date, mode: "demo" | "none"): RecordList<CustomerListRow> {
  const filters = parseFilters(params, now);
  const scoped = collectScope(user, dataset, filters);
  if (!scoped.customers) {
    return { status: "forbidden", title: "Khách hàng", description: "", message: null, rows: [], focus: null };
  }
  if (mode === "none") {
    return {
      status: "unavailable",
      title: "Khách hàng",
      description: "Khách được tạo trong kỳ đang chọn.",
      message: "Chưa kết nối nguồn dữ liệu vận hành.",
      rows: [],
      focus: null,
    };
  }
  const code = params.get("ma");
  const rows = scoped.customers
    .filter((row) => row.createdOn >= filters.from && row.createdOn <= filters.to)
    .filter((row) => (code ? row.code === code : true))
    .sort((left, right) => right.createdOn.localeCompare(left.createdOn))
    .map((row) => ({
      id: row.id,
      href: `${routes.customers}?ma=${row.code}`,
      code: row.code,
      name: row.name,
      owner: personName(dataset, row.ownerId),
      createdLabel: formatYmd(row.createdOn),
    }));
  return {
    status: rows.length === 0 ? "empty" : "ok",
    title: "Khách hàng",
    description: "Danh sách khách tạo trong kỳ. Không gồm khách cũ ngoài khoảng ngày.",
    message: rows.length === 0 ? "Chưa có khách hàng trong kỳ này." : null,
    rows,
    focus: code ? (rows[0] ?? null) : null,
  };
}

export function listProjects(user: User, dataset: Dataset, params: URLSearchParams, now: Date, mode: "demo" | "none") {
  const filters = parseFilters(params, now);
  const scoped = collectScope(user, dataset, filters);
  if (!scoped.projects) {
    return { status: "forbidden" as const, title: "Công trình", description: "", message: null, rows: [], focus: null };
  }
  if (mode === "none") {
    return {
      status: "unavailable" as const,
      title: "Công trình",
      description: "Công trình đang mở tại thời điểm hiện tại.",
      message: "Chưa kết nối nguồn dữ liệu vận hành.",
      rows: [],
      focus: null,
    };
  }
  const code = params.get("ma");
  const stage = params.get("giai-doan");
  const overdueOnly = params.get("qua-han") === "1";
  const stages: ProjectStage[] = ["khao_sat", "bao_gia", "thuong_luong", "cho_quyet_dinh"];
  const rows = scoped.projects
    .filter((row) => (stage && stages.includes(stage as ProjectStage) ? row.stage === stage : true))
    .filter((row) => (overdueOnly ? row.nextDue !== null && row.nextDue < filters.today : true))
    .filter((row) => (code ? row.code === code : true))
    .map((row) => ({
      id: row.id,
      href: `${routes.projects}?ma=${row.code}`,
      code: row.code,
      name: row.name,
      location: row.location,
      customer: dataset.customers.find((item) => item.id === row.customerId)?.name ?? "Khách chưa rõ",
      owner: personName(dataset, row.ownerId),
      stage: row.stage,
      milestone: row.nextMilestone,
      dueLabel: row.nextDue ? formatYmd(row.nextDue) : "Chưa có hạn",
      overdue: row.nextDue !== null && row.nextDue < filters.today,
    }));
  return {
    status: rows.length === 0 ? ("empty" as const) : ("ok" as const),
    title: "Công trình",
    description: "Giai đoạn kinh doanh hiện tại. Chưa đo phần trăm hoàn thành vì chưa có khối lượng.",
    message: rows.length === 0 ? "Chưa có công trình trong phạm vi này." : null,
    rows,
    focus: code ? (rows[0] ?? null) : null,
  };
}

export function listQuotations(user: User, dataset: Dataset, params: URLSearchParams, now: Date, mode: "demo" | "none"): RecordList<QuoteRow> {
  const filters = parseFilters(params, now);
  const scoped = collectScope(user, dataset, filters);
  if (!scoped.quotes) {
    return { status: "forbidden", title: "Báo giá", description: "", message: null, rows: [], focus: null };
  }
  if (mode === "none") {
    return {
      status: "unavailable",
      title: "Báo giá",
      description: "Phiên bản hiện hành.",
      message: "Chưa kết nối nguồn dữ liệu vận hành.",
      rows: [],
      focus: null,
    };
  }
  const code = params.get("ma");
  const internal = params.get("noi-bo") as InternalStatus | null;
  const customer = params.get("khach") as CustomerStatus | null;
  const periodBound = !internal && !customer && params.get("tat-ca") !== "1";
  const rows = scoped.quotes
    .filter((row) => row.isCurrent)
    .filter((row) => (internal ? row.internalStatus === internal : true))
    .filter((row) => (customer ? row.customerStatus === customer : true))
    .filter((row) => {
      if (customer === "da_chap_thuan") {
        return row.acceptedOn !== null && row.acceptedOn >= filters.from && row.acceptedOn <= filters.to;
      }
      if (periodBound) return row.createdOn >= filters.from && row.createdOn <= filters.to;
      return true;
    })
    .filter((row) => (code ? row.code === code : true))
    .sort((left, right) => right.createdOn.localeCompare(left.createdOn))
    .map((row): QuoteRow => ({
      id: row.id,
      href: `${routes.quotations}?ma=${row.code}`,
      code: row.code,
      versionLabel: `Phiên bản ${row.version}`,
      project: dataset.projects.find((item) => item.id === row.projectId)?.name ?? "Công trình chưa rõ",
      customer: dataset.customers.find((item) => item.id === row.customerId)?.name ?? "Khách chưa rõ",
      valueLabel: formatVnd(row.valueBeforeTaxVnd),
      createdLabel: formatYmd(row.createdOn),
      validLabel: formatYmd(row.validUntil),
      owner: personName(dataset, row.ownerId),
      internalLabel:
        row.internalStatus === "cho_duyet"
          ? "Chờ duyệt nội bộ"
          : row.internalStatus === "da_duyet"
            ? "Đã duyệt nội bộ"
            : row.internalStatus === "tu_choi"
              ? "Từ chối nội bộ"
              : "Nháp nội bộ",
      internalTone: (row.internalStatus === "da_duyet"
        ? "success"
        : row.internalStatus === "cho_duyet"
          ? "warning"
          : row.internalStatus === "tu_choi"
            ? "danger"
            : "neutral") as Tone,
      customerLabel:
        row.customerStatus === "da_chap_thuan"
          ? "Khách đã chấp thuận"
          : row.customerStatus === "dang_thuong_luong"
            ? "Đang thương lượng"
            : row.customerStatus === "tu_choi"
              ? "Khách từ chối"
              : row.customerStatus === "het_hieu_luc"
                ? "Hết hiệu lực"
                : "Khách chưa phản hồi",
      customerTone: (row.customerStatus === "da_chap_thuan"
        ? "success"
        : row.customerStatus === "dang_thuong_luong"
          ? "warning"
          : row.customerStatus === "tu_choi" || row.customerStatus === "het_hieu_luc"
            ? "danger"
            : "neutral") as Tone,
    }));
  return {
    status: rows.length === 0 ? "empty" : "ok",
    title: "Báo giá",
    description: periodBound
      ? "Phiên bản hiện hành được lập trong kỳ. Bản cũ của cùng mã không hiện lại."
      : "Phiên bản hiện hành theo trạng thái. Chờ duyệt là duyệt nội bộ, không phải khách đã chấp thuận.",
    message: rows.length === 0 ? "Chưa có báo giá khớp bộ lọc." : null,
    rows,
    focus: code ? (rows[0] ?? null) : null,
  };
}
