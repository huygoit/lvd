import { Suspense } from "react";
import type { Metadata } from "next";
import { hasAnyCapability, hasCapability } from "@/shared/auth/types";
import { requireUser } from "@/shared/auth/session";
import { rethrowPage } from "@/shared/page";
import { CustomerBoard } from "@/modules/customers/customer-board";
import { listCustomers } from "@/modules/customers/service";

export const metadata: Metadata = { title: "Khách hàng" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải khách hàng...</p>}>
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
  const loai = one(query.loai);
  const ownerId = one(query["phu-trach"]);
  const status = one(query["trang-thai"]) || "dang_dung";
  const page = Number(one(query.trang) || 1);
  const mo = one(query.mo);
  const hoSo = one(query["ho-so"]);
  const canCreate = hasCapability(user, "customers.create");
  const canUpdate = hasAnyCapability(user, ["customers.update", "customers.create"]);
  const initialMode = mo === "them" && canCreate ? "them" : (mo === "sua" && canUpdate && hoSo) || (mo === "xem" && hoSo) ? mo : null;
  let data: Awaited<ReturnType<typeof listCustomers>> | null = null;
  try {
    data = await listCustomers(user, { q, type: loai, ownerId, status, page });
  } catch (error) {
    rethrowPage(error);
  }
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const countLabel = status === "luu_tru" ? `${data.total} hồ sơ đã lưu trữ` : `${data.total} hồ sơ đang dùng`;
  return (
    <CustomerBoard
      countLabel={countLabel}
      q={q}
      type={loai}
      ownerId={ownerId}
      status={status}
      page={data.page}
      pages={pages}
      rows={data.rows}
      currentUserId={user.id}
      canCreate={canCreate}
      canUpdate={canUpdate}
      canDelete={hasAnyCapability(user, ["customers.archive", "customers.update"])}
      canQuote={hasCapability(user, "quotations.create")}
      canProject={hasCapability(user, "projects.create")}
      initialMode={initialMode === "them" || initialMode === "sua" || initialMode === "xem" ? initialMode : null}
      initialId={hoSo}
    />
  );
}
