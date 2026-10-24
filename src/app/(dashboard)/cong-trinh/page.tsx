import { Suspense } from "react";
import type { Metadata } from "next";
import { hasAnyCapability, hasCapability } from "@/shared/auth/types";
import { requireUser } from "@/shared/auth/session";
import { rethrowPage } from "@/shared/page";
import { customerOptions, listStaff } from "@/modules/customers/service";
import { ProjectBoard } from "@/modules/projects/project-board";
import { listProjects } from "@/modules/projects/service";

export const metadata: Metadata = { title: "Công trình" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải công trình...</p>}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const query = await searchParams;
  const q = one(query.q);
  const stage = one(query["giai-doan"]);
  const mo = one(query.mo);
  const mode = mo === "xem" || mo === "them" || mo === "sua" ? mo : null;
  const hoSo = mode === "xem" || mode === "sua" ? one(query["ho-so"]) : "";
  let rows: Awaited<ReturnType<typeof listProjects>> = [];
  try {
    rows = await listProjects(user, { q, stage });
  } catch (error) {
    rethrowPage(error);
  }
  const canCreate = hasCapability(user, "projects.create");
  const canEdit = hasAnyCapability(user, ["projects.update", "projects.create"]);
  const staff = await listStaff();
  const names = new Map(staff.map((item) => [item.id, item.name]));
  let customers: Awaited<ReturnType<typeof customerOptions>> = [];
  if (canCreate || canEdit) {
    try {
      customers = await customerOptions(user);
    } catch (error) {
      rethrowPage(error);
    }
  }
  return (
    <ProjectBoard
      q={q}
      stage={stage}
      canCreate={canCreate}
      canEdit={canEdit}
      canQuote={hasCapability(user, "quotations.create")}
      staff={staff.map((item) => ({ id: item.id, name: item.name }))}
      customers={customers}
      defaultOwnerId={user.id}
      initialMode={mode}
      initialId={hoSo}
      initialCustomerId={mode === "them" ? one(query.khach) : ""}
      rows={rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        customerId: row.customerId,
        customerName: row.customer.name,
        ownerId: row.ownerId,
        ownerName: names.get(row.ownerId) ?? "",
        stage: row.stage,
        location: row.location,
        venture: row.venture,
        bidPackage: row.bidPackage,
        startedOn: row.startedOn,
        endedOn: row.endedOn,
        vatPercent: row.vatPercent,
      }))}
    />
  );
}
