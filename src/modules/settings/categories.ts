import type { User } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { writeAudit } from "@/modules/system/audit";
import { assertAny } from "@/modules/system/access";
import { canonMeasureUnit } from "@/shared/catalog/units";

export type QuoteCategoryRow = {
  id: string;
  name: string;
  unit: string;
  sortOrder: number;
  active: boolean;
};

function toRow(row: { id: string; name: string; unit: string; sortOrder: number; active: boolean }): QuoteCategoryRow {
  return { id: row.id, name: row.name, unit: row.unit, sortOrder: row.sortOrder, active: row.active };
}

function cleanName(value: string) {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2) throw new AppError("Tên hạng mục cần ít nhất 2 ký tự.", 400);
  if (name.length > 120) throw new AppError("Tên hạng mục tối đa 120 ký tự.", 400);
  return name;
}

function cleanUnit(value: string) {
  const unit = canonMeasureUnit(value);
  if (!unit) throw new AppError("Đơn vị tính không có trong danh mục.", 400);
  return unit;
}

async function taken(name: string, exceptId?: string) {
  const existing = await prisma.quoteCategory.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, id: exceptId ? { not: exceptId } : undefined },
    select: { id: true },
  });
  if (existing) throw new AppError("Hạng mục này đã có trong danh mục.", 409);
}

export async function listQuoteCategories() {
  const rows = await prisma.quoteCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return rows.map(toRow);
}

export async function assertQuoteCategories(keys: string[]) {
  const unique = [...new Set(keys.map((key) => key.trim()).filter(Boolean))];
  if (unique.length === 0) return;
  const found = await prisma.quoteCategory.findMany({ where: { id: { in: unique } }, select: { id: true } });
  if (found.length !== unique.length) {
    throw new AppError("Hạng mục không còn trong danh mục. Hãy chọn lại hoặc nhờ quản trị mở lại.", 400);
  }
}

export async function reorderQuoteCategories(user: User, ids: string[]) {
  assertAny(user, ["settings.manage"]);
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length !== ids.length) throw new AppError("Thứ tự hạng mục bị trùng.", 400);
  const existing = await prisma.quoteCategory.findMany({ select: { id: true } });
  const known = new Set(existing.map((row) => row.id));
  if (existing.length !== unique.length || unique.some((id) => !known.has(id))) {
    throw new AppError("Danh sách sắp xếp không khớp danh mục.", 400);
  }
  await prisma.$transaction(async (tx) => {
    for (const [index, id] of unique.entries()) {
      await tx.quoteCategory.update({ where: { id }, data: { sortOrder: index + 1 } });
    }
    await writeAudit(tx, user.id, "sua", "hang_muc_bao_gia", unique[0] ?? "hang-muc", "Kéo thả sắp xếp hạng mục báo giá");
  });
}

export async function createQuoteCategory(user: User, name: string, unit: string) {
  assertAny(user, ["settings.manage"]);
  const label = cleanName(name);
  const measure = cleanUnit(unit || "bộ");
  await taken(label);
  const last = await prisma.quoteCategory.aggregate({ _max: { sortOrder: true } });
  return prisma.$transaction(async (tx) => {
    const row = await tx.quoteCategory.create({
      data: { name: label, unit: measure, sortOrder: (last._max.sortOrder ?? 0) + 1, active: true },
    });
    await writeAudit(tx, user.id, "tao", "hang_muc_bao_gia", row.id, `Thêm hạng mục ${row.name}`);
    return toRow(row);
  });
}

export async function updateQuoteCategory(
  user: User,
  id: string,
  input: { name?: string; unit?: string; active?: boolean; move?: "len" | "xuong" },
) {
  assertAny(user, ["settings.manage"]);
  return prisma.$transaction(async (tx) => {
    const current = await tx.quoteCategory.findUnique({ where: { id } });
    if (!current) throw new AppError("Không tìm thấy hạng mục.", 404);
    if (input.move) {
      const rows = await tx.quoteCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
      const index = rows.findIndex((row) => row.id === id);
      const neighbor = rows[index + (input.move === "len" ? -1 : 1)];
      if (neighbor) {
        await tx.quoteCategory.update({ where: { id: current.id }, data: { sortOrder: neighbor.sortOrder } });
        await tx.quoteCategory.update({ where: { id: neighbor.id }, data: { sortOrder: current.sortOrder } });
      }
    }
    const name = input.name === undefined ? current.name : cleanName(input.name);
    if (name.toLocaleLowerCase("vi-VN") !== current.name.toLocaleLowerCase("vi-VN")) {
      const clash = await tx.quoteCategory.findFirst({
        where: { name: { equals: name, mode: "insensitive" }, id: { not: id } },
        select: { id: true },
      });
      if (clash) throw new AppError("Hạng mục này đã có trong danh mục.", 409);
    }
    const active = input.active === undefined ? current.active : input.active;
    const unit = input.unit === undefined ? current.unit : cleanUnit(input.unit);
    const row = await tx.quoteCategory.update({ where: { id }, data: { name, unit, active } });
    await writeAudit(tx, user.id, "sua", "hang_muc_bao_gia", row.id, `Cập nhật hạng mục ${row.name}`);
    return toRow(row);
  });
}
