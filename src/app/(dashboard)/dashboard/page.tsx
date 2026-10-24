import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/shared/auth/session";
import { toSearchParams } from "@/shared/lib/search-params";
import { DashboardSkeleton, HomeView } from "@/modules/dashboard/components/home-view";
import { loadDashboard } from "@/modules/dashboard/services/load";

export const metadata: Metadata = { title: "Tổng quan" };

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const view = await loadDashboard(user, toSearchParams(await searchParams));
  return <HomeView view={view} />;
}
