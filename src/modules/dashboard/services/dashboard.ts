import { hasAnyCapability, hasCapability, type User } from "@/shared/auth/types";
import { routes } from "@/shared/config/routes";
import {
  addDays,
  daysInclusive,
  formatDateTime,
  formatYmd,
  greetingFor,
  inRange,
  isYmd,
  todayYmd,
  zonedHour,
} from "@/shared/lib/dates";
import { formatCount, formatVnd } from "@/shared/lib/money";
import type {
  Appointment,
  ChartView,
  Customer,
  CustomerStatus,
  DashboardView,
  Dataset,
  Fault,
  InternalStatus,
  KpiView,
  PeriodPreset,
  Project,
  ProjectRow,
  ProjectStage,
  Quotation,
  QuoteRow,
  ResolvedFilters,
  ScheduleRow,
  TaskRow,
} from "@/modules/dashboard/types";

const presets: PeriodPreset[] = ["hom-nay", "7-ngay", "30-ngay", "thang-nay", "tuy-chon"];

const stageLabel: Record<ProjectStage, string> = {
  khao_sat: "Khảo sát",
  bao_gia: "Lập báo giá",
  thuong_luong: "Thương lượng",
  cho_quyet_dinh: "Chờ quyết định",
  da_chot: "Đã chốt",
};

const internalLabel: Record<InternalStatus, string> = {
  nhap: "Nháp nội bộ",
  cho_duyet: "Chờ duyệt nội bộ",
  da_duyet: "Đã duyệt nội bộ",
  tu_choi: "Từ chối nội bộ",
};

const customerLabel: Record<CustomerStatus, string> = {
  chua_phan_hoi: "Khách chưa phản hồi",
  dang_thuong_luong: "Đang thương lượng",
  da_chap_thuan: "Khách đã chấp thuận",
  tu_choi: "Khách từ chối",
  het_hieu_luc: "Hết hiệu lực",
};

const customerColor: Record<CustomerStatus, string> = {
  chua_phan_hoi: "#64748B",
  dang_thuong_luong: "#B45309",
  da_chap_thuan: "#047857",
  tu_choi: "#B91C1C",
  het_hieu_luc: "#0F172A",
};

const presetLabel: Record<PeriodPreset, string> = {
  "hom-nay": "Hôm nay",
  "7-ngay": "7 ngày gần nhất",
  "30-ngay": "30 ngày gần nhất",
  "thang-nay": "Tháng này",
  "tuy-chon": "Tùy chọn",
};

type Scope<T> = T[] | null;

export function parseFilters(params: URLSearchParams, now: Date): ResolvedFilters {
  const today = todayYmd(now);
  const requested = params.get("ky");
  const preset = presets.includes(requested as PeriodPreset) ? (requested as PeriodPreset) : "30-ngay";
  const ownerRaw = params.get("phu-trach")?.trim() ?? "";
  const ownerId = ownerRaw.length > 0 ? ownerRaw : null;
  if (preset === "hom-nay") return { preset, from: today, to: today, ownerId, today };
  if (preset === "7-ngay") return { preset, from: addDays(today, -6), to: today, ownerId, today };
  if (preset === "30-ngay") return { preset, from: addDays(today, -29), to: today, ownerId, today };
  if (preset === "thang-nay") {
    return { preset, from: `${today.slice(0, 8)}01`, to: today, ownerId, today };
  }
  const from = params.get("tu") ?? "";
  const to = params.get("den") ?? "";
  if (isYmd(from) && isYmd(to) && from <= to) {
    return { preset, from, to, ownerId, today };
  }
  return { preset: "30-ngay", from: addDays(today, -29), to: today, ownerId, today };
}

export function toQuery(filters: ResolvedFilters, extra?: Record<string, string>) {
  const params = new URLSearchParams();
  params.set("ky", filters.preset);
  if (filters.preset === "tuy-chon") {
    params.set("tu", filters.from);
    params.set("den", filters.to);
  }
  if (filters.ownerId) params.set("phu-trach", filters.ownerId);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) params.set(key, value);
  }
  return params.toString();
}

function previousWindow(from: string, to: string) {
  const length = daysInclusive(from, to);
  const end = addDays(from, -1);
  return { from: addDays(end, -(length - 1)), to: end };
}

function personName(dataset: Dataset, id: string) {
  return dataset.people.find((person) => person.id === id)?.name ?? "Chưa gán";
}

function customerName(dataset: Dataset, id: string) {
  return dataset.customers.find((customer) => customer.id === id)?.name ?? "Khách chưa rõ";
}

function projectName(dataset: Dataset, id: string) {
  return dataset.projects.find((project) => project.id === id)?.name ?? "Công trình chưa rõ";
}

function canFilterOwners(user: User) {
  return (
    hasCapability(user, "customers.view") ||
    hasCapability(user, "projects.view") ||
    hasCapability(user, "quotations.view")
  );
}

function scopeRows<T extends { ownerId: string }>(
  rows: T[],
  user: User,
  all: "customers.view" | "projects.view" | "quotations.view",
  assigned:
    | "customers.view.assigned"
    | "projects.view.assigned"
    | "quotations.view.assigned",
): Scope<T> {
  if (hasCapability(user, all)) return rows;
  if (hasCapability(user, assigned)) return rows.filter((row) => row.ownerId === user.id);
  return null;
}

function applyOwner<T extends { ownerId: string }>(rows: Scope<T>, ownerId: string | null, allow: boolean) {
  if (!rows || !allow || !ownerId) return rows;
  return rows.filter((row) => row.ownerId === ownerId);
}

function deltaLabel(current: number, previous: number) {
  if (previous === 0) return "Chưa có cơ sở so sánh";
  if (current === previous) return "Bằng kỳ trước";
  if (current > previous) return `Cao hơn kỳ trước ${formatCount(current - previous)}`;
  return `Thấp hơn kỳ trước ${formatCount(previous - current)}`;
}

function listHref(path: string, filters: ResolvedFilters, extra?: Record<string, string>) {
  return `${path}?${toQuery(filters, extra)}`;
}

function hiddenSection<T>(): {
  status: "hidden";
  message: null;
  href: null;
  total: 0;
  rows: T;
} {
  return { status: "hidden", message: null, href: null, total: 0, rows: [] as T };
}

function mondayOf(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.getUTCDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  return addDays(ymd, delta);
}

function buckets(from: string, to: string) {
  const byDay = daysInclusive(from, to) <= 14;
  const points = new Map<string, { label: string; value: number }>();
  if (byDay) {
    for (let cursor = from; cursor <= to; cursor = addDays(cursor, 1)) {
      points.set(cursor, { label: formatYmd(cursor).slice(0, 5), value: 0 });
    }
    return { byDay, points, keyOf: (ymd: string) => ymd };
  }
  for (let cursor = mondayOf(from); cursor <= to; cursor = addDays(cursor, 7)) {
    if (cursor < mondayOf(from)) continue;
    points.set(cursor, { label: formatYmd(cursor).slice(0, 5), value: 0 });
  }
  return { byDay: false, points, keyOf: (ymd: string) => mondayOf(ymd) };
}

function fillBuckets(from: string, to: string, dates: string[]) {
  const series = buckets(from, to);
  for (const date of dates) {
    if (!inRange(date, from, to)) continue;
    const key = series.keyOf(date);
    const point = series.points.get(key);
    if (point) point.value += 1;
  }
  return [...series.points.values()];
}

function summaryOf(points: Array<{ label: string; value: number }>, unit: string) {
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const parts = points
    .filter((point) => point.value > 0)
    .map((point) => `${point.label} ${formatCount(point.value)}`);
  if (total === 0) return `Chưa có ${unit} trong phạm vi này.`;
  return `Tổng ${formatCount(total)} ${unit}. ${parts.join(", ")}.`;
}

function toneOfInternal(status: InternalStatus): QuoteRow["internalTone"] {
  if (status === "da_duyet") return "success";
  if (status === "cho_duyet") return "warning";
  if (status === "tu_choi") return "danger";
  return "neutral";
}

function toneOfCustomer(status: CustomerStatus): QuoteRow["customerTone"] {
  if (status === "da_chap_thuan") return "success";
  if (status === "dang_thuong_luong") return "warning";
  if (status === "tu_choi" || status === "het_hieu_luc") return "danger";
  return "neutral";
}

function currentOnly(rows: Quotation[]) {
  return rows.filter((row) => row.isCurrent);
}

function situationText(
  quotes: Scope<Quotation>,
  appointments: Scope<Appointment>,
  today: string,
) {
  const parts: string[] = [];
  if (quotes) {
    const pending = currentOnly(quotes).filter((row) => row.internalStatus === "cho_duyet").length;
    parts.push(
      pending === 0
        ? "Không có báo giá chờ duyệt"
        : `Có ${formatCount(pending)} báo giá chờ duyệt`,
    );
  }
  if (appointments) {
    const surveys = appointments.filter((row) => row.date === today).length;
    parts.push(
      surveys === 0
        ? "không có lịch khảo sát hôm nay"
        : `có ${formatCount(surveys)} lịch khảo sát hôm nay`,
    );
  }
  if (parts.length === 0) return "Chưa có chỉ số nào trong quyền xem hiện tại.";
  if (parts.length === 1) return `${parts[0]}.`;
  return `${parts[0]}, ${parts[1]}.`;
}

function projectRows(dataset: Dataset, projects: Project[], today: string): ProjectRow[] {
  return [...projects]
    .sort((left, right) => {
      const leftOver = left.nextDue !== null && left.nextDue < today ? 0 : 1;
      const rightOver = right.nextDue !== null && right.nextDue < today ? 0 : 1;
      if (leftOver !== rightOver) return leftOver - rightOver;
      if (left.nextDue === right.nextDue) return left.code.localeCompare(right.code);
      if (!left.nextDue) return 1;
      if (!right.nextDue) return -1;
      return left.nextDue.localeCompare(right.nextDue);
    })
    .map((project) => {
      const overdue = project.nextDue !== null && project.nextDue < today;
      const dueLabel = project.nextDue
        ? overdue
          ? `Hạn ${formatYmd(project.nextDue)} · Quá hạn`
          : `Hạn ${formatYmd(project.nextDue)}`
        : "Chưa có hạn";
      return {
        id: project.id,
        href: dataset.linked ? `/cong-trinh/${project.id}` : `${routes.projects}?ma=${project.code}`,
        code: project.code,
        name: project.name,
        location: project.location,
        customer: customerName(dataset, project.customerId),
        owner: personName(dataset, project.ownerId),
        stage: stageLabel[project.stage],
        otherStageNote:
          project.otherStageCount > 0
            ? `Kèm ${formatCount(project.otherStageCount)} hạng mục ở giai đoạn khác`
            : null,
        milestone: project.nextMilestone,
        dueLabel,
        overdue,
      };
    });
}

function quoteRows(dataset: Dataset, quotes: Quotation[]): QuoteRow[] {
  return [...currentOnly(quotes)]
    .sort((left, right) => right.createdOn.localeCompare(left.createdOn) || left.code.localeCompare(right.code))
    .map((quote) => ({
      id: quote.id,
      href: dataset.linked && quote.dossierId ? `/bao-gia/${quote.dossierId}` : `${routes.quotations}?ma=${quote.code}`,
      code: quote.code,
      versionLabel: `Phiên bản ${quote.version}`,
      project: projectName(dataset, quote.projectId),
      customer: customerName(dataset, quote.customerId),
      valueLabel: formatVnd(quote.valueBeforeTaxVnd),
      createdLabel: formatYmd(quote.createdOn),
      validLabel: formatYmd(quote.validUntil),
      owner: personName(dataset, quote.ownerId),
      internalLabel: internalLabel[quote.internalStatus],
      internalTone: toneOfInternal(quote.internalStatus),
      customerLabel: customerLabel[quote.customerStatus],
      customerTone: toneOfCustomer(quote.customerStatus),
    }));
}

function taskRows(dataset: Dataset, quotes: Scope<Quotation>, appointments: Scope<Appointment>, today: string) {
  const tasks: Array<TaskRow & { rank: number; sort: string }> = [];
  for (const quote of currentOnly(quotes ?? [])) {
    const expired = quote.validUntil < today;
    const soon = !expired && quote.validUntil <= addDays(today, 7);
    const pending = quote.internalStatus === "cho_duyet";
    if (!expired && !soon && !pending) continue;
    const badge = expired
      ? "Quá hạn hiệu lực"
      : pending && soon
        ? "Chờ duyệt · sắp hết hạn"
        : pending
          ? "Chờ duyệt"
          : "Sắp hết hiệu lực";
    const tone = expired || (pending && soon) ? "danger" : "warning";
    const rank = expired ? 0 : pending && soon ? 1 : pending ? 2 : 3;
    tasks.push({
      id: `bao-gia-${quote.code}`,
      title: `Báo giá ${quote.code}`,
      record: `${projectName(dataset, quote.projectId)} · ${customerName(dataset, quote.customerId)}`,
      href: dataset.linked && quote.dossierId ? `/bao-gia/${quote.dossierId}` : `${routes.quotations}?ma=${quote.code}`,
      dueLabel: `Hiệu lực ${formatYmd(quote.validUntil)}`,
      owner: personName(dataset, quote.ownerId),
      badge,
      tone,
      rank,
      sort: quote.validUntil,
    });
  }
  for (const visit of appointments ?? []) {
    if (visit.date < today || visit.date > addDays(today, 2)) continue;
    tasks.push({
      id: `khao-sat-${visit.id}`,
      title: "Lịch khảo sát",
      record: projectName(dataset, visit.projectId),
      href: dataset.linked
        ? `/cong-trinh/${visit.projectId}`
        : `${routes.projects}?ma=${dataset.projects.find((item) => item.id === visit.projectId)?.code ?? ""}`,
      dueLabel: visit.time ? `${formatYmd(visit.date)} · ${visit.time}` : formatYmd(visit.date),
      owner: personName(dataset, visit.ownerId),
      badge: visit.confirmed ? "Đã xác nhận" : "Chờ xác nhận",
      tone: visit.date === today && !visit.confirmed ? "warning" : "info",
      rank: visit.date === today ? 1 : 4,
      sort: `${visit.date}T${visit.time ?? "99:99"}`,
    });
  }
  return tasks
    .sort((left, right) => left.rank - right.rank || left.sort.localeCompare(right.sort))
    .map((task) => ({
      id: task.id,
      title: task.title,
      record: task.record,
      href: task.href,
      dueLabel: task.dueLabel,
      owner: task.owner,
      badge: task.badge,
      tone: task.tone,
    }));
}

function scheduleRows(dataset: Dataset, appointments: Appointment[], today: string): ScheduleRow[] {
  return appointments
    .filter((visit) => visit.date >= today && visit.date <= addDays(today, 14))
    .sort((left, right) => left.date.localeCompare(right.date) || (left.time ?? "99:99").localeCompare(right.time ?? "99:99"))
    .map((visit) => {
      const project = dataset.projects.find((item) => item.id === visit.projectId);
      return {
        id: visit.id,
        title: "Khảo sát hiện trường",
        whenLabel: visit.time ? `${formatYmd(visit.date)} · ${visit.time}` : formatYmd(visit.date),
        project: project?.name ?? "Công trình chưa rõ",
        location: visit.location,
        owner: personName(dataset, visit.ownerId),
        statusLabel: visit.confirmed ? "Đã xác nhận" : "Chờ xác nhận",
        tone: visit.confirmed ? "success" : "warning",
        href: dataset.linked && project ? `/cong-trinh/${project.id}` : `${routes.projects}?ma=${project?.code ?? ""}`,
      };
    });
}

function chartsFor(
  filters: ResolvedFilters,
  customers: Scope<Customer>,
  projects: Scope<Project>,
  quotes: Scope<Quotation>,
): ChartView[] {
  const charts: ChartView[] = [];
  if (customers) {
    const points = fillBuckets(
      filters.from,
      filters.to,
      customers.filter((row) => inRange(row.createdOn, filters.from, filters.to)).map((row) => row.createdOn),
    );
    charts.push({
      id: "khach-moi",
      title: "Khách hàng mới theo kỳ",
      question: "Mỗi mốc đếm khách được tạo trong khoảng đã chọn.",
      unitLabel: "khách",
      kind: "column",
      points,
      summary: summaryOf(points, "khách"),
      empty: points.every((point) => point.value === 0),
    });
  }
  if (quotes) {
    const current = currentOnly(quotes);
    const points = fillBuckets(
      filters.from,
      filters.to,
      current.filter((row) => inRange(row.createdOn, filters.from, filters.to)).map((row) => row.createdOn),
    );
    charts.push({
      id: "bao-gia-lap",
      title: "Báo giá lập theo kỳ",
      question: "Mỗi mốc đếm phiên bản hiện hành được lập trong khoảng. Phiên bản cũ không được cộng thêm.",
      unitLabel: "báo giá",
      kind: "column",
      points,
      summary: summaryOf(points, "báo giá"),
      empty: points.every((point) => point.value === 0),
    });
    const statuses: CustomerStatus[] = [
      "chua_phan_hoi",
      "dang_thuong_luong",
      "da_chap_thuan",
      "tu_choi",
      "het_hieu_luc",
    ];
    const statusPoints = statuses.map((status) => ({
      label: customerLabel[status],
      value: current.filter((row) => row.customerStatus === status).length,
      color: customerColor[status],
    }));
    charts.push({
      id: "trang-thai-khach",
      title: "Phản hồi khách hàng",
      question: "Đếm phiên bản hiện hành tại thời điểm này. Đã duyệt nội bộ không có nghĩa khách đã chấp thuận.",
      unitLabel: "báo giá",
      kind: "donut",
      points: statusPoints.filter((point) => point.value > 0),
      summary: summaryOf(statusPoints, "báo giá hiện hành"),
      empty: statusPoints.every((point) => point.value === 0),
    });
  }
  if (projects) {
    const stages: ProjectStage[] = ["khao_sat", "bao_gia", "thuong_luong", "cho_quyet_dinh", "da_chot"];
    const points = stages.map((stage) => ({
      label: stageLabel[stage],
      value: projects.filter((row) => row.stage === stage).length,
    }));
    charts.push({
      id: "giai-doan",
      title: "Công trình theo giai đoạn kinh doanh",
      question: "Mỗi công trình một giai đoạn chính tại thời điểm này. Hạng mục song song không bị gộp vào phần trăm.",
      unitLabel: "công trình",
      kind: "bar",
      points,
      summary: summaryOf(points, "công trình"),
      empty: points.every((point) => point.value === 0),
    });
  }
  return charts;
}

function kpisFor(
  user: User,
  filters: ResolvedFilters,
  customers: Scope<Customer>,
  projects: Scope<Project>,
  quotes: Scope<Quotation>,
): KpiView[] {
  const cards: KpiView[] = [];
  const previous = previousWindow(filters.from, filters.to);
  if (customers) {
    const current = customers.filter((row) => inRange(row.createdOn, filters.from, filters.to)).length;
    const before = customers.filter((row) => inRange(row.createdOn, previous.from, previous.to)).length;
    cards.push({
      id: "khach-moi",
      label: "Khách hàng mới",
      value: formatCount(current),
      raw: current,
      amount: null,
      note: "Khách được tạo trong kỳ đã chọn.",
      delta: deltaLabel(current, before),
      href: listHref(routes.customers, filters),
      basis: "ky",
    });
  }
  if (projects) {
    const overdue = projects.filter((row) => row.nextDue !== null && row.nextDue < filters.today).length;
    cards.push({
      id: "cong-trinh-mo",
      label: "Công trình đang mở",
      value: formatCount(projects.length),
      raw: projects.length,
      amount: null,
      note:
        overdue > 0
          ? `Tại thời điểm hiện tại. Trong đó ${formatCount(overdue)} công trình quá hạn mốc kế tiếp.`
          : "Tại thời điểm hiện tại. Chưa có mốc kế tiếp quá hạn.",
      delta: null,
      href: listHref(routes.projects, filters),
      basis: "hien-tai",
    });
  }
  if (quotes) {
    const current = currentOnly(quotes);
    const created = current.filter((row) => inRange(row.createdOn, filters.from, filters.to));
    const createdBefore = current.filter((row) => inRange(row.createdOn, previous.from, previous.to));
    const pending = current.filter((row) => row.internalStatus === "cho_duyet");
    const talking = current.filter((row) => row.customerStatus === "dang_thuong_luong");
    const accepted = current.filter(
      (row) => row.customerStatus === "da_chap_thuan" && row.acceptedOn !== null && inRange(row.acceptedOn, filters.from, filters.to),
    );
    const acceptedBefore = current.filter(
      (row) =>
        row.customerStatus === "da_chap_thuan" &&
        row.acceptedOn !== null &&
        inRange(row.acceptedOn, previous.from, previous.to),
    );
    const acceptedAmount = accepted.reduce((sum, row) => sum + row.valueBeforeTaxVnd, 0);
    cards.push(
      {
        id: "bao-gia-lap",
        label: "Báo giá lập trong kỳ",
        value: formatCount(created.length),
        raw: created.length,
        amount: null,
        note: "Chỉ tính phiên bản hiện hành có ngày lập trong kỳ.",
        delta: deltaLabel(created.length, createdBefore.length),
        href: listHref(routes.quotations, filters),
        basis: "ky",
      },
      {
        id: "cho-duyet",
        label: "Báo giá chờ duyệt",
        value: formatCount(pending.length),
        raw: pending.length,
        amount: null,
        note: "Phiên bản hiện hành đang chờ duyệt nội bộ. Đây là trạng thái tại thời điểm hiện tại, chưa có ảnh chụp lịch sử.",
        delta: null,
        href: listHref(routes.quotations, filters, { "noi-bo": "cho_duyet" }),
        basis: "hien-tai",
      },
      {
        id: "thuong-luong",
        label: "Đang thương lượng",
        value: formatCount(talking.length),
        raw: talking.length,
        amount: null,
        note: "Phản hồi khách hàng của phiên bản hiện hành. Khác với trạng thái duyệt nội bộ.",
        delta: null,
        href: listHref(routes.quotations, filters, { khach: "dang_thuong_luong" }),
        basis: "hien-tai",
      },
      {
        id: "chap-thuan",
        label: "Khách chấp thuận trong kỳ",
        value: formatCount(accepted.length),
        raw: accepted.length,
        amount: acceptedAmount,
        note:
          accepted.length === 0
            ? "Chưa có báo giá khách chấp thuận trong kỳ. Không quy đổi thành giá trị hợp đồng."
            : `Tổng trước thuế ${formatVnd(acceptedAmount)}. Không phải giá trị hợp đồng.`,
        delta: deltaLabel(accepted.length, acceptedBefore.length),
        href: listHref(routes.quotations, filters, { khach: "da_chap_thuan" }),
        basis: "ky",
      },
    );
  }
  if (!quotes && projects && !customers) {
    const overdue = projects.filter((row) => row.nextDue !== null && row.nextDue < filters.today).length;
    cards.push({
      id: "moc-qua-han",
      label: "Mốc kế tiếp quá hạn",
      value: formatCount(overdue),
      raw: overdue,
      amount: null,
      note: "Công trình phụ trách có hạn mốc sớm hơn hôm nay.",
      delta: null,
      href: listHref(routes.projects, filters, { "qua-han": "1" }),
      basis: "hien-tai",
    });
  }
  return cards.filter((card) => {
    if (card.id === "cong-trinh-mo" && !hasAnyCapability(user, ["projects.view", "projects.view.assigned"])) {
      return false;
    }
    return true;
  });
}

function actionsFor(user: User) {
  const actions: DashboardView["actions"] = [];
  if (hasAnyCapability(user, ["customers.view", "customers.view.assigned"]) && hasCapability(user, "customers.create")) {
    actions.push({
      id: "them-khach",
      label: "Thêm khách hàng",
      description: "Mở màn hình ghi khách mới",
      href: routes.customerCreate,
      emphasis: "secondary",
    });
  }
  if (hasAnyCapability(user, ["projects.view", "projects.view.assigned"]) && hasCapability(user, "projects.create")) {
    actions.push({
      id: "them-cong-trinh",
      label: "Thêm công trình",
      description: "Mở hồ sơ công trình mới",
      href: routes.projectCreate,
      emphasis: "secondary",
    });
  }
  if (hasAnyCapability(user, ["quotations.view", "quotations.view.assigned"]) && hasCapability(user, "quotations.create")) {
    actions.push({
      id: "tao-bao-gia",
      label: "Tạo báo giá",
      description: "Mở phiên bản báo giá mới",
      href: routes.quotationCreate,
      emphasis: "primary",
    });
  }
  return actions;
}

export function collectScope(user: User, dataset: Dataset, filters: ResolvedFilters) {
  const allowOwner = canFilterOwners(user);
  const ownerId = allowOwner ? filters.ownerId : null;
  return {
    allowOwner,
    ownerId,
    customers: applyOwner(
      scopeRows(dataset.customers, user, "customers.view", "customers.view.assigned"),
      ownerId,
      allowOwner,
    ),
    projects: applyOwner(
      scopeRows(dataset.projects, user, "projects.view", "projects.view.assigned"),
      ownerId,
      allowOwner,
    ),
    quotes: applyOwner(
      scopeRows(dataset.quotations, user, "quotations.view", "quotations.view.assigned"),
      ownerId,
      allowOwner,
    ),
    appointments: applyOwner(
      scopeRows(dataset.appointments, user, "projects.view", "projects.view.assigned"),
      ownerId,
      allowOwner,
    ),
  };
}

export function buildDashboardView(input: {
  mode: "demo" | "none" | "live";
  user: User;
  dataset: Dataset;
  now: Date;
  filters: ResolvedFilters;
  fault?: Fault | null;
}): DashboardView {
  const { mode, user, dataset, now, filters } = input;
  const { allowOwner, ownerId, customers, projects, quotes, appointments } = collectScope(user, dataset, filters);
  const unavailable = mode === "none";
  const sourceMessage = "Chưa kết nối nguồn dữ liệu vận hành.";
  const projectsAll = projects ? projectRows(dataset, projects, filters.today) : [];
  const quotesAll = quotes ? quoteRows(dataset, quotes) : [];
  const tasksAll = quotes || appointments ? taskRows(dataset, quotes, appointments, filters.today) : [];
  const scheduleAll = appointments ? scheduleRows(dataset, appointments, filters.today) : [];
  const chartList = chartsFor(filters, customers, projects, quotes);
  const canCreateProject = hasCapability(user, "projects.create");
  const canCreateQuote = hasCapability(user, "quotations.create");

  const projectSection: DashboardView["projects"] = !projects
    ? hiddenSection<ProjectRow[]>()
    : unavailable
      ? { status: "unavailable", message: sourceMessage, href: null, total: 0, rows: [] }
      : projectsAll.length === 0
        ? {
            status: "empty",
            message: "Chưa có công trình trong phạm vi này.",
            href: canCreateProject ? routes.projectCreate : null,
            total: 0,
            rows: [],
          }
        : {
            status: "ok",
            message: null,
            href: listHref(routes.projects, filters),
            total: projectsAll.length,
            rows: projectsAll.slice(0, 6),
          };

  const taskSection: DashboardView["tasks"] =
    !quotes && !appointments
      ? hiddenSection<TaskRow[]>()
      : unavailable
        ? { status: "unavailable", message: sourceMessage, href: null, total: 0, rows: [] }
        : tasksAll.length === 0
          ? {
              status: "empty",
              message: "Không có việc cần xử lý trong phạm vi đang xem.",
              href: null,
              total: 0,
              rows: [],
            }
          : { status: "ok", message: null, href: null, total: tasksAll.length, rows: tasksAll.slice(0, 6) };

  const quoteSection: DashboardView["quotations"] = !quotes
    ? hiddenSection<QuoteRow[]>()
    : unavailable
      ? { status: "unavailable", message: sourceMessage, href: null, total: 0, rows: [] }
      : quotesAll.length === 0
        ? {
            status: "empty",
            message: "Chưa có báo giá trong phạm vi này.",
            href: canCreateQuote ? routes.quotationCreate : null,
            total: 0,
            rows: [],
          }
        : {
            status: "ok",
            message: "Mỗi mã chỉ hiện phiên bản hiện hành. Đã duyệt nội bộ khác với khách đã chấp thuận.",
            href: `${routes.quotations}?tat-ca=1`,
            total: quotesAll.length,
            rows: quotesAll.slice(0, 6),
          };

  const scheduleSection: DashboardView["schedule"] = !appointments
    ? hiddenSection<ScheduleRow[]>()
    : unavailable
      ? { status: "unavailable", message: sourceMessage, href: null, total: 0, rows: [] }
      : scheduleAll.length === 0
        ? {
            status: "empty",
            message: "Chưa có lịch khảo sát trong 14 ngày tới. Giao hàng và lắp đặt chưa triển khai.",
            href: null,
            total: 0,
            rows: [],
          }
        : {
            status: "ok",
            message: "Lịch khảo sát. Giao hàng và lắp đặt chưa triển khai.",
            href: null,
            total: scheduleAll.length,
            rows: scheduleAll.slice(0, 6),
          };

  const visibleCharts = chartList.filter((chart) => !chart.empty || chart.points.length > 0);
  const chartSection: DashboardView["charts"] =
    chartList.length === 0
      ? hiddenSection<ChartView[]>()
      : unavailable
        ? { status: "unavailable", message: sourceMessage, href: null, total: 0, rows: [] }
        : visibleCharts.every((chart) => chart.empty)
          ? {
              status: "empty",
              message: "Chưa đủ phát sinh để vẽ biểu đồ trong phạm vi này.",
              href: null,
              total: 0,
              rows: [],
            }
          : { status: "ok", message: null, href: null, total: visibleCharts.length, rows: visibleCharts };

  if (input.fault === "cong-trinh" && projectSection.status !== "hidden") {
    projectSection.status = "error";
    projectSection.message = "Không tải được danh sách công trình.";
    projectSection.rows = [];
    projectSection.total = 0;
  }
  if (input.fault === "viec" && taskSection.status !== "hidden") {
    taskSection.status = "error";
    taskSection.message = "Không tải được việc cần xử lý.";
    taskSection.rows = [];
    taskSection.total = 0;
  }
  if (input.fault === "bieu-do" && chartSection.status !== "hidden") {
    chartSection.status = "error";
    chartSection.message = "Không tải được biểu đồ.";
    chartSection.rows = [];
    chartSection.total = 0;
  }

  const ownerIds = new Set<string>();
  if (allowOwner) {
    for (const row of [
      ...(scopeRows(dataset.customers, user, "customers.view", "customers.view.assigned") ?? []),
      ...(scopeRows(dataset.projects, user, "projects.view", "projects.view.assigned") ?? []),
      ...(scopeRows(dataset.quotations, user, "quotations.view", "quotations.view.assigned") ?? []),
    ]) {
      ownerIds.add(row.ownerId);
    }
  }

  return {
    source: mode,
    illustrative: mode === "demo",
    updatedLabel: formatDateTime(now),
    updatedIso: now.toISOString(),
    greeting: `${greetingFor(zonedHour(now))}, ${user.givenName}`,
    situation: unavailable ? "Chưa có nguồn dữ liệu vận hành để tổng hợp tình hình." : situationText(quotes, appointments, filters.today),
    periodLabel: `${presetLabel[filters.preset]} · ${formatYmd(filters.from)} – ${formatYmd(filters.to)}`,
    periodNote:
      "Chỉ số ghi «Trong kỳ» dùng khoảng này. Chỉ số «Hiện tại» lấy trạng thái lúc tải trang vì chưa có ảnh chụp lịch sử.",
    query: toQuery({ ...filters, ownerId }),
    filters: { ...filters, ownerId },
    owners: allowOwner ? dataset.people.filter((person) => ownerIds.has(person.id)) : null,
    kpis: unavailable ? [] : kpisFor(user, filters, customers, projects, quotes),
    actions: actionsFor(user),
    projects: projectSection,
    tasks: taskSection,
    charts: chartSection,
    quotations: quoteSection,
    schedule: scheduleSection,
  };
}
