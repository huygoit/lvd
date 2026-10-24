import type { User } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { writeAudit } from "@/modules/system/audit";
import { assertAny, assertOwn } from "@/modules/system/access";
import {
  hangMucAmount,
  parseItemUnit,
  parseQuantityMilli,
  parseSortOrder,
  parseUnitPrice,
} from "@/modules/projects/item-fields";

export type ProjectItemInput = {
  sortOrder?: unknown;
  name?: unknown;
  spec?: unknown;
  unit?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
  ownerId?: unknown;
  note?: unknown;
};

async function visibleProject(user: User, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError("Không tìm thấy công trình.", 404);
  assertOwn(user, "projects.view", "projects.view.assigned", project.ownerId);
  return project;
}

function present(row: {
  id: string;
  sortOrder: number;
  name: string;
  spec: string;
  unit: string;
  quantityMilli: number;
  unitPrice: number;
  ownerId: string;
  note: string;
}, ownerName: string) {
  return {
    id: row.id,
    sortOrder: row.sortOrder,
    name: row.name,
    spec: row.spec,
    unit: row.unit,
    quantityMilli: row.quantityMilli,
    unitPrice: row.unitPrice,
    amount: hangMucAmount(row.unitPrice, row.quantityMilli),
    ownerId: row.ownerId,
    ownerName,
    note: row.note,
  };
}

async function readInput(input: ProjectItemInput) {
  const name = String(input.name ?? "").trim();
  if (!name) throw new AppError("Cần nhập nội dung hạng mục.", 400);
  const ownerId = String(input.ownerId ?? "").trim();
  const staff = await prisma.staff.findFirst({ where: { id: ownerId, active: true } });
  if (!staff) throw new AppError("Chọn người phụ trách.", 400);
  return {
    sortOrder: parseSortOrder(input.sortOrder),
    name,
    spec: String(input.spec ?? "").trim(),
    unit: parseItemUnit(input.unit),
    quantityMilli: parseQuantityMilli(input.quantity),
    unitPrice: parseUnitPrice(input.unitPrice),
    ownerId,
    ownerName: staff.name,
    note: String(input.note ?? "").trim(),
  };
}

async function assertSortFree(projectId: string, sortOrder: number, exceptId?: string) {
  const dup = await prisma.projectItem.findFirst({
    where: { projectId, sortOrder, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true },
  });
  if (dup) throw new AppError("Số thứ tự đã có trên công trình này.", 400);
}

export async function listProjectItems(user: User, projectId: string) {
  await visibleProject(user, projectId);
  const rows = await prisma.projectItem.findMany({ where: { projectId }, orderBy: { sortOrder: "asc" } });
  const staff = await prisma.staff.findMany({ select: { id: true, name: true } });
  const names = new Map(staff.map((item) => [item.id, item.name]));
  return rows.map((row) => present(row, names.get(row.ownerId) ?? ""));
}

export async function createProjectItem(user: User, projectId: string, input: ProjectItemInput) {
  assertAny(user, ["projects.update", "projects.create"]);
  const project = await visibleProject(user, projectId);
  const data = await readInput(input);
  await assertSortFree(project.id, data.sortOrder);
  return prisma.$transaction(async (tx) => {
    const row = await tx.projectItem.create({
      data: {
        projectId: project.id,
        sortOrder: data.sortOrder,
        name: data.name,
        spec: data.spec,
        unit: data.unit,
        quantityMilli: data.quantityMilli,
        unitPrice: data.unitPrice,
        ownerId: data.ownerId,
        note: data.note,
      },
    });
    await writeAudit(tx, user.id, "tao", "hang_muc", row.id, `Thêm hạng mục ${data.sortOrder} của ${project.code}`);
    return present(row, data.ownerName);
  });
}

export async function updateProjectItem(user: User, projectId: string, itemId: string, input: ProjectItemInput) {
  assertAny(user, ["projects.update", "projects.create"]);
  const project = await visibleProject(user, projectId);
  const current = await prisma.projectItem.findFirst({ where: { id: itemId, projectId: project.id } });
  if (!current) throw new AppError("Không tìm thấy hạng mục.", 404);
  const data = await readInput(input);
  await assertSortFree(project.id, data.sortOrder, current.id);
  const row = await prisma.projectItem.update({
    where: { id: current.id },
    data: {
      sortOrder: data.sortOrder,
      name: data.name,
      spec: data.spec,
      unit: data.unit,
      quantityMilli: data.quantityMilli,
      unitPrice: data.unitPrice,
      ownerId: data.ownerId,
      note: data.note,
    },
  });
  await prisma.auditLog.create({
    data: { actorId: user.id, action: "sua", entityType: "hang_muc", entityId: row.id, summary: `Sửa hạng mục ${data.sortOrder} của ${project.code}` },
  });
  return present(row, data.ownerName);
}

export async function deleteProjectItem(user: User, projectId: string, itemId: string) {
  assertAny(user, ["projects.update", "projects.create"]);
  const project = await visibleProject(user, projectId);
  const current = await prisma.projectItem.findFirst({ where: { id: itemId, projectId: project.id } });
  if (!current) throw new AppError("Không tìm thấy hạng mục.", 404);
  await prisma.$transaction(async (tx) => {
    await tx.projectItem.delete({ where: { id: current.id } });
    await writeAudit(tx, user.id, "xoa", "hang_muc", current.id, `Xóa hạng mục ${current.sortOrder} của ${project.code}`);
  });
}
