import { Suspense } from "react";
import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { hasCapability } from "@/shared/auth/types";
import { requireUser } from "@/shared/auth/session";
import { rethrowPage } from "@/shared/page";
import { customerOptions } from "@/modules/customers/service";
import { QuoteCreateForm } from "@/modules/quotations/create-form";
import { listProjects } from "@/modules/projects/service";

export const metadata: Metadata = { title: "Lập báo giá" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={null}>
      <Body searchParams={searchParams} />
    </Suspense>
  );
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function Body({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  if (!hasCapability(user, "quotations.create")) forbidden();
  const query = await searchParams;
  let customers: Awaited<ReturnType<typeof customerOptions>> = [];
  let projects: Awaited<ReturnType<typeof listProjects>> = [];
  try {
    customers = await customerOptions(user);
    projects = await listProjects(user, {});
  } catch (error) {
    rethrowPage(error);
  }
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Lập báo giá</h1>
      <p className="text-sm text-muted">Chọn khách. Nếu chưa có công trình, nhập tên là đủ.</p>
      <QuoteCreateForm
        customers={customers}
        projects={projects.map((item) => ({ id: item.id, customerId: item.customerId, code: item.code, name: item.name }))}
        customerId={one(query.khach)}
        projectId={one(query["cong-trinh"])}
      />
    </div>
  );
}
