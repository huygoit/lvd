import { Suspense } from "react";
import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { hasCapability } from "@/shared/auth/types";
import { requireUser } from "@/shared/auth/session";
import { rethrowPage } from "@/shared/page";
import { FieldHome, type SupplyRequestCard } from "@/modules/field/field-home";
import type { ProgressReportCard } from "@/modules/field/field-progress";
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
  const quyen = {
    xacNhan: hasCapability(user, "receive.site"),
    yeuCau: hasCapability(user, "field.supply"),
    tienDo: hasCapability(user, "field.progress"),
  };
  if (!quyen.xacNhan && !quyen.yeuCau && !quyen.tienDo) forbidden();
  const query = await searchParams;
  const raw = one(query.viec);
  const duoc = new Set<string>(["home"]);
  if (quyen.xacNhan) duoc.add("xac-nhan");
  if (quyen.yeuCau) {
    duoc.add("yeu-cau");
    duoc.add("tao");
  }
  if (quyen.tienDo) duoc.add("tien-do");
  const initialView = views.includes(raw as (typeof views)[number]) && duoc.has(raw) ? (raw as (typeof views)[number]) : "home";
  let projects: Awaited<ReturnType<typeof listFieldProjects>> = [];
  let requests: SupplyRequestCard[] = [];
  let progressReports: ProgressReportCard[] = [];
  try {
    if (quyen.yeuCau || quyen.tienDo) projects = await listFieldProjects(user);
    if (quyen.yeuCau) requests = await listSupplyRequests(user);
    if (quyen.tienDo) progressReports = await listProgressReports(user);
  } catch (error) {
    rethrowPage(error);
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
      quyen={quyen}
    />
  );
}
