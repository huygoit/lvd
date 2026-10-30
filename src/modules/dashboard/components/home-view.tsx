import Link from "next/link";
import dynamic from "next/dynamic";
import { BadgeCheck, Building, Clock3, FileText, MessageSquare, Plus, Users } from "lucide-react";
import { Badge } from "@/shared/components/badge";
import { FilterBar } from "@/modules/dashboard/components/filter-bar";
import { RefreshButton } from "@/modules/dashboard/components/refresh-button";
import { RetryButton } from "@/modules/dashboard/components/retry-button";
import { cn, focusRing } from "@/shared/lib/cn";
import type { ActionView, DashboardView, KpiView, ListSection } from "@/modules/dashboard/types";

const ChartPanel = dynamic(() => import("@/modules/dashboard/components/chart-panel").then((mod) => mod.ChartPanel), {
  loading: () => <div className="h-72 animate-pulse rounded-[18px] bg-white" />,
});

const kpiIcon = {
  "khach-moi": Users,
  "cong-trinh-mo": Building,
  "moc-qua-han": Clock3,
  "bao-gia-lap": FileText,
  "cho-duyet": BadgeCheck,
  "thuong-luong": MessageSquare,
  "chap-thuan": BadgeCheck,
} as const;

export function HomeView({ view }: { view: DashboardView }) {
  const primary = view.actions.find((action) => action.emphasis === "primary");
  const secondary = view.actions.find((action) => action.id === "them-cong-trinh");

  return (
    <div className="space-y-5">
      <section className="bg-brand relative overflow-hidden rounded-[18px] text-white">
        <div className="pointer-events-none absolute -top-16 right-10 size-56 rounded-full bg-white/25 blur-2xl" />
        <div className="pointer-events-none absolute bottom-[-4rem] left-1/3 size-48 rounded-full bg-sky/40 blur-3xl" />
        <svg viewBox="0 0 360 180" className="pointer-events-none absolute -right-6 top-0 hidden h-full w-[280px] text-white/15 lg:block" aria-hidden="true">
          <rect x="40" y="16" width="120" height="148" fill="none" stroke="currentColor" strokeWidth="2" />
          <rect x="180" y="16" width="120" height="148" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M40 16h260M100 16v148M240 16v148" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        <div className="relative grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-center">
          <div>
            <p className="text-[12px] font-medium tracking-wide text-white/75">Tổng quan · Quản lý công trình và vận hành</p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-tight sm:text-[30px]">{view.greeting}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/90">{view.situation}</p>
            {view.illustrative ? (
              <p className="mt-2 inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-medium ring-1 ring-white/25">
                Dữ liệu minh họa
              </p>
            ) : null}
            <p className="mt-3 text-[12px] text-white/75">
              {view.periodLabel}. Cập nhật {view.updatedLabel}.
            </p>
            <p className="mt-1 max-w-2xl text-[12px] leading-5 text-white/70">{view.periodNote}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {primary ? <BannerLink href={primary.href} label={primary.label} solid /> : null}
              {secondary ? <BannerLink href={secondary.href} label={secondary.label} /> : null}
              <RefreshButton query={view.query} updatedLabel={view.updatedLabel} />
            </div>
          </div>
          <FilterBar key={`${view.filters.preset}-${view.filters.from}-${view.filters.to}-${view.filters.ownerId ?? ""}`} filters={view.filters} owners={view.owners} />
        </div>
      </section>

      {view.source === "none" ? (
        <section className="rounded-[18px] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-base font-semibold">Chưa nối nguồn dữ liệu</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Các chỉ số, biểu đồ và danh sách sẽ hiện khi khách hàng, công trình và báo giá được nối dữ liệu. Trang không dùng số 0 để thay cho trạng thái này.
          </p>
        </section>
      ) : (
        <>
          {view.kpis.length > 0 ? <KpiGrid items={view.kpis} /> : null}
          {view.actions.length > 0 ? <QuickActions actions={view.actions} /> : null}
          <div className="grid gap-5 xl:grid-cols-3">
            {view.projects.status !== "hidden" ? (
              <div className={view.tasks.status === "hidden" ? "xl:col-span-3" : "xl:col-span-2"}>
                <ProjectPanel section={view.projects} />
              </div>
            ) : null}
            {view.tasks.status !== "hidden" ? (
              <div id="viec-can-xu-ly">
                <TaskPanel section={view.tasks} />
              </div>
            ) : null}
          </div>
          {view.charts.status === "ok" ? <ChartPanel charts={view.charts.rows} /> : null}
          {view.charts.status === "empty" || view.charts.status === "error" || view.charts.status === "unavailable" ? (
            <Panel title="Biểu đồ" description={view.charts.message} status={view.charts.status} />
          ) : null}
          <div className="grid gap-5 lg:grid-cols-2">
            {view.quotations.status !== "hidden" ? <QuotePanel section={view.quotations} /> : null}
            {view.schedule.status !== "hidden" ? <SchedulePanel section={view.schedule} /> : null}
          </div>
        </>
      )}
      <footer className="pb-4 text-center text-xs text-muted">Công ty TNHH Liên Việt Door · Tổng quan vận hành nội bộ</footer>
    </div>
  );
}

function BannerLink({ href, label, solid = false }: { href: string; label: string; solid?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-[12px] px-3 text-sm font-semibold",
        focusRing,
        solid ? "bg-white text-navy" : "text-white ring-1 ring-white/40",
      )}
    >
      <Plus className="size-4" />
      {label}
    </Link>
  );
}

function KpiGrid({ items }: { items: KpiView[] }) {
  return (
    <section aria-label="Chỉ số" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const Icon = kpiIcon[item.id as keyof typeof kpiIcon] ?? FileText;
        return (
          <article key={item.id} className="rounded-[18px] border border-line bg-white p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-10 place-items-center rounded-[12px] bg-soft text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{item.basis === "ky" ? "Trong kỳ" : "Hiện tại"}</span>
            </div>
            <h2 className="mt-4 text-[13px] font-medium text-muted">{item.label}</h2>
            <p className="mt-1 text-[32px] font-semibold tabular-nums tracking-tight text-ink">{item.value}</p>
            <p className="mt-2 text-[12px] leading-5 text-muted">{item.note}</p>
            {item.delta ? <p className="mt-2 text-[12px] font-medium text-slate-600">{item.delta}</p> : null}
            {item.href ? (
              <Link href={item.href} className={cn("mt-3 inline-flex min-h-11 items-center text-[13px] font-semibold text-primary", focusRing)}>
                Xem danh sách
              </Link>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}

function QuickActions({ actions }: { actions: ActionView[] }) {
  return (
    <section aria-label="Thao tác nhanh" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {actions.map((action) => (
        <Link
          key={action.id}
          href={action.href}
          className={cn("flex min-h-16 items-center justify-between rounded-[16px] border border-line bg-white px-4 py-3 shadow-[var(--shadow-card)]", focusRing)}
        >
          <span>
            <span className="block text-sm font-semibold text-ink">{action.label}</span>
            <span className="block text-[12px] text-muted">{action.description}</span>
          </span>
          <Plus className="size-4 text-primary" />
        </Link>
      ))}
    </section>
  );
}

function Panel({
  title,
  description,
  action,
  status,
  children,
}: {
  title: string;
  description?: string | null;
  action?: React.ReactNode;
  status?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-[18px] border border-line bg-white shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {description ? <p className="mt-1 text-[13px] leading-5 text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5 pt-4">{status === "error" ? <RetryButton /> : children}</div>
    </section>
  );
}

function ProjectPanel({ section }: { section: ListSection<DashboardView["projects"]["rows"]> }) {
  return (
    <Panel
      title="Công trình cần theo dõi"
      description={section.status === "error" ? section.message : "Ưu tiên mốc quá hạn. Giai đoạn là trạng thái kinh doanh, chưa phải phần trăm hoàn thành."}
      action={section.status === "ok" && section.href ? <TextLink href={section.href}>Xem tất cả</TextLink> : null}
      status={section.status}
    >
      {section.status === "ok" ? (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[680px] text-left text-[13px]">
              <caption className="sr-only">Công trình cần theo dõi</caption>
              <thead className="text-muted">
                <tr className="border-b border-line">
                  <th className="pb-2 font-medium">Công trình</th>
                  <th className="pb-2 font-medium">Khách hàng</th>
                  <th className="pb-2 font-medium">Phụ trách</th>
                  <th className="pb-2 font-medium">Giai đoạn</th>
                  <th className="pb-2 font-medium">Mốc kế tiếp</th>
                  <th className="pb-2 font-medium"> </th>
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row) => (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-ink">{row.name}</p>
                      <p className="text-muted">{row.code} · {row.location}</p>
                    </td>
                    <td className="py-3 pr-3">{row.customer}</td>
                    <td className="py-3 pr-3">{row.owner}</td>
                    <td className="py-3 pr-3">
                      {row.stage}
                      {row.otherStageNote ? <span className="mt-1 block text-[12px] text-muted">{row.otherStageNote}</span> : null}
                    </td>
                    <td className="py-3 pr-3">
                      <p>{row.milestone}</p>
                      <p className={row.overdue ? "text-danger" : "text-muted"}>{row.dueLabel}</p>
                    </td>
                    <td className="py-3 text-right">
                      <TextLink href={row.href}>Chi tiết</TextLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {section.rows.map((row) => (
              <article key={row.id} className="rounded-[14px] border border-line p-3">
                <p className="font-semibold">{row.name}</p>
                <p className="text-[12px] text-muted">{row.code} · {row.location}</p>
                <p className="mt-2 text-[13px]">{row.customer} · {row.owner}</p>
                <p className="mt-1 text-[13px]">{row.stage}</p>
                <p className={cn("text-[13px]", row.overdue && "text-danger")}>{row.milestone} · {row.dueLabel}</p>
                <TextLink href={row.href}>Chi tiết</TextLink>
              </article>
            ))}
          </div>
        </>
      ) : section.status === "error" ? null : (
        <EmptyState message={section.message} href={section.href} actionLabel="Thêm công trình" />
      )}
    </Panel>
  );
}

function TaskPanel({ section }: { section: DashboardView["tasks"] }) {
  return (
    <Panel
      title="Việc cần xử lý"
      description={section.status === "error" ? section.message : "Mỗi báo giá chỉ hiện một lần dù có nhiều dấu hiệu."}
      status={section.status}
    >
      {section.status === "ok" ? (
        <ul className="space-y-3">
          {section.rows.map((row) => (
            <li key={row.id}>
              <Link href={row.href} className={cn("block rounded-[14px] border border-line p-3 hover:bg-soft", focusRing)}>
                <span className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">{row.title}</span>
                  <Badge tone={row.tone}>{row.badge}</Badge>
                </span>
                <span className="mt-1 block text-[13px] text-muted">{row.record}</span>
                <span className="mt-1 block text-[12px] text-slate-600">{row.dueLabel} · {row.owner}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : section.status === "error" ? null : (
        <EmptyState message={section.message} />
      )}
    </Panel>
  );
}

function QuotePanel({ section }: { section: DashboardView["quotations"] }) {
  return (
    <Panel
      title="Báo giá gần đây"
      description={section.status === "ok" ? section.message : section.message ?? "Phiên bản hiện hành."}
      action={section.status === "ok" && section.href ? <TextLink href={section.href}>Xem tất cả</TextLink> : null}
      status={section.status}
    >
      {section.status === "ok" ? (
        <div className="space-y-3">
          {section.rows.map((row) => (
            <article key={row.id} className="rounded-[14px] border border-line p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{row.code}</p>
                  <p className="text-[12px] text-muted">{row.versionLabel} · {row.project}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums">{row.valueLabel}</p>
              </div>
              <p className="mt-2 text-[13px] text-muted">{row.customer} · {row.owner}</p>
              <p className="mt-1 text-[12px] text-muted">Lập {row.createdLabel} · Hiệu lực {row.validLabel}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone={row.internalTone}>{row.internalLabel}</Badge>
                <Badge tone={row.customerTone}>{row.customerLabel}</Badge>
              </div>
              <TextLink href={row.href}>Xem</TextLink>
            </article>
          ))}
        </div>
      ) : section.status === "error" ? null : (
        <EmptyState message={section.message} href={section.href} actionLabel="Tạo báo giá" />
      )}
    </Panel>
  );
}

function SchedulePanel({ section }: { section: DashboardView["schedule"] }) {
  return (
    <Panel title="Lịch khảo sát sắp tới" description={section.status === "ok" ? "Lịch khảo sát. Giao hàng và lắp đặt chưa triển khai." : section.message} status={section.status}>
      {section.status === "ok" ? (
        <ul className="space-y-3">
          {section.rows.map((row) => (
            <li key={row.id} className="rounded-[14px] border border-line p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">{row.title}</p>
                <Badge tone={row.tone}>{row.statusLabel}</Badge>
              </div>
              <p className="mt-1 text-[13px] tabular-nums text-ink">{row.whenLabel}</p>
              <p className="text-[13px] text-muted">{row.project}</p>
              <p className="text-[12px] text-muted">{row.location} · {row.owner}</p>
              <TextLink href={row.href}>Mở công trình</TextLink>
            </li>
          ))}
        </ul>
      ) : section.status === "error" ? null : (
        <EmptyState message={section.message} />
      )}
    </Panel>
  );
}

function EmptyState({ message, href, actionLabel }: { message: string | null; href?: string | null; actionLabel?: string }) {
  return (
    <div>
      <p className="text-sm text-muted">{message}</p>
      {href && actionLabel ? <TextLink href={href}>{actionLabel}</TextLink> : null}
    </div>
  );
}

function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn("inline-flex min-h-11 items-center text-[13px] font-semibold text-primary", focusRing)}>
      {children}
    </Link>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="h-44 animate-pulse rounded-[18px] bg-[#d7e3f8]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-[18px] bg-white" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-[18px] bg-white" />
    </div>
  );
}
