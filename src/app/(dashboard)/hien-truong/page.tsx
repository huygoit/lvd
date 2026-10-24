import { Suspense } from "react";
import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { hasCapability } from "@/shared/auth/types";
import { requireUser } from "@/shared/auth/session";
import { rethrowPage } from "@/shared/page";
import { FieldHome, type SupplyRequestCard } from "@/modules/field/field-home";
import type { ProgressReportCard } from "@/modules/field/field-progress";
import { canOpenReceive } from "@/modules/deliveries/service";
import { listFieldProjects, listProgressReports, listSupplyRequests } from "@/modules/field/service";

export const metadata: Metadata = { title: "Hiện trường" };

const views = ["home", "yeu-cau", "tao", "xac-nhan", "tien-do"] as const;

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải hiện trường...</p>}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const canField = hasCapability(user, "installation.view");
  if (!canField && !(await canOpenReceive(user))) forbidden();
  const query = await searchParams;
  const raw = one(query.viec);
  const initialView = !canField ? "xac-nhan" : views.includes(raw as (typeof views)[number]) ? (raw as (typeof views)[number]) : "home";
  let projects: Awaited<ReturnType<typeof listFieldProjects>> = [];
  let requests: SupplyRequestCard[] = [];
  let progressReports: ProgressReportCard[] = [];
  if (canField) {
    try {
      [projects, requests, progressReports] = await Promise.all([
        listFieldProjects(user),
        listSupplyRequests(user),
        listProgressReports(user),
      ]);
    } catch (error) {
      rethrowPage(error);
    }
  }
  return (
    <FieldHome
      givenName={user.givenName}
      actorId={user.id}
      projects={projects}
      requests={requests}
      progressReports={progressReports}
      initialView={initialView}
      initialSlip={one(query.phieu)}
      fullHome={canField}
    />
  );
}
