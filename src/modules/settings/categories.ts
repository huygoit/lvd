import type { User } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { writeAudit } from "@/modules/system/audit";
import { assertAny } from "@/modules/system/access";
import { canonMeasureUnit } from "@/shared/catalog/units";

export type QuoteCategoryGroupRow = {
  id: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
  active: boolean;
  childCount: number;
  itemCount: number;
};

export type QuoteCategoryRow = {
  id: string;
  groupId: string;
  name: string;
  unit: string;
  unitPrice: number;
  sortOrder: number;
  active: boolean;
};

export type QuoteCategoryBundle = {
  groups: QuoteCategoryGroupRow[];
  categories: QuoteCategoryRow[];
};

function cleanName(value: string, label: string, min: number, max: number) {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < min) throw new AppError(`${label} cần ít nhất ${min} ký tự.`, 400);
  if (name.length > max) throw new AppError(`${label} tối đa ${max} ký tự.`, 400);
  return name;
}

function cleanUnit(value: string) {
  const unit = canonMeasureUnit(value);
  if (!unit) throw new AppError("Đơn vị tính không có trong danh mục.", 400);
  return unit;
}

function cleanPrice(value: unknown) {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/\D/g, ""));
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000_000_000) {
    throw new AppError("Đơn giá tham chiếu không hợp lệ.", 400);
  }
  return Math.round(n);
}

function toGroup(
  row: { id: string; parentId: string | null; name: string; sortOrder: number; active: boolean },
  childCount: number,
  itemCount: number,
): QuoteCategoryGroupRow {
  return {
    id: row.id,
    parentId: row.parentId,
    name: row.name,
    sortOrder: row.sortOrder,
    active: row.active,
    childCount,
    itemCount,
  };
}

function toCategory(row: {
  id: string;
  groupId: string;
  name: string;
  unit: string;
  unitPrice: number;
  sortOrder: number;
  active: boolean;
}): QuoteCategoryRow {
  return {
    id: row.id,
    groupId: row.groupId,
    name: row.name,
    unit: row.unit,
    unitPrice: row.unitPrice,
    sortOrder: row.sortOrder,
    active: row.active,
  };
}

async function assertParent(parentId: string | null) {
  if (!parentId) return null;
  const parent = await prisma.quoteCategoryGroup.findUnique({ where: { id: parentId }, select: { id: true } });
  if (!parent) throw new AppError("Nhóm cha không còn tồn tại.", 404);
  return parent;
}

async function assertNotDescendant(id: string, maybeParentId: string) {
  const all = await prisma.quoteCategoryGroup.findMany({ select: { id: true, parentId: true } });
  const kids = new Map<string, string[]>();
  for (const row of all) {
    if (!row.parentId) continue;
    const list = kids.get(row.parentId) ?? [];
    list.push(row.id);
    kids.set(row.parentId, list);
  }
  const stack = [...(kids.get(id) ?? [])];
  const seen = new Set<string>();
  while (stack.length) {
    const current = stack.pop()!;
    if (current === maybeParentId) {
      throw new AppError("Không đưa nhóm vào bên trong chính nó.", 400);
    }
    if (seen.has(current)) continue;
    seen.add(current);
    stack.push(...(kids.get(current) ?? []));
  }
}

export async function listQuoteCategoryBundle(): Promise<QuoteCategoryBundle> {
  const groups = await prisma.quoteCategoryGroup.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { children: true, categories: true } },
    },
  });
  const categories = await prisma.quoteCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return {
    groups: groups.map((row) => toGroup(row, row._count.children, row._count.categories)),
    categories: categories.map(toCategory),
  };
}

/** Danh sách phẳng cho editor báo giá. */
export async function listQuoteCategories() {
  const rows = await prisma.quoteCategory.findMany({
    orderBy: [{ group: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
    include: { group: { select: { active: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    unit: row.unit,
    unitPrice: row.unitPrice,
    sortOrder: row.sortOrder,
    active: row.active && row.group.active,
  }));
}

export async function assertQuoteCategories(keys: string[]) {
  const unique = [...new Set(keys.map((key) => key.trim()).filter(Boolean))];
  if (unique.length === 0) return;
  const found = await prisma.quoteCategory.findMany({ where: { id: { in: unique } }, select: { id: true } });
  if (found.length !== unique.length) {
    throw new AppError("Hạng mục không còn trong danh mục. Hãy chọn lại hoặc nhờ quản trị mở lại.", 400);
  }
}

export async function createQuoteCategoryGroup(user: User, input: { name: string; parentId?: string | null }) {
  assertAny(user, ["settings.manage"]);
  const name = cleanName(input.name, "Tên nhóm", 2, 80);
  const parentId = input.parentId ? String(input.parentId) : null;
  await assertParent(parentId);
  const last = await prisma.quoteCategoryGroup.aggregate({
    where: { parentId },
    _max: { sortOrder: true },
  });
  return prisma.$transaction(async (tx) => {
    const row = await tx.quoteCategoryGroup.create({
      data: { name, parentId, sortOrder: (last._max.sortOrder ?? 0) + 1, active: true },
    });
    await writeAudit(tx, user.id, "tao", "hang_muc_bao_gia", row.id, `Thêm nhóm ${row.name}`);
    return toGroup(row, 0, 0);
  });
}

export async function updateQuoteCategoryGroup(
  user: User,
  id: string,
  input: { name?: string; active?: boolean; parentId?: string | null },
) {
  assertAny(user, ["settings.manage"]);
  return prisma.$transaction(async (tx) => {
    const current = await tx.quoteCategoryGroup.findUnique({
      where: { id },
      include: { _count: { select: { children: true, categories: true } } },
    });
    if (!current) throw new AppError("Không tìm thấy nhóm.", 404);
    let parentId = current.parentId;
    if (input.parentId !== undefined) {
      const nextParent = input.parentId ? String(input.parentId) : null;
      if (nextParent === id) throw new AppError("Không gắn nhóm vào chính nó.", 400);
      if (nextParent) {
        const parent = await tx.quoteCategoryGroup.findUnique({ where: { id: nextParent }, select: { id: true } });
        if (!parent) throw new AppError("Nhóm cha không còn tồn tại.", 404);
        await assertNotDescendant(id, nextParent);
      }
      parentId = nextParent;
    }
    const name = input.name === undefined ? current.name : cleanName(input.name, "Tên nhóm", 2, 80);
    const active = input.active === undefined ? current.active : input.active;
    const row = await tx.quoteCategoryGroup.update({ where: { id }, data: { name, active, parentId } });
    await writeAudit(tx, user.id, "sua", "hang_muc_bao_gia", row.id, `Cập nhật nhóm ${row.name}`);
    return toGroup(row, current._count.children, current._count.categories);
  });
}

export async function deleteQuoteCategoryGroup(user: User, id: string) {
  assertAny(user, ["settings.manage"]);
  return prisma.$transaction(async (tx) => {
    const current = await tx.quoteCategoryGroup.findUnique({
      where: { id },
      include: { _count: { select: { children: true, categories: true } } },
    });
    if (!current) throw new AppError("Không tìm thấy nhóm.", 404);
    if (current._count.children > 0) {
      throw new AppError("Nhóm còn thư mục con. Hãy xóa hoặc chuyển các nhóm con trước.", 400);
    }
    if (current._count.categories > 0) {
      throw new AppError("Nhóm còn hạng mục. Hãy chuyển hoặc xóa hạng mục trước.", 400);
    }
    await tx.quoteCategoryGroup.delete({ where: { id } });
    await writeAudit(tx, user.id, "xoa", "hang_muc_bao_gia", id, `Xóa nhóm ${current.name}`);
  });
}

export async function reorderQuoteCategoryGroups(user: User, parentId: string | null, ids: string[]) {
  assertAny(user, ["settings.manage"]);
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length !== ids.length) throw new AppError("Thứ tự nhóm bị trùng.", 400);
  const existing = await prisma.quoteCategoryGroup.findMany({
    where: { parentId },
    select: { id: true },
  });
  const known = new Set(existing.map((row) => row.id));
  if (existing.length !== unique.length || unique.some((id) => !known.has(id))) {
    throw new AppError("Danh sách sắp xếp không khớp nhóm cùng cấp.", 400);
  }
  await prisma.$transaction(async (tx) => {
    for (const [index, id] of unique.entries()) {
      await tx.quoteCategoryGroup.update({ where: { id }, data: { sortOrder: index + 1 } });
    }
    await writeAudit(tx, user.id, "sua", "hang_muc_bao_gia", unique[0] ?? "nhom", "Kéo thả sắp xếp nhóm hạng mục");
  });
}

export async function createQuoteCategory(
  user: User,
  input: { groupId: string; name: string; unit: string; unitPrice?: number | string },
) {
  assertAny(user, ["settings.manage"]);
  const group = await prisma.quoteCategoryGroup.findUnique({ where: { id: input.groupId }, select: { id: true, name: true } });
  if (!group) throw new AppError("Nhóm không còn tồn tại.", 404);
  const label = cleanName(input.name, "Tên hạng mục", 2, 120);
  const measure = cleanUnit(input.unit || "bộ");
  const unitPrice = cleanPrice(input.unitPrice ?? 0);
  const clash = await prisma.quoteCategory.findFirst({
    where: { name: { equals: label, mode: "insensitive" } },
    select: { id: true },
  });
  if (clash) throw new AppError("Hạng mục này đã có trong danh mục.", 409);
  const last = await prisma.quoteCategory.aggregate({
    where: { groupId: group.id },
    _max: { sortOrder: true },
  });
  return prisma.$transaction(async (tx) => {
    const row = await tx.quoteCategory.create({
      data: {
        groupId: group.id,
        name: label,
        unit: measure,
        unitPrice,
        sortOrder: (last._max.sortOrder ?? 0) + 1,
        active: true,
      },
    });
    await writeAudit(tx, user.id, "tao", "hang_muc_bao_gia", row.id, `Thêm hạng mục ${row.name} vào ${group.name}`);
    return toCategory(row);
  });
}

export async function updateQuoteCategory(
  user: User,
  id: string,
  input: {
    name?: string;
    groupId?: string;
    unit?: string;
    unitPrice?: number | string;
    active?: boolean;
  },
) {
  assertAny(user, ["settings.manage"]);
  return prisma.$transaction(async (tx) => {
    const current = await tx.quoteCategory.findUnique({ where: { id } });
    if (!current) throw new AppError("Không tìm thấy hạng mục.", 404);
    let groupId = current.groupId;
    if (input.groupId !== undefined && input.groupId !== current.groupId) {
      const group = await tx.quoteCategoryGroup.findUnique({ where: { id: input.groupId }, select: { id: true } });
      if (!group) throw new AppError("Nhóm đích không còn tồn tại.", 404);
      groupId = group.id;
    }
    const name = input.name === undefined ? current.name : cleanName(input.name, "Tên hạng mục", 2, 120);
    if (name.toLocaleLowerCase("vi-VN") !== current.name.toLocaleLowerCase("vi-VN")) {
      const clash = await tx.quoteCategory.findFirst({
        where: { name: { equals: name, mode: "insensitive" }, id: { not: id } },
        select: { id: true },
      });
      if (clash) throw new AppError("Hạng mục này đã có trong danh mục.", 409);
    }
    const active = input.active === undefined ? current.active : input.active;
    const unit = input.unit === undefined ? current.unit : cleanUnit(input.unit);
    const unitPrice = input.unitPrice === undefined ? current.unitPrice : cleanPrice(input.unitPrice);
    const row = await tx.quoteCategory.update({
      where: { id },
      data: { name, groupId, unit, unitPrice, active },
    });
    await writeAudit(tx, user.id, "sua", "hang_muc_bao_gia", row.id, `Cập nhật hạng mục ${row.name}`);
    return toCategory(row);
  });
}

export async function deleteQuoteCategory(user: User, id: string) {
  assertAny(user, ["settings.manage"]);
  return prisma.$transaction(async (tx) => {
    const current = await tx.quoteCategory.findUnique({ where: { id } });
    if (!current) throw new AppError("Không tìm thấy hạng mục.", 404);
    await tx.quoteCategory.delete({ where: { id } });
    await writeAudit(tx, user.id, "xoa", "hang_muc_bao_gia", id, `Xóa hạng mục ${current.name}`);
  });
}

export async function reorderQuoteCategories(user: User, groupId: string, ids: string[]) {
  assertAny(user, ["settings.manage"]);
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length !== ids.length) throw new AppError("Thứ tự hạng mục bị trùng.", 400);
  const group = await prisma.quoteCategoryGroup.findUnique({ where: { id: groupId }, select: { id: true } });
  if (!group) throw new AppError("Không tìm thấy nhóm.", 404);
  const existing = await prisma.quoteCategory.findMany({ where: { groupId }, select: { id: true } });
  const known = new Set(existing.map((row) => row.id));
  if (existing.length !== unique.length || unique.some((id) => !known.has(id))) {
    throw new AppError("Danh sách sắp xếp không khớp hạng mục trong nhóm.", 400);
  }
  await prisma.$transaction(async (tx) => {
    for (const [index, id] of unique.entries()) {
      await tx.quoteCategory.update({ where: { id }, data: { sortOrder: index + 1 } });
    }
    await writeAudit(tx, user.id, "sua", "hang_muc_bao_gia", groupId, "Kéo thả sắp xếp hạng mục trong nhóm");
  });
}
