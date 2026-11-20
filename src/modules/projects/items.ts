import type { User } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { writeAudit } from "@/modules/system/audit";
import { assertAny, assertOwn } from "@/modules/system/access";
import {
  areaFromSizeMilli,
  formatAreaMilli,
  normalizeAccessories,
  priceItem,
  sumAccessories,
  type AccessoryInput,
} from "@/modules/quotations/calc";
import {
  hangMucAmount,
  parseItemUnit,
  parseQuantityMilli,
  parseSortOrder,
  parseUnitPrice,
} from "@/modules/projects/item-fields";

export type ProjectItemInput = {
  sortOrder?: unknown;
  kind?: unknown;
  symbol?: unknown;
  name?: unknown;
  spec?: unknown;
  unit?: unknown;
  widthMm?: unknown;
  heightMm?: unknown;
  /** Số lượng bộ (giống báo giá). */
  pieceCount?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
  accessories?: unknown;
  ownerId?: unknown;
  note?: unknown;
};

type ProjectItemRow = {
  id: string;
  sortOrder: number;
  kind: string;
  symbol: string;
  name: string;
  spec: string;
  unit: string;
  widthMm: number | null;
  heightMm: number | null;
  quantity: number;
  quantityMilli: number;
  unitPrice: number;
  accessories: unknown;
  ownerId: string;
  note: string;
};

async function visibleProject(user: User, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError("Không tìm thấy công trình.", 404);
  assertOwn(user, "projects.view", "projects.view.assigned", project.ownerId);
  return project;
}

function soNguyenKhongAm(value: unknown, nhan: string) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const so = Number(value);
  if (!Number.isInteger(so) || so < 0) throw new AppError(`${nhan} không hợp lệ.`, 400);
  return so;
}

function tinhKhoiLuong(input: {
  widthMm: number | null;
  heightMm: number | null;
  pieceCount: number;
  quantityRaw: unknown;
}) {
  // Ưu tiên khối lượng nhập tay (ô Khối lượng / import Excel cũ).
  const raw = String(input.quantityRaw ?? "").trim();
  if (raw) {
    try {
      return parseQuantityMilli(raw);
    } catch {
      // fall through — có thể đang gửi số lượng bộ ở field quantity cũ
    }
  }
  if (input.widthMm && input.heightMm && input.pieceCount > 0) {
    return areaFromSizeMilli(input.widthMm, input.heightMm, input.pieceCount);
  }
  return 0;
}

function present(row: ProjectItemRow, ownerName: string) {
  const accessories = normalizeAccessories(row.accessories);
  const kind = row.kind === "nhom" ? "nhom" : "item";
  let amount = 0;
  if (kind === "item") {
    try {
      const areaM2 = row.quantityMilli > 0 ? row.quantityMilli / 1000 : null;
      const priced = priceItem({
        name: row.name,
        quantity: row.quantity > 0 ? row.quantity : 1,
        mainUnitPrice: row.unitPrice,
        widthMm: areaM2 != null && areaM2 > 0 ? null : row.widthMm,
        heightMm: areaM2 != null && areaM2 > 0 ? null : row.heightMm,
        areaOverride: areaM2,
        accessories,
      });
      amount = priced.pretax;
    } catch {
      amount = hangMucAmount(row.unitPrice, row.quantityMilli) + sumAccessories(accessories);
    }
  }
  return {
    id: row.id,
    sortOrder: row.sortOrder,
    kind,
    symbol: row.symbol,
    name: row.name,
    spec: row.spec,
    unit: row.unit,
    widthMm: row.widthMm,
    heightMm: row.heightMm,
    quantity: row.quantity,
    quantityMilli: row.quantityMilli,
    areaText: formatAreaMilli(row.quantityMilli),
    unitPrice: row.unitPrice,
    accessories,
    amount,
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
  const kind = String(input.kind ?? "item").trim() === "nhom" ? "nhom" : "item";
  const widthMm = soNguyenKhongAm(input.widthMm, "Chiều rộng");
  const heightMm = soNguyenKhongAm(input.heightMm, "Chiều cao");
  const pieceFromField = soNguyenKhongAm(input.pieceCount, "Số lượng");
  // Bản cũ / Excel: quantity = khối lượng. Bản mới: pieceCount = số bộ, quantity = khối lượng (tuỳ chọn).
  const pieceCount = pieceFromField ?? 0;
  const quantityMilli =
    kind === "nhom"
      ? 0
      : tinhKhoiLuong({
          widthMm,
          heightMm,
          pieceCount,
          quantityRaw: input.quantity,
        });
  const accessories = kind === "nhom" ? [] : normalizeAccessories(input.accessories);
  const unitPrice = kind === "nhom" ? 0 : parseUnitPrice(input.unitPrice);
  return {
    sortOrder: parseSortOrder(input.sortOrder),
    kind,
    symbol: String(input.symbol ?? "").trim().slice(0, 120),
    name,
    spec: String(input.spec ?? "").trim(),
    unit: parseItemUnit(input.unit),
    widthMm,
    heightMm,
    quantity: pieceCount,
    quantityMilli,
    unitPrice,
    accessories,
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

function dataCreate(projectId: string, data: Awaited<ReturnType<typeof readInput>>) {
  return {
    projectId,
    sortOrder: data.sortOrder,
    kind: data.kind,
    symbol: data.symbol,
    name: data.name,
    spec: data.spec,
    unit: data.unit,
    widthMm: data.widthMm,
    heightMm: data.heightMm,
    quantity: data.quantity,
    quantityMilli: data.quantityMilli,
    unitPrice: data.unitPrice,
    accessories: data.accessories,
    ownerId: data.ownerId,
    note: data.note,
  };
}

export async function listProjectItems(user: User, projectId: string) {
  await visibleProject(user, projectId);
  const rows = await prisma.projectItem.findMany({ where: { projectId }, orderBy: { sortOrder: "asc" } });
  const staff = await prisma.staff.findMany({ select: { id: true, name: true } });
  const names = new Map(staff.map((item) => [item.id, item.name]));
  return rows.map((row) => present(row as ProjectItemRow, names.get(row.ownerId) ?? ""));
}

export async function createProjectItem(user: User, projectId: string, input: ProjectItemInput) {
  assertAny(user, ["projects.update", "projects.create"]);
  const project = await visibleProject(user, projectId);
  const data = await readInput(input);
  await assertSortFree(project.id, data.sortOrder);
  return prisma.$transaction(async (tx) => {
    const row = await tx.projectItem.create({ data: dataCreate(project.id, data) });
    await writeAudit(tx, user.id, "tao", "hang_muc", row.id, `Thêm hạng mục ${data.sortOrder} của ${project.code}`);
    return present(row as ProjectItemRow, data.ownerName);
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
      kind: data.kind,
      symbol: data.symbol,
      name: data.name,
      spec: data.spec,
      unit: data.unit,
      widthMm: data.widthMm,
      heightMm: data.heightMm,
      quantity: data.quantity,
      quantityMilli: data.quantityMilli,
      unitPrice: data.unitPrice,
      accessories: data.accessories,
      ownerId: data.ownerId,
      note: data.note,
    },
  });
  await prisma.auditLog.create({
    data: { actorId: user.id, action: "sua", entityType: "hang_muc", entityId: row.id, summary: `Sửa hạng mục ${data.sortOrder} của ${project.code}` },
  });
  return present(row as ProjectItemRow, data.ownerName);
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

async function parseHangMucInputs(projectOwnerId: string, inputs: ProjectItemInput[]) {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new AppError("File không có hạng mục để nạp.", 400);
  }
  const parsed = [];
  for (let i = 0; i < inputs.length; i += 1) {
    const data = await readInput({
      ...inputs[i],
      sortOrder: inputs[i]?.sortOrder ?? i + 1,
      ownerId: inputs[i]?.ownerId || projectOwnerId,
    });
    parsed.push(data);
  }
  const orders = new Set(parsed.map((item) => item.sortOrder));
  if (orders.size !== parsed.length) throw new AppError("Số thứ tự hạng mục bị trùng.", 400);
  return parsed;
}

/** Xóa hết hạng mục cũ rồi nạp bộ mới (dùng khi import Excel). */
export async function replaceProjectItems(user: User, projectId: string, inputs: ProjectItemInput[]) {
  assertAny(user, ["projects.update", "projects.create"]);
  const project = await visibleProject(user, projectId);
  const parsed = await parseHangMucInputs(project.ownerId, inputs);

  return prisma.$transaction(async (tx) => {
    const cu = await tx.projectItem.deleteMany({ where: { projectId: project.id } });
    const rows = [];
    for (const data of parsed) {
      const row = await tx.projectItem.create({ data: dataCreate(project.id, data) });
      rows.push(present(row as ProjectItemRow, data.ownerName));
    }
    await writeAudit(
      tx,
      user.id,
      "sua",
      "cong_trinh",
      project.id,
      `Nạp lại hạng mục từ file: xóa ${cu.count}, thêm ${rows.length} của ${project.code}`,
    );
    return rows;
  });
}

/** Thêm phụ lục: giữ hạng mục cũ, nối thêm dòng mới sau STT lớn nhất. */
export async function appendProjectItems(user: User, projectId: string, inputs: ProjectItemInput[]) {
  assertAny(user, ["projects.update", "projects.create"]);
  const project = await visibleProject(user, projectId);
  const cuoi = await prisma.projectItem.findFirst({
    where: { projectId: project.id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const batDau = (cuoi?.sortOrder ?? 0) + 1;
  const withOrder = inputs.map((item, index) => ({
    ...item,
    sortOrder: batDau + index,
  }));
  const parsed = await parseHangMucInputs(project.ownerId, withOrder);

  return prisma.$transaction(async (tx) => {
    const rows = [];
    for (const data of parsed) {
      const row = await tx.projectItem.create({ data: dataCreate(project.id, data) });
      rows.push(present(row as ProjectItemRow, data.ownerName));
    }
    await writeAudit(
      tx,
      user.id,
      "sua",
      "cong_trinh",
      project.id,
      `Thêm phụ lục hạng mục: +${rows.length} của ${project.code}`,
    );
    return rows;
  });
}

/** Tính tổng tiền hạng mục (cửa + phụ kiện). */
export function tongTienHangMuc(
  rows: { unitPrice: number; quantityMilli: number; quantity?: number; widthMm?: number | null; heightMm?: number | null; accessories?: unknown; kind?: string }[],
) {
  let tong = 0;
  for (const row of rows) {
    if (row.kind === "nhom") continue;
    const accessories = normalizeAccessories(row.accessories);
    try {
      const areaM2 = row.quantityMilli > 0 ? row.quantityMilli / 1000 : null;
      const priced = priceItem({
        name: "x",
        quantity: row.quantity && row.quantity > 0 ? row.quantity : 1,
        mainUnitPrice: row.unitPrice,
        widthMm: areaM2 != null && areaM2 > 0 ? null : row.widthMm ?? null,
        heightMm: areaM2 != null && areaM2 > 0 ? null : row.heightMm ?? null,
        areaOverride: areaM2,
        accessories,
      });
      tong += priced.pretax;
    } catch {
      tong += hangMucAmount(row.unitPrice, row.quantityMilli) + sumAccessories(accessories);
    }
  }
  return tong;
}

export type { AccessoryInput };
