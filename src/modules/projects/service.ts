import type { Prisma } from "@prisma/client";
import type { User } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { writeAudit } from "@/modules/system/audit";
import { assertAny, assertOwn, listOwner } from "@/modules/system/access";
import { nextCode } from "@/modules/system/codes";
import { projectStageLabel } from "@/modules/customers/labels";
import { xoaTep } from "@/modules/projects/document-store";

const stages = Object.keys(projectStageLabel);

function cleanDate(value: string | undefined, label: string) {
  const text = (value ?? "").trim();
  if (!text) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new AppError(`${label} không hợp lệ.`, 400);
  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new AppError(`${label} không hợp lệ.`, 400);
  }
  return text;
}

function cleanVat(value: ProjectInput["vatPercent"]) {
  if (value === null || value === undefined) return null;
  const digits = String(value).trim();
  if (!digits) return null;
  if (!/^[1-9]\d*$/.test(digits)) throw new AppError("Thuế GTGT chỉ nhận số nguyên dương.", 400);
  const rate = Number(digits);
  if (!Number.isSafeInteger(rate) || rate > 2147483647) throw new AppError("Thuế GTGT quá lớn.", 400);
  return rate;
}

function projectDates(input: ProjectInput) {
  const startedOn = cleanDate(input.startedOn, "Ngày bắt đầu");
  const endedOn = cleanDate(input.endedOn, "Ngày kết thúc");
  if (startedOn && endedOn && endedOn < startedOn) {
    throw new AppError("Ngày kết thúc phải từ ngày bắt đầu trở đi.", 400);
  }
  return { startedOn, endedOn };
}

export type ProjectInput = {
  name: string;
  customerId: string;
  location?: string;
  venture?: string;
  bidPackage?: string;
  startedOn?: string;
  endedOn?: string;
  vatPercent?: string | number | null;
  ownerId: string;
  note?: string;
  stage?: string;
  revision?: number;
};

async function visibleCustomer(user: User, customerId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new AppError("Không tìm thấy khách hàng.", 404);
  assertOwn(user, "customers.view", "customers.view.assigned", customer.ownerId);
  return customer;
}

export async function listProjects(user: User, filters: { q?: string; customerId?: string; stage?: string }) {
  const owner = listOwner(user, "projects.view", "projects.view.assigned");
  const q = filters.q?.trim();
  const where: Prisma.ProjectWhereInput = {
    ...(owner ? { ownerId: owner } : {}),
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
    ...(filters.stage ? { stage: filters.stage } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q } },
            { name: { contains: q } },
            { location: { contains: q } },
            { venture: { contains: q } },
            { bidPackage: { contains: q } },
            { contracts: { some: { lines: { some: { OR: [{ name: { contains: q } }, { code: { contains: q } }] } } } } },
          ],
        }
      : {}),
  };
  return prisma.project.findMany({
    where,
    include: { customer: { select: { id: true, name: true, code: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getProject(user: User, id: string) {
  const row = await prisma.project.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, code: true, name: true } },
      quotations: { include: { versions: { orderBy: { number: "desc" }, take: 1 } } },
      contracts: { select: { id: true, code: true, name: true, kind: true, internalStatus: true, signStatus: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!row) throw new AppError("Không tìm thấy công trình.", 404);
  assertOwn(user, "projects.view", "projects.view.assigned", row.ownerId);
  return row;
}

export async function createProject(user: User, input: ProjectInput, now = new Date()) {
  assertAny(user, ["projects.create"]);
  const name = input.name.trim();
  if (!name) throw new AppError("Cần nhập tên công trình.", 400);
  const customer = await visibleCustomer(user, input.customerId);
  if (customer.status !== "dang_dung") throw new AppError("Khách hàng đã lưu trữ nên không tạo công trình mới.", 400);
  const staff = await prisma.staff.findFirst({ where: { id: input.ownerId, active: true } });
  if (!staff) throw new AppError("Người phụ trách không còn hoạt động.", 400);
  const dates = projectDates(input);
  const vatPercent = cleanVat(input.vatPercent);
  return prisma.$transaction(async (tx) => {
    const code = await nextCode(tx, "CT", now);
    const project = await tx.project.create({
      data: {
        code,
        name,
        customerId: customer.id,
        location: (input.location ?? "").trim(),
        venture: (input.venture ?? "").trim(),
        bidPackage: (input.bidPackage ?? "").trim(),
        startedOn: dates.startedOn,
        endedOn: dates.endedOn,
        vatPercent,
        ownerId: input.ownerId,
        note: (input.note ?? "").trim(),
        stage: "dang_khao_sat",
      },
    });
    await writeAudit(tx, user.id, "tao", "cong_trinh", project.id, `Tạo công trình ${code}`);
    return project;
  });
}

export async function updateProject(user: User, id: string, input: ProjectInput) {
  assertAny(user, ["projects.update", "projects.create"]);
  const current = await prisma.project.findUnique({ where: { id } });
  if (!current) throw new AppError("Không tìm thấy công trình.", 404);
  assertOwn(user, "projects.view", "projects.view.assigned", current.ownerId);
  if (current.revision !== input.revision) throw new AppError("Công trình vừa được cập nhật. Hãy tải lại.", 409);
  if (input.stage && !stages.includes(input.stage)) throw new AppError("Trạng thái công trình không hợp lệ.", 400);
  const name = input.name.trim();
  if (!name) throw new AppError("Cần nhập tên công trình.", 400);
  const dates = projectDates(input);
  const vatPercent = cleanVat(input.vatPercent);
  const updated = await prisma.project.updateMany({
    where: { id, revision: current.revision },
    data: {
      name,
      location: (input.location ?? "").trim(),
      venture: (input.venture ?? "").trim(),
      bidPackage: (input.bidPackage ?? "").trim(),
      startedOn: dates.startedOn,
      endedOn: dates.endedOn,
      vatPercent,
      ownerId: input.ownerId,
      note: (input.note ?? "").trim(),
      stage: input.stage || current.stage,
      revision: { increment: 1 },
    },
  });
  if (updated.count === 0) throw new AppError("Công trình vừa được cập nhật. Hãy tải lại.", 409);
  await prisma.auditLog.create({
    data: { actorId: user.id, action: "sua", entityType: "cong_trinh", entityId: id, summary: `Cập nhật ${current.code}` },
  });
  return prisma.project.findUniqueOrThrow({ where: { id } });
}

export async function deleteProject(user: User, id: string) {
  assertAny(user, ["projects.update", "projects.create"]);
  const current = await prisma.project.findUnique({
    where: { id },
    include: { _count: { select: { items: true, orders: true, quotations: true, contracts: true, stockSlips: true } } },
  });
  if (!current) throw new AppError("Không tìm thấy công trình.", 404);
  assertOwn(user, "projects.view", "projects.view.assigned", current.ownerId);
  const blockers = [
    current._count.items ? "hạng mục" : "",
    current._count.orders ? "đơn hàng" : "",
    current._count.quotations ? "báo giá" : "",
    current._count.contracts ? "hợp đồng" : "",
    current._count.stockSlips ? "phiếu kho" : "",
  ].filter(Boolean);
  if (blockers.length > 0) {
    throw new AppError(`Công trình đang có ${blockers.join(", ")} nên không xóa được.`, 400);
  }
  const taiLieu = await prisma.projectDocument.findMany({
    where: { projectId: id },
    select: { storage: true, storageKey: true },
  });
  for (const tep of taiLieu) {
    await xoaTep(tep.storage === "s3" ? "s3" : "may_chu", tep.storageKey);
  }
  await prisma.$transaction(async (tx) => {
    await tx.project.delete({ where: { id } });
    await writeAudit(tx, user.id, "xoa", "cong_trinh", id, `Xóa công trình ${current.code}`);
  });
}
