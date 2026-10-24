import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/shared/auth/session";
import { rethrowPage } from "@/shared/page";
import { customerOptions } from "@/modules/customers/service";
import { ContractCreateForm } from "@/modules/contracts/create-form";
import { listProjects } from "@/modules/projects/service";

export const metadata: Metadata = { title: "Lập hợp đồng" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải...</p>}>
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
  let projects: Awaited<ReturnType<typeof listProjects>> = [];
  let customers: Awaited<ReturnType<typeof customerOptions>> = [];
  try {
    projects = await listProjects(user, {});
    customers = await customerOptions(user);
  } catch (error) {
    rethrowPage(error);
  }
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/hop-dong" className="text-sm font-semibold text-primary">Hợp đồng</Link>
      <h1 className="text-2xl font-semibold">Lập hợp đồng</h1>
      <ContractCreateForm
        projects={projects.map((item) => ({ id: item.id, code: item.code, name: item.name, customerId: item.customerId }))}
        customers={customers}
        projectId={one(query["cong-trinh"])}
        versionId={one(query.phien)}
      />
    </div>
  );
}
