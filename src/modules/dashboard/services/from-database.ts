import { prisma } from "@/shared/db";
import { todayYmd } from "@/shared/lib/dates";
import { projectStageLabel } from "@/modules/customers/labels";
import type { CustomerStatus, Dataset, InternalStatus, ProjectStage } from "@/modules/dashboard/types";

function mapStage(stage: string): ProjectStage {
  if (stage === "dang_bao_gia") return "bao_gia";
  if (stage === "da_chot") return "da_chot";
  return "khao_sat";
}

function mapInternal(status: string): InternalStatus {
  if (status === "cho_duyet" || status === "da_duyet" || status === "tu_choi") return status;
  return "nhap";
}

function mapCustomer(status: string): CustomerStatus {
  if (status === "dang_thuong_luong") return "dang_thuong_luong";
  if (status === "chap_thuan") return "da_chap_thuan";
  if (status === "tu_choi") return "tu_choi";
  if (status === "da_thay_the") return "het_hieu_luc";
  return "chua_phan_hoi";
}

export async function datasetFromDatabase(now: Date): Promise<Dataset> {
  void now;
  const [customers, projects, quotations, staff] = await Promise.all([
    prisma.customer.findMany(),
    prisma.project.findMany(),
    prisma.quotation.findMany({
      include: { versions: { orderBy: { number: "desc" }, include: { items: true } } },
    }),
    prisma.staff.findMany({ where: { active: true } }),
  ]);
  return {
    linked: true,
    people: staff.map((item) => ({ id: item.id, name: item.name })),
    customers: customers.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      ownerId: item.ownerId,
      createdOn: todayYmd(item.createdAt),
    })),
    projects: projects
      .filter((item) => item.stage !== "khong_trien_khai")
      .map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        location: item.location,
        customerId: item.customerId,
        ownerId: item.ownerId,
        stage: mapStage(item.stage),
        otherStageCount: 0,
        nextMilestone: projectStageLabel[item.stage as keyof typeof projectStageLabel] ?? item.stage,
        nextDue: null,
      })),
    quotations: quotations.flatMap((quote) =>
      quote.versions.map((version, index) => ({
        id: version.id,
        dossierId: quote.id,
        code: quote.code,
        version: version.number,
        isCurrent: index === 0,
        projectId: quote.projectId,
        customerId: quote.customerId,
        ownerId: version.ownerId,
        valueBeforeTaxVnd: version.items.reduce((sum, item) => sum + item.pretax, 0),
        createdOn: version.quoteDate,
        validUntil: version.validUntil,
        acceptedOn: version.customerStatus === "chap_thuan" ? version.acceptedOn : null,
        internalStatus: mapInternal(version.internalStatus),
        customerStatus: mapCustomer(version.customerStatus),
      })),
    ),
    appointments: [],
  };
}
