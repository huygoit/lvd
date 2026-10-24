import type { User } from "@/shared/auth/types";
import { routes } from "@/shared/config/routes";
import { collectScope, parseFilters } from "@/modules/dashboard/services/dashboard";
import type { Dataset, SearchGroup } from "@/modules/dashboard/types";

function includesText(value: string, query: string) {
  return value.toLocaleLowerCase("vi-VN").includes(query.toLocaleLowerCase("vi-VN"));
}

export function searchRecords(user: User, dataset: Dataset, query: string, now: Date): SearchGroup[] {
  const needle = query.trim();
  if (needle.length < 2) return [];
  const scope = collectScope(user, dataset, parseFilters(new URLSearchParams(), now));
  const groups: SearchGroup[] = [];
  if (scope.customers) {
    const items = scope.customers
      .filter((row) => includesText(row.code, needle) || includesText(row.name, needle))
      .slice(0, 5)
      .map((row) => ({
        href: dataset.linked ? `/khach-hang/${row.id}` : `${routes.customers}?ma=${row.code}`,
        title: row.name,
        meta: row.code,
      }));
    if (items.length > 0) groups.push({ id: "khach-hang", label: "Khách hàng", items });
  }
  if (scope.projects) {
    const items = scope.projects
      .filter((row) => includesText(row.code, needle) || includesText(row.name, needle) || includesText(row.location, needle))
      .slice(0, 5)
      .map((row) => ({
        href: dataset.linked ? `/cong-trinh/${row.id}` : `${routes.projects}?ma=${row.code}`,
        title: row.name,
        meta: `${row.code} · ${row.location}`,
      }));
    if (items.length > 0) groups.push({ id: "cong-trinh", label: "Công trình", items });
  }
  if (scope.quotes) {
    const items = scope.quotes
      .filter((row) => row.isCurrent && includesText(row.code, needle))
      .slice(0, 5)
      .map((row) => ({
        href: dataset.linked && row.dossierId ? `/bao-gia/${row.dossierId}` : `${routes.quotations}?ma=${row.code}`,
        title: row.code,
        meta: `Phiên bản ${row.version}`,
      }));
    if (items.length > 0) groups.push({ id: "bao-gia", label: "Báo giá", items });
  }
  return groups;
}
