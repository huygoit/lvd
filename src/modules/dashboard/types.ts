export type PeriodPreset = "hom-nay" | "7-ngay" | "30-ngay" | "thang-nay" | "tuy-chon";

export type ProjectStage = "khao_sat" | "bao_gia" | "thuong_luong" | "cho_quyet_dinh" | "da_chot";

export type InternalStatus = "nhap" | "cho_duyet" | "da_duyet" | "tu_choi";

export type CustomerStatus =
  | "chua_phan_hoi"
  | "dang_thuong_luong"
  | "da_chap_thuan"
  | "tu_choi"
  | "het_hieu_luc";

export type Tone = "success" | "warning" | "danger" | "neutral" | "info";

export type Person = { id: string; name: string };

export type Customer = {
  id: string;
  code: string;
  name: string;
  ownerId: string;
  createdOn: string;
};

export type Project = {
  id: string;
  code: string;
  name: string;
  location: string;
  customerId: string;
  ownerId: string;
  stage: ProjectStage;
  otherStageCount: number;
  nextMilestone: string;
  nextDue: string | null;
};

export type Quotation = {
  id: string;
  code: string;
  version: number;
  isCurrent: boolean;
  projectId: string;
  customerId: string;
  ownerId: string;
  valueBeforeTaxVnd: number;
  createdOn: string;
  validUntil: string;
  acceptedOn: string | null;
  internalStatus: InternalStatus;
  customerStatus: CustomerStatus;
  dossierId?: string;
};

export type Appointment = {
  id: string;
  date: string;
  time: string | null;
  projectId: string;
  location: string;
  ownerId: string;
  confirmed: boolean;
};

export type Dataset = {
  customers: Customer[];
  projects: Project[];
  quotations: Quotation[];
  appointments: Appointment[];
  people: Person[];
  linked?: boolean;
};

export type ResolvedFilters = {
  preset: PeriodPreset;
  from: string;
  to: string;
  ownerId: string | null;
  today: string;
};

export type SectionStatus = "ok" | "empty" | "error" | "hidden" | "unavailable";

export type KpiView = {
  id: string;
  label: string;
  value: string;
  raw: number | null;
  amount: number | null;
  note: string;
  delta: string | null;
  href: string | null;
  basis: "ky" | "hien-tai";
};

export type ActionView = {
  id: string;
  label: string;
  description: string;
  href: string;
  emphasis: "primary" | "secondary";
};

export type ProjectRow = {
  id: string;
  href: string;
  code: string;
  name: string;
  location: string;
  customer: string;
  owner: string;
  stage: string;
  otherStageNote: string | null;
  milestone: string;
  dueLabel: string;
  overdue: boolean;
};

export type TaskRow = {
  id: string;
  title: string;
  record: string;
  href: string;
  dueLabel: string;
  owner: string;
  badge: string;
  tone: Tone;
};

export type QuoteRow = {
  id: string;
  href: string;
  code: string;
  versionLabel: string;
  project: string;
  customer: string;
  valueLabel: string;
  createdLabel: string;
  validLabel: string;
  owner: string;
  internalLabel: string;
  internalTone: Tone;
  customerLabel: string;
  customerTone: Tone;
};

export type ScheduleRow = {
  id: string;
  title: string;
  whenLabel: string;
  project: string;
  location: string;
  owner: string;
  statusLabel: string;
  tone: Tone;
  href: string;
};

export type ChartPoint = { label: string; value: number; color?: string };

export type ChartView = {
  id: string;
  title: string;
  question: string;
  unitLabel: string;
  kind: "column" | "bar" | "donut";
  points: ChartPoint[];
  summary: string;
  empty: boolean;
};

export type ListSection<T> = {
  status: SectionStatus;
  message: string | null;
  href: string | null;
  total: number;
  rows: T;
};

export type DashboardView = {
  source: "demo" | "none" | "live";
  illustrative: boolean;
  updatedLabel: string;
  updatedIso: string;
  greeting: string;
  situation: string;
  periodLabel: string;
  periodNote: string;
  query: string;
  filters: ResolvedFilters;
  owners: Person[] | null;
  kpis: KpiView[];
  actions: ActionView[];
  projects: ListSection<ProjectRow[]>;
  tasks: ListSection<TaskRow[]>;
  charts: ListSection<ChartView[]>;
  quotations: ListSection<QuoteRow[]>;
  schedule: ListSection<ScheduleRow[]>;
};

export type Attention = {
  count: number;
  unavailable: boolean;
  items: Array<{ id: string; title: string; href: string; badge: string }>;
};

export type SearchGroup = {
  id: string;
  label: string;
  items: Array<{ href: string; title: string; meta: string }>;
};

export type Fault = "bieu-do" | "cong-trinh" | "viec";
