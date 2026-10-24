import type { User } from "@/shared/auth/types";
import { getDataSource } from "@/shared/config/env";
import { buildDemoDataset, emptyDataset } from "@/modules/dashboard/mocks/demo-data";
import { buildDashboardView, parseFilters } from "@/modules/dashboard/services/dashboard";
import { datasetFromDatabase } from "@/modules/dashboard/services/from-database";
import type { Attention, Fault } from "@/modules/dashboard/types";
import { todayYmd } from "@/shared/lib/dates";

export function readFault(params: URLSearchParams): Fault | null {
  if (process.env.NODE_ENV === "production") return null;
  const value = params.get("loi");
  if (value === "bieu-do" || value === "cong-trinh" || value === "viec") return value;
  return null;
}

export async function loadRuntime(now = new Date()) {
  const mode = getDataSource();
  if (mode === "demo") return { mode, dataset: buildDemoDataset(todayYmd(now)), now };
  if (mode === "live") return { mode, dataset: await datasetFromDatabase(now), now };
  return { mode: "none" as const, dataset: emptyDataset(), now };
}

export async function loadDashboard(user: User, params: URLSearchParams, now = new Date()) {
  const runtime = await loadRuntime(now);
  return buildDashboardView({
    mode: runtime.mode,
    user,
    dataset: runtime.dataset,
    now,
    filters: parseFilters(params, now),
    fault: readFault(params),
  });
}

export async function loadAttention(user: User, now = new Date()): Promise<Attention> {
  const view = await loadDashboard(user, new URLSearchParams(), now);
  if (view.source === "none") return { count: 0, unavailable: true, items: [] };
  return {
    count: view.tasks.total,
    unavailable: false,
    items: view.tasks.rows.slice(0, 6).map((task) => ({
      id: task.id,
      title: task.title,
      href: task.href,
      badge: task.badge,
    })),
  };
}
