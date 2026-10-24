import type { User } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { writeAudit } from "@/modules/system/audit";
import { assertAny } from "@/modules/system/access";

export type JobTitleRow = {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
};

function toRow(row: { id: string; name: string; sortOrder: number; active: boolean }): JobTitleRow {
  return { id: row.id, name: row.name, sortOrder: row.sortOrder, active: row.active };
}

function cleanName(value: string) {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2) throw new AppError("Tên chức danh cần ít nhất 2 ký tự.", 400);
  if (name.length > 80) throw new AppError("Tên chức danh tối đa 80 ký tự.", 400);
  return name;
}

async function taken(name: string, exceptId?: string) {
  const existing = await prisma.jobTitle.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  if (existing) throw new AppError("Chức danh này đã có trong danh mục.", 409);
}

export async function listJobTitles() {
  const rows = await prisma.jobTitle.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return rows.map(toRow);
}

export async function listActiveJobTitles() {
  const rows = await prisma.jobTitle.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { name: true },
  });
  return rows.map((row) => row.name);
}

export async function canonJobTitle(value: string, previous = "") {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name) return "";
  const row = await prisma.jobTitle.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { name: true, active: true },
  });
  if (row?.active) return row.name;
  if (previous && previous.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi")) return previous;
  if (!row) throw new AppError("Chức danh không có trong danh mục.", 400);
  throw new AppError("Chức danh này đã ngừng dùng.", 400);
}

export async function reorderJobTitles(user: User, ids: string[]) {
  assertAny(user, ["settings.manage"]);
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length !== ids.length) throw new AppError("Thứ tự chức danh bị trùng.", 400);
  const existing = await prisma.jobTitle.findMany({ select: { id: true } });
  const known = new Set(existing.map((row) => row.id));
  if (existing.length !== unique.length || unique.some((id) => !known.has(id))) {
    throw new AppError("Danh sách sắp xếp không khớp danh mục.", 400);
  }
  await prisma.$transaction(async (tx) => {
    for (const [index, id] of unique.entries()) {
      await tx.jobTitle.update({ where: { id }, data: { sortOrder: index + 1 } });
    }
    await writeAudit(tx, user.id, "sua", "chuc_danh", unique[0] ?? "chuc-danh", "Kéo thả sắp xếp chức danh");
  });
}

export async function createJobTitle(user: User, name: string) {
  assertAny(user, ["settings.manage"]);
  const label = cleanName(name);
  await taken(label);
  const last = await prisma.jobTitle.aggregate({ _max: { sortOrder: true } });
  return prisma.$transaction(async (tx) => {
    const row = await tx.jobTitle.create({
      data: { name: label, sortOrder: (last._max.sortOrder ?? 0) + 1, active: true },
    });
    await writeAudit(tx, user.id, "tao", "chuc_danh", row.id, `Thêm chức danh ${row.name}`);
    return toRow(row);
  });
}

export async function updateJobTitle(
  user: User,
  id: string,
  input: { name?: string; active?: boolean },
) {
  assertAny(user, ["settings.manage"]);
  return prisma.$transaction(async (tx) => {
    const current = await tx.jobTitle.findUnique({ where: { id } });
    if (!current) throw new AppError("Không tìm thấy chức danh.", 404);
    const name = input.name === undefined ? current.name : cleanName(input.name);
    if (name.toLocaleLowerCase("vi") !== current.name.toLocaleLowerCase("vi")) {
      const clash = await tx.jobTitle.findFirst({
        where: { name: { equals: name, mode: "insensitive" }, id: { not: id } },
        select: { id: true },
      });
      if (clash) throw new AppError("Chức danh này đã có trong danh mục.", 409);
    }
    const active = input.active === undefined ? current.active : input.active;
    const row = await tx.jobTitle.update({ where: { id }, data: { name, active } });
    await writeAudit(tx, user.id, "sua", "chuc_danh", row.id, `Cập nhật chức danh ${row.name}`);
    return toRow(row);
  });
}
