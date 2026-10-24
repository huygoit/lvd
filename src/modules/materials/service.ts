import type { Prisma } from "@prisma/client";
import type { User } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { writeAudit } from "@/modules/system/audit";
import { assertAny } from "@/modules/system/access";
import { isMaterialGroup, isMaterialNature, isMaterialPriceBasis } from "@/shared/catalog/materials";
import { canonMeasureUnit } from "@/shared/catalog/units";

const pageSize = 15;

export type MaterialInput = {
  code: string;
  name: string;
  groupName: string;
  supplierCode?: string;
  supplierItemCode?: string;
  otherCode?: string;
  spec?: string;
  color?: string;
  stockUnit: string;
  priceBasis: string;
  barLengthM?: unknown;
  kgPerM?: unknown;
  kgPerBar?: unknown;
  taxPercent?: unknown;
  referencePrice?: unknown;
  invoiceName?: string;
  nature?: string;
  note?: string;
  revision?: number;
};

function text(value: string | undefined) {
  return (value ?? "").trim();
}

function taxBpsFromPercent(value: unknown) {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) throw new AppError("Cần nhập thuế suất.", 400);
  const rate = Number(raw);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new AppError("Thuế suất phải từ 0 đến 100.", 400);
  const bps = Math.round(rate * 100);
  if (Math.abs(rate * 100 - bps) > 1e-6) throw new AppError("Thuế suất chỉ lấy tối đa 2 chữ số thập phân.", 400);
  return bps;
}

function optionalScaled(value: unknown, label: string) {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) throw new AppError(`${label} không hợp lệ.`, 400);
  return Math.round(amount * 1000);
}

function optionalMoney(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) throw new AppError("Đơn giá tham chiếu không hợp lệ.", 400);
  const amount = Number(digits);
  if (!Number.isSafeInteger(amount)) throw new AppError("Đơn giá tham chiếu không hợp lệ.", 400);
  return amount;
}

function clean(input: MaterialInput) {
  const code = text(input.code);
  const name = text(input.name);
  const groupName = text(input.groupName);
  const stockUnit = text(input.stockUnit);
  const stock = canonMeasureUnit(stockUnit);
  if (!code) throw new AppError("Cần nhập mã vật tư.", 400);
  if (!name) throw new AppError("Cần nhập tên vật tư.", 400);
  if (!stock) throw new AppError("Đơn vị tính không có trong danh mục.", 400);
  if (groupName && !isMaterialGroup(groupName)) throw new AppError("Nhóm vật tư không có trong danh mục.", 400);
  if (!isMaterialPriceBasis(input.priceBasis)) throw new AppError("Cách tính tiền không có trong danh mục.", 400);
  const nature = input.nature || "vat_tu";
  if (!isMaterialNature(nature)) throw new AppError("Tính chất không có trong danh mục.", 400);
  const gramsPerMeter = optionalScaled(input.kgPerM, "Trọng lượng kg/m");
  const barLengthMm = optionalScaled(input.barLengthM, "Chiều dài thanh");
  const gramsPerBar = optionalScaled(input.kgPerBar, "Kg mỗi thanh");
  if (input.priceBasis === "kg" && !gramsPerMeter) throw new AppError("Tính theo kg cần có trọng lượng kg/m.", 400);
  return {
    code,
    name,
    groupName,
    supplierCode: text(input.supplierCode),
    supplierItemCode: text(input.supplierItemCode),
    otherCode: text(input.otherCode),
    spec: text(input.spec),
    color: text(input.color),
    stockUnit: stock,
    priceBasis: input.priceBasis,
    barLengthMm,
    gramsPerMeter,
    gramsPerBar,
    taxBps: taxBpsFromPercent(input.taxPercent),
    referencePrice: optionalMoney(input.referencePrice),
    invoiceName: text(input.invoiceName),
    nature,
    note: text(input.note),
  };
}

async function assertCodeFree(code: string, exceptId?: string) {
  const taken = await prisma.material.findFirst({ where: { code, ...(exceptId ? { NOT: { id: exceptId } } : {}) } });
  if (taken) throw new AppError(`Mã vật tư đã thuộc ${taken.name}.`, 409);
}

export async function listMaterialSuppliers(user: User) {
  assertAny(user, ["inventory.view"]);
  return prisma.partner.findMany({
    where: { status: "dang_dung", roles: { some: { role: "nha_cung_cap" } } },
    select: { id: true, code: true, name: true, shortName: true },
    orderBy: { code: "asc" },
  });
}

export async function listMaterials(
  user: User,
  filters: { q?: string; groupName?: string; priceBasis?: string; supplierCode?: string; page?: number },
) {
  assertAny(user, ["inventory.view"]);
  const q = filters.q?.trim();
  const supplierCode = filters.supplierCode?.trim();
  const page = Math.max(1, filters.page || 1);
  const where: Prisma.MaterialWhereInput = {
    ...(filters.groupName === "__trong" ? { groupName: "" } : filters.groupName && isMaterialGroup(filters.groupName) ? { groupName: filters.groupName } : {}),
    ...(filters.priceBasis && isMaterialPriceBasis(filters.priceBasis) ? { priceBasis: filters.priceBasis } : {}),
    ...(supplierCode ? { supplierCode: { equals: supplierCode, mode: "insensitive" } } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { supplierItemCode: { contains: q, mode: "insensitive" } },
            { otherCode: { contains: q, mode: "insensitive" } },
            { color: { contains: q, mode: "insensitive" } },
            { invoiceName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.material.count({ where }),
    prisma.material.findMany({
      where,
      orderBy: [{ groupName: "asc" }, { code: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { total, page, pageSize, rows };
}

export async function getMaterial(user: User, id: string) {
  assertAny(user, ["inventory.view"]);
  const row = await prisma.material.findUnique({ where: { id } });
  if (!row) throw new AppError("Không tìm thấy vật tư.", 404);
  return row;
}

export async function createMaterial(user: User, input: MaterialInput) {
  assertAny(user, ["inventory.create"]);
  const data = clean(input);
  await assertCodeFree(data.code);
  return prisma.$transaction(async (tx) => {
    const row = await tx.material.create({ data });
    await writeAudit(tx, user.id, "tao", "vat_tu", row.id, `Tạo vật tư ${row.code}`);
    return row;
  });
}

export async function updateMaterial(user: User, id: string, input: MaterialInput) {
  assertAny(user, ["inventory.update", "inventory.create"]);
  const current = await prisma.material.findUnique({ where: { id } });
  if (!current) throw new AppError("Không tìm thấy vật tư.", 404);
  if (current.revision !== input.revision) throw new AppError("Vật tư vừa được cập nhật. Hãy tải lại.", 409);
  const data = clean(input);
  await assertCodeFree(data.code, id);
  const updated = await prisma.material.updateMany({
    where: { id, revision: current.revision },
    data: { ...data, revision: { increment: 1 } },
  });
  if (updated.count === 0) throw new AppError("Vật tư vừa được cập nhật. Hãy tải lại.", 409);
  await prisma.auditLog.create({
    data: { actorId: user.id, action: "sua", entityType: "vat_tu", entityId: id, summary: `Cập nhật ${data.code}` },
  });
  return prisma.material.findUniqueOrThrow({ where: { id } });
}

export async function deleteMaterial(user: User, id: string) {
  assertAny(user, ["inventory.update", "inventory.create"]);
  const current = await prisma.material.findUnique({ where: { id } });
  if (!current) throw new AppError("Không tìm thấy vật tư.", 404);
  await prisma.$transaction(async (tx) => {
    await writeAudit(tx, user.id, "xoa", "vat_tu", id, `Xóa vật tư ${current.code}`);
    await tx.material.delete({ where: { id } });
  });
}
