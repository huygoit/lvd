import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/shared/auth/session";
import { prisma } from "@/shared/db";
import { rethrowPage } from "@/shared/page";
import { customerOptions } from "@/modules/customers/service";
import { ContractCreateForm } from "@/modules/contracts/create-form";
import { listProjects } from "@/modules/projects/service";
import { getQuotation } from "@/modules/quotations/service";

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
  const versionId = one(query.phien);
  let projects: Awaited<ReturnType<typeof listProjects>> = [];
  let customers: Awaited<ReturnType<typeof customerOptions>> = [];
  let quoteSeed: {
    code: string;
    versionNumber: number;
    customerName: string;
    projectName: string;
    title: string;
  } | null = null;
  try {
    projects = await listProjects(user, {});
    customers = await customerOptions(user);
    if (versionId) {
      const version = await prisma.quotationVersion.findUnique({
        where: { id: versionId },
        select: {
          number: true,
          title: true,
          projectName: true,
          customerName: true,
          quotationId: true,
          quotation: { select: { code: true } },
        },
      });
      if (version) {
        await getQuotation(user, version.quotationId);
        quoteSeed = {
          code: version.quotation.code,
          versionNumber: version.number,
          customerName: version.customerName,
          projectName: version.projectName,
          title: version.title,
        };
      }
    }
  } catch (error) {
    rethrowPage(error);
  }
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/hop-dong" className="text-sm font-semibold text-primary">
        Hợp đồng
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {versionId ? "Tạo hợp đồng từ báo giá" : "Lập hợp đồng"}
        </h1>
        <p className="mt-1 text-sm text-muted">Chỉ các trường cần thiết: số HĐ (tự cấp), tên, công trình, khách, báo giá, ngày ký.</p>
      </div>
      <ContractCreateForm
        projects={projects.map((item) => ({ id: item.id, code: item.code, name: item.name, customerId: item.customerId }))}
        customers={customers}
        projectId={one(query["cong-trinh"])}
        versionId={versionId}
        quoteSeed={quoteSeed}
      />
    </div>
  );
}
