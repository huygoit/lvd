import type { User } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { writeAudit } from "@/modules/system/audit";
import { assertAny } from "@/modules/system/access";

export type PositionRow = {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
};

function toRow(row: { id: string; name: string; sortOrder: number; active: boolean }): PositionRow {
  return { id: row.id, name: row.name, sortOrder: row.sortOrder, active: row.active };
}

function cleanName(value: string) {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2) throw new AppError("Tên chức vụ cần ít nhất 2 ký tự.", 400);
  if (name.length > 80) throw new AppError("Tên chức vụ tối đa 80 ký tự.", 400);
  return name;
}

export async function listPositions() {
  const rows = await prisma.position.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return rows.map(toRow);
}

export async function createPosition(user: User, name: string) {
  assertAny(user, ["settings.manage"]);
  const label = cleanName(name);
  const existing = await prisma.position.findFirst({
    where: { name: { equals: label, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) throw new AppError("Chức vụ này đã có trong danh mục.", 409);
  const last = await prisma.position.aggregate({ _max: { sortOrder: true } });
  return prisma.$transaction(async (tx) => {
    const row = await tx.position.create({
      data: { name: label, sortOrder: (last._max.sortOrder ?? 0) + 1, active: true },
    });
    await writeAudit(tx, user.id, "tao", "chuc_vu", row.id, `Thêm chức vụ ${row.name}`);
    return toRow(row);
  });
}

export async function updatePosition(user: User, id: string, input: { name?: string; active?: boolean }) {
  assertAny(user, ["settings.manage"]);
  return prisma.$transaction(async (tx) => {
    const current = await tx.position.findUnique({ where: { id } });
    if (!current) throw new AppError("Không tìm thấy chức vụ.", 404);
    const name = input.name === undefined ? current.name : cleanName(input.name);
    if (name.toLocaleLowerCase("vi") !== current.name.toLocaleLowerCase("vi")) {
      const clash = await tx.position.findFirst({
        where: { name: { equals: name, mode: "insensitive" }, id: { not: id } },
        select: { id: true },
      });
      if (clash) throw new AppError("Chức vụ này đã có trong danh mục.", 409);
    }
    const active = input.active === undefined ? current.active : input.active;
    const row = await tx.position.update({ where: { id }, data: { name, active } });
    await writeAudit(tx, user.id, "sua", "chuc_vu", row.id, `Cập nhật chức vụ ${row.name}`);
    return toRow(row);
  });
}
