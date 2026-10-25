import type { User } from "@/shared/auth/types";
import { hasAnyCapability } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { writeAudit } from "@/modules/system/audit";
import { assertOwn } from "@/modules/system/access";

// rateBps là phần vạn. 2,5% lưu 250. Nhân với doanh thu trước thuế của hạng mục.

export type KhoanChung = {
  id: string;
  name: string;
  rateBps: number;
  tyLe: string;
};

function hienTyLe(rateBps: number) {
  const tram = rateBps / 100;
  if (Number.isInteger(tram)) return String(tram);
  return tram.toFixed(2).replace(/0$/, "").replace(".", ",");
}

function toRow(row: { id: string; name: string; rateBps: number }): KhoanChung {
  return { id: row.id, name: row.name, rateBps: row.rateBps, tyLe: hienTyLe(row.rateBps) };
}

function docTyLe(value: unknown) {
  const raw = String(value ?? "").trim().replace("%", "").replace(/\s/g, "").replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(raw)) throw new AppError("Phần trăm chỉ nhận số, tối đa 2 số lẻ.", 400);
  const so = Number(raw);
  if (!Number.isFinite(so) || so <= 0 || so > 100) throw new AppError("Phần trăm phải lớn hơn 0 và không quá 100.", 400);
  return Math.round(so * 100);
}

function tenSach(value: unknown) {
  const name = String(value ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2) throw new AppError("Tên chi phí cần ít nhất 2 ký tự.", 400);
  if (name.length > 80) throw new AppError("Tên chi phí tối đa 80 ký tự.", 400);
  return name;
}

async function mo(user: User, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, code: true, ownerId: true } });
  if (!project) throw new AppError("Không tìm thấy công trình.", 404);
  assertOwn(user, "projects.view", "projects.view.assigned", project.ownerId);
  return project;
}

function duocSua(user: User) {
  if (!hasAnyCapability(user, ["projects.update", "projects.create"])) {
    throw new AppError("Bạn không có quyền sửa chi phí chung.", 403);
  }
}

export async function listProjectSharedCosts(user: User, projectId: string) {
  await mo(user, projectId);
  const rows = await prisma.projectSharedCost.findMany({
    where: { projectId },
    orderBy: { name: "asc" },
  });
  return rows.map(toRow);
}

export async function createProjectSharedCost(user: User, projectId: string, input: { name?: unknown; rate?: unknown }) {
  duocSua(user);
  const project = await mo(user, projectId);
  const name = tenSach(input.name);
  const rateBps = docTyLe(input.rate);
  const trung = await prisma.projectSharedCost.findFirst({
    where: { projectId, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (trung) throw new AppError("Công trình này đã có khoản cùng tên.", 409);
  return prisma.$transaction(async (tx) => {
    const row = await tx.projectSharedCost.create({ data: { projectId, name, rateBps } });
    await writeAudit(tx, user.id, "tao", "chi_phi_chung", row.id, `Thêm chi phí chung ${name} của ${project.code}`);
    return toRow(row);
  });
}

export async function updateProjectSharedCost(user: User, projectId: string, id: string, input: { name?: unknown; rate?: unknown }) {
  duocSua(user);
  const project = await mo(user, projectId);
  const current = await prisma.projectSharedCost.findFirst({ where: { id, projectId } });
  if (!current) throw new AppError("Không tìm thấy chi phí chung.", 404);
  const name = input.name === undefined ? current.name : tenSach(input.name);
  const rateBps = input.rate === undefined ? current.rateBps : docTyLe(input.rate);
  if (name.toLocaleLowerCase("vi") !== current.name.toLocaleLowerCase("vi")) {
    const trung = await prisma.projectSharedCost.findFirst({
      where: { projectId, name: { equals: name, mode: "insensitive" }, id: { not: id } },
      select: { id: true },
    });
    if (trung) throw new AppError("Công trình này đã có khoản cùng tên.", 409);
  }
  return prisma.$transaction(async (tx) => {
    const row = await tx.projectSharedCost.update({ where: { id }, data: { name, rateBps } });
    await writeAudit(tx, user.id, "sua", "chi_phi_chung", id, `Sửa chi phí chung ${name} của ${project.code}`);
    return toRow(row);
  });
}

export async function deleteProjectSharedCost(user: User, projectId: string, id: string) {
  duocSua(user);
  const project = await mo(user, projectId);
  const current = await prisma.projectSharedCost.findFirst({ where: { id, projectId } });
  if (!current) throw new AppError("Không tìm thấy chi phí chung.", 404);
  await prisma.$transaction(async (tx) => {
    await writeAudit(tx, user.id, "xoa", "chi_phi_chung", id, `Xóa chi phí chung ${current.name} của ${project.code}`);
    await tx.projectSharedCost.delete({ where: { id } });
  });
}
