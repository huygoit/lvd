import type { User } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { writeAudit } from "@/modules/system/audit";
import { assertAny } from "@/modules/system/access";

export type DepartmentRow = {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
};

function toRow(row: { id: string; name: string; sortOrder: number; active: boolean }): DepartmentRow {
  return { id: row.id, name: row.name, sortOrder: row.sortOrder, active: row.active };
}

function cleanName(value: string) {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2) throw new AppError("Tên phòng ban cần ít nhất 2 ký tự.", 400);
  if (name.length > 80) throw new AppError("Tên phòng ban tối đa 80 ký tự.", 400);
  return name;
}

async function taken(name: string, exceptId?: string) {
  const existing = await prisma.department.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  if (existing) throw new AppError("Phòng ban này đã có trong danh mục.", 409);
}

export async function listDepartments() {
  const rows = await prisma.department.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return rows.map(toRow);
}

export async function reorderDepartments(user: User, ids: string[]) {
  assertAny(user, ["settings.manage"]);
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length !== ids.length) throw new AppError("Thứ tự phòng ban bị trùng.", 400);
  const existing = await prisma.department.findMany({ select: { id: true } });
  const known = new Set(existing.map((row) => row.id));
  if (existing.length !== unique.length || unique.some((id) => !known.has(id))) {
    throw new AppError("Danh sách sắp xếp không khớp danh mục.", 400);
  }
  await prisma.$transaction(async (tx) => {
    for (const [index, id] of unique.entries()) {
      await tx.department.update({ where: { id }, data: { sortOrder: index + 1 } });
    }
    await writeAudit(tx, user.id, "sua", "phong_ban", unique[0] ?? "phong-ban", "Kéo thả sắp xếp phòng ban");
  });
}

export async function createDepartment(user: User, name: string) {
  assertAny(user, ["settings.manage"]);
  const label = cleanName(name);
  await taken(label);
  const last = await prisma.department.aggregate({ _max: { sortOrder: true } });
  return prisma.$transaction(async (tx) => {
    const row = await tx.department.create({
      data: { name: label, sortOrder: (last._max.sortOrder ?? 0) + 1, active: true },
    });
    await writeAudit(tx, user.id, "tao", "phong_ban", row.id, `Thêm phòng ban ${row.name}`);
    return toRow(row);
  });
}

export async function updateDepartment(user: User, id: string, input: { name?: string; active?: boolean }) {
  assertAny(user, ["settings.manage"]);
  return prisma.$transaction(async (tx) => {
    const current = await tx.department.findUnique({ where: { id } });
    if (!current) throw new AppError("Không tìm thấy phòng ban.", 404);
    const name = input.name === undefined ? current.name : cleanName(input.name);
    if (name.toLocaleLowerCase("vi") !== current.name.toLocaleLowerCase("vi")) {
      const clash = await tx.department.findFirst({
        where: { name: { equals: name, mode: "insensitive" }, id: { not: id } },
        select: { id: true },
      });
      if (clash) throw new AppError("Phòng ban này đã có trong danh mục.", 409);
    }
    const active = input.active === undefined ? current.active : input.active;
    const row = await tx.department.update({ where: { id }, data: { name, active } });
    await writeAudit(tx, user.id, "sua", "phong_ban", row.id, `Cập nhật phòng ban ${row.name}`);
    return toRow(row);
  });
}

