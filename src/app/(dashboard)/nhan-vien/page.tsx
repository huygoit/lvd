import { Suspense } from "react";
import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { hasCapability } from "@/shared/auth/types";
import { requireUser } from "@/shared/auth/session";
import { rethrowPage } from "@/shared/page";
import { EmployeeBoard } from "@/modules/employees/employee-board";
import { listEmployees } from "@/modules/employees/service";
import { listDepartments } from "@/modules/settings/departments";
import { listPositions } from "@/modules/settings/positions";

export const metadata: Metadata = { title: "Nhân viên" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải nhân viên...</p>}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  if (!hasCapability(user, "settings.manage")) forbidden();
  const query = await searchParams;
  const q = one(query.q);
  const departmentId = one(query.phong);
  const positionId = one(query["chuc-vu"]);
  const status = one(query["trang-thai"]) || "dang_lam";
  const mo = one(query.mo);
  const hoSo = one(query["ho-so"]);
  const initialMode = mo === "them" ? "them" : (mo === "sua" || mo === "xem") && hoSo ? mo : null;
  let rows: Awaited<ReturnType<typeof listEmployees>> = [];
  let departments: Awaited<ReturnType<typeof listDepartments>> = [];
  let positions: Awaited<ReturnType<typeof listPositions>> = [];
  try {
    [rows, departments, positions] = await Promise.all([
      listEmployees(user, { q, departmentId, positionId, status }),
      listDepartments(),
      listPositions(),
    ]);
  } catch (error) {
    rethrowPage(error);
  }
  const countLabel = status === "ngung" ? `${rows.length} người ngừng làm` : `${rows.length} người đang làm`;
  return (
    <EmployeeBoard
      rows={rows}
      countLabel={countLabel}
      q={q}
      departmentId={departmentId}
      positionId={positionId}
      status={status}
      departments={departments}
      positions={positions}
      initialMode={initialMode}
      initialId={hoSo}
    />
  );
}
