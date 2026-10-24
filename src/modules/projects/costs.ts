import type { User } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { writeAudit } from "@/modules/system/audit";
import { assertAny, assertOwn } from "@/modules/system/access";
import { nextCode } from "@/modules/system/codes";
import {
  costCategoryLabel,
  nghiTrungNhau,
  parseCostAmount,
  parseCostCategory,
  parseCostDate,
  type CostCategory,
} from "@/modules/projects/cost-fields";

export type CostInput = {
  occurredOn?: unknown;
  category?: unknown;
  content?: unknown;
  amount?: unknown;
  payerId?: unknown;
  note?: unknown;
  confirm?: unknown;
};

async function visibleProject(user: User, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError("Không tìm thấy công trình.", 404);
  assertOwn(user, "projects.view", "projects.view.assigned", project.ownerId);
  return project;
}

function present(
  row: {
    id: string;
    code: string;
    occurredOn: string;
    category: string;
    content: string;
    amount: bigint;
    payerId: string;
    note: string;
  },
  payerName: string,
  nghiTrung: boolean,
) {
  const category = row.category as CostCategory;
  return {
    id: row.id,
    code: row.code,
    occurredOn: row.occurredOn,
    category: row.category,
    categoryLabel: costCategoryLabel[category] ?? row.category,
    content: row.content,
    amount: Number(row.amount),
    payerId: row.payerId,
    payerName,
    note: row.note,
    nghiTrung,
  };
}

async function readInput(input: CostInput) {
  const content = String(input.content ?? "").trim();
  if (!content) throw new AppError("Cần nhập nội dung chi phí.", 400);
  const payerId = String(input.payerId ?? "").trim();
  const staff = await prisma.staff.findFirst({ where: { id: payerId, active: true } });
  if (!staff) throw new AppError("Chọn người chi.", 400);
  return {
    occurredOn: parseCostDate(input.occurredOn),
    category: parseCostCategory(input.category),
    content,
    amount: parseCostAmount(input.amount),
    payerId,
    payerName: staff.name,
    note: String(input.note ?? "").trim(),
    confirm: input.confirm === true,
  };
}

async function assertKhongTrung(projectId: string, data: { occurredOn: string; content: string; amount: bigint }, confirm: boolean, exceptId?: string) {
  if (confirm) return;
  const rows = await prisma.projectCost.findMany({
    where: { projectId, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { occurredOn: true, content: true, amount: true },
  });
  const trung = rows.some((row) => nghiTrungNhau(data, row));
  if (trung) {
    throw new AppError("Có chi phí cùng số tiền hoặc cùng nội dung trong vòng 3 ngày. Hãy kiểm tra trước khi lưu.", 409, { nghiTrung: true });
  }
}

function danhDauTrung(rows: { id: string; occurredOn: string; content: string; amount: bigint }[]) {
  const marked = new Set<string>();
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      if (!nghiTrungNhau(rows[i], rows[j])) continue;
      marked.add(rows[i].id);
      marked.add(rows[j].id);
    }
  }
  return marked;
}

export async function listProjectCosts(user: User, projectId: string) {
  await visibleProject(user, projectId);
  const rows = await prisma.projectCost.findMany({
    where: { projectId },
    orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
  });
  const staff = await prisma.staff.findMany({ select: { id: true, name: true } });
  const names = new Map(staff.map((item) => [item.id, item.name]));
  const trung = danhDauTrung(rows);
  return rows.map((row) => present(row, names.get(row.payerId) ?? "", trung.has(row.id)));
}

export async function createProjectCost(user: User, projectId: string, input: CostInput, now = new Date()) {
  assertAny(user, ["projects.update", "projects.create"]);
  const project = await visibleProject(user, projectId);
  const data = await readInput(input);
  await assertKhongTrung(project.id, data, data.confirm);
  return prisma.$transaction(async (tx) => {
    const code = await nextCode(tx, "CP", now);
    const row = await tx.projectCost.create({
      data: {
        code,
        projectId: project.id,
        occurredOn: data.occurredOn,
        category: data.category,
        content: data.content,
        amount: data.amount,
        payerId: data.payerId,
        note: data.note,
      },
    });
    await writeAudit(tx, user.id, "tao", "chi_phi", row.id, `Thêm chi phí ${code} của ${project.code}`);
    return present(row, data.payerName, false);
  });
}

export async function updateProjectCost(user: User, projectId: string, costId: string, input: CostInput) {
  assertAny(user, ["projects.update", "projects.create"]);
  const project = await visibleProject(user, projectId);
  const current = await prisma.projectCost.findFirst({ where: { id: costId, projectId: project.id } });
  if (!current) throw new AppError("Không tìm thấy chi phí.", 404);
  const data = await readInput(input);
  await assertKhongTrung(project.id, data, data.confirm, current.id);
  const row = await prisma.projectCost.update({
    where: { id: current.id },
    data: {
      occurredOn: data.occurredOn,
      category: data.category,
      content: data.content,
      amount: data.amount,
      payerId: data.payerId,
      note: data.note,
    },
  });
  await prisma.auditLog.create({
    data: { actorId: user.id, action: "sua", entityType: "chi_phi", entityId: row.id, summary: `Sửa chi phí ${row.code} của ${project.code}` },
  });
  const siblings = await prisma.projectCost.findMany({
    where: { projectId: project.id },
    select: { id: true, occurredOn: true, content: true, amount: true },
  });
  return present(row, data.payerName, danhDauTrung(siblings).has(row.id));
}

export async function deleteProjectCost(user: User, projectId: string, costId: string) {
  assertAny(user, ["projects.update", "projects.create"]);
  const project = await visibleProject(user, projectId);
  const current = await prisma.projectCost.findFirst({ where: { id: costId, projectId: project.id } });
  if (!current) throw new AppError("Không tìm thấy chi phí.", 404);
  await prisma.$transaction(async (tx) => {
    await tx.projectCost.delete({ where: { id: current.id } });
    await writeAudit(tx, user.id, "xoa", "chi_phi", current.id, `Xóa chi phí ${current.code} của ${project.code}`);
  });
}
