import { Suspense } from "react";
import type { Metadata } from "next";
import { hasCapability } from "@/shared/auth/types";
import { requireUser } from "@/shared/auth/session";
import { rethrowPage } from "@/shared/page";
import { isPartnerRole } from "@/modules/partners/roles";
import { PartnerBoard } from "@/modules/partners/partner-board";
import { listPartners } from "@/modules/partners/service";
import { listActiveJobTitles } from "@/modules/settings/job-titles";

export const metadata: Metadata = { title: "Đối tác" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải đối tác...</p>}>
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
  const role = one(query["vai-tro"]);
  const status = one(query["trang-thai"]) || "dang_dung";
  const page = Number(one(query.trang) || 1);
  const activeRole = isPartnerRole(role) ? role : "";
  const mo = one(query.mo);
  const hoSo = one(query["ho-so"]);
  const canCreate = hasCapability(user, "partners.create");
  const canUpdate = hasCapability(user, "partners.update");
  const initialMode = mo === "them" && canCreate ? "them" : (mo === "sua" && canUpdate && hoSo) || (mo === "xem" && hoSo) ? mo : null;
  let data: Awaited<ReturnType<typeof listPartners>> | null = null;
  let titles: string[] = [];
  try {
    data = await listPartners(user, { q, role: activeRole, status, page });
    titles = await listActiveJobTitles();
  } catch (error) {
    rethrowPage(error);
  }
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const countLabel = status === "luu_tru" ? `${data.total} hồ sơ đã lưu trữ` : `${data.total} hồ sơ đang dùng`;
  return (
    <PartnerBoard
      countLabel={countLabel}
      q={q}
      status={status}
      activeRole={activeRole}
      page={data.page}
      pages={pages}
      rows={data.rows}
      canCreate={canCreate}
      canUpdate={canUpdate}
      canDelete={hasCapability(user, "partners.archive")}
      initialMode={initialMode === "them" || initialMode === "sua" || initialMode === "xem" ? initialMode : null}
      initialId={hoSo}
      titles={titles}
    />
  );
}
