import type { Prisma } from "@prisma/client";
import type { User } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { writeAudit } from "@/modules/system/audit";
import { assertAny } from "@/modules/system/access";
import { nextCode } from "@/modules/system/codes";
import {
  formatStockQty,
  glassStateIndex,
  glassStepText,
  isGlassState,
  isKgReceiveState,
  isMovablePlace,
  isStockSlipKind,
  stockPlaceLabel,
  stockSlipKindLabel,
  theoryGrams,
  type StockSlipKind,
} from "@/shared/catalog/stock";
import { isGlassMaterial } from "@/shared/catalog/materials";

const pageSize = 15;
const scale = 1000;

export type SlipLineInput = {
  materialId?: string;
  documentQty?: unknown;
  receivedQty?: unknown;
  note?: string;
  receiveState?: string;
  barCount?: unknown;
  lengthM?: unknown;
  invoiceKg?: unknown;
  weighedKg?: unknown;
};

export type SlipInput = {
  kind?: string;
  partnerId?: string;
  projectId?: string;
  fromKind?: string;
  fromRef?: string;
  toKind?: string;
  toRef?: string;
  slipNo?: string;
  reason?: string;
  note?: string;
  revision?: number;
  lines?: SlipLineInput[];
};

type Place = { kind: string; ref: string };

type CleanLine = {
  materialId: string;
  documentQty: number;
  receivedQty: number;
  note: string;
  receiveState: string;
  barCount: number;
  lengthMm: number | null;
  invoiceGrams: number;
  weighedGrams: number;
  theoryGrams: number;
};

type CleanSlip = {
  kind: StockSlipKind;
  slipNo: string;
  partnerId: string | null;
  projectId: string | null;
  fromKind: string;
  fromRef: string;
  toKind: string;
  toRef: string;
  reason: string;
  note: string;
  lines: CleanLine[];
};

function text(value: string | undefined) {
  return (value ?? "").trim();
}

export function formatWhen(date: Date) {
  const shifted = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const hour = String(shifted.getUTCHours()).padStart(2, "0");
  const minute = String(shifted.getUTCMinutes()).padStart(2, "0");
  return `${day}/${month}/${shifted.getUTCFullYear()} ${hour}:${minute}`;
}

function qtyOf(value: unknown, label: string) {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) return 0;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) throw new AppError(`${label} không hợp lệ.`, 400);
  return Math.round(amount * scale);
}

function readPlace(kindRaw: string | undefined, refRaw: string | undefined, label: string): Place {
  const kind = text(kindRaw);
  if (!isMovablePlace(kind)) throw new AppError(`${label} không hợp lệ.`, 400);
  const ref = text(refRaw);
  if (kind === "kho" || kind === "xuong") return { kind, ref: kind === "kho" ? "" : ref };
  if (!ref) throw new AppError(kind === "cong_trinh" ? `${label} cần chọn công trình.` : `${label} cần chọn nhà cung cấp.`, 400);
  return { kind, ref };
}

function clean(input: SlipInput): CleanSlip {
  const kind = text(input.kind);
  if (!isStockSlipKind(kind)) throw new AppError("Loại phiếu không có trong danh mục.", 400);
  if (kind === "giao_hang") throw new AppError("Phiếu giao đến công trình tạo từ đơn hàng hoặc từ kho, không tạo tại đây.", 400);
  const partnerId = text(input.partnerId) || null;
  const projectId = text(input.projectId) || null;
  const reason = text(input.reason);
  let from: Place | null = null;
  let to: Place;
  let keptProject = projectId;
  let keptPartner = partnerId;
  if (kind === "nhap") {
    if (!partnerId) throw new AppError("Chọn nhà cung cấp.", 400);
    to = { kind: "kho", ref: "" };
  } else if (kind === "giao_thang") {
    if (!partnerId) throw new AppError("Chọn nhà cung cấp.", 400);
    if (!projectId) throw new AppError("Chọn công trình.", 400);
    to = { kind: "cong_trinh", ref: projectId };
  } else if (kind === "xuat_lap") {
    if (!projectId) throw new AppError("Chọn công trình.", 400);
    from = { kind: "cong_trinh", ref: projectId };
    to = { kind: "da_lap", ref: projectId };
    keptPartner = null;
  } else if (kind === "tra_hong") {
    from = readPlace(input.fromKind, input.fromRef, "Nơi xuất");
    if (!reason) throw new AppError("Cần nhập lý do trả hoặc hỏng.", 400);
    to = { kind: "hong", ref: "" };
    if (from.kind === "cong_trinh") keptProject = from.ref;
    if (from.kind === "ncc") keptPartner = from.ref;
  } else if (kind === "kinh") {
    if (!partnerId) throw new AppError("Chọn nhà cung cấp.", 400);
    if (!projectId) throw new AppError("Chọn công trình.", 400);
    const toState = text(input.toKind);
    const fromState = text(input.fromKind);
    if (!isGlassState(toState)) throw new AppError("Chọn trạng thái kính.", 400);
    if (fromState && !isGlassState(fromState)) throw new AppError("Trạng thái đi không có trong danh mục.", 400);
    if (fromState === toState) throw new AppError("Trạng thái đi và trạng thái đến phải khác nhau.", 400);
    if (!fromState && toState !== "da_dat") throw new AppError("Kính mới chỉ vào đã đặt. Bước sau phải chọn trạng thái đi.", 400);
    if (fromState === "vo") throw new AppError("Kính đã vỡ không chuyển tiếp.", 400);
    if (fromState && toState !== "vo" && glassStateIndex(toState) <= glassStateIndex(fromState)) {
      throw new AppError("Trạng thái đến phải đứng sau trạng thái đi.", 400);
    }
    if (toState === "vo" && !reason) throw new AppError("Cần nhập lý do vỡ.", 400);
    from = fromState ? { kind: fromState, ref: projectId } : null;
    to = { kind: toState, ref: projectId };
    keptProject = projectId;
    keptPartner = partnerId;
  } else {
    from = readPlace(input.fromKind, input.fromRef, "Chỗ đi");
    to = readPlace(input.toKind, input.toRef, "Chỗ đến");
    if (from.kind === to.kind && from.ref === to.ref) throw new AppError("Chỗ đi và chỗ đến phải khác nhau.", 400);
    if (from.kind === "cong_trinh") keptProject = from.ref;
    else if (to.kind === "cong_trinh") keptProject = to.ref;
  }
  const seen = new Set<string>();
  const lines = (input.lines ?? []).map((line) => {
    const materialId = text(line.materialId);
    if (!materialId) throw new AppError("Chọn vật tư cho từng dòng.", 400);
    if (seen.has(materialId)) throw new AppError("Mỗi vật tư chỉ một dòng trên phiếu.", 400);
    seen.add(materialId);
    const documentQty = qtyOf(line.documentQty, "Số lượng chứng từ");
    const receivedQty = qtyOf(line.receivedQty, "Số lượng thực nhận");
    const lengthRaw = String(line.lengthM ?? "").trim();
    return {
      materialId,
      documentQty,
      receivedQty,
      note: text(line.note),
      receiveState: text(line.receiveState),
      barCount: qtyOf(line.barCount, "Số thanh"),
      lengthMm: lengthRaw ? qtyOf(line.lengthM, "Chiều dài thanh") : null,
      invoiceGrams: qtyOf(line.invoiceKg, "Kg hóa đơn"),
      weighedGrams: qtyOf(line.weighedKg, "Kg cân"),
      theoryGrams: 0,
    };
  });
  if (lines.length === 0) throw new AppError("Phiếu cần ít nhất một dòng vật tư.", 400);
  return {
    kind,
    slipNo: text(input.slipNo),
    partnerId: keptPartner,
    projectId: keptProject,
    fromKind: from?.kind ?? "",
    fromRef: from?.ref ?? "",
    toKind: to.kind,
    toRef: to.ref,
    reason: kind === "tra_hong" || (kind === "kinh" && text(input.toKind) === "vo") ? reason : "",
    note: text(input.note),
    lines,
  };
}

async function settleLines(data: CleanSlip) {
  const materials = await prisma.material.findMany({
    where: { id: { in: data.lines.map((line) => line.materialId) } },
    select: { id: true, code: true, name: true, priceBasis: true, stockUnit: true, gramsPerMeter: true, gramsPerBar: true, barLengthMm: true },
  });
  if (materials.length !== data.lines.length) throw new AppError("Có vật tư không còn trong danh mục.", 400);
  const byId = new Map(materials.map((item) => [item.id, item]));
  data.lines = data.lines.map((line) => {
    const material = byId.get(line.materialId);
    if (!material) throw new AppError("Có vật tư không còn trong danh mục.", 400);
    if (data.kind === "kinh" && !isGlassMaterial(material)) throw new AppError(`${material.code} không phải kính tấm.`, 400);
    if (material.priceBasis !== "kg") {
      if (line.documentQty === 0 && line.receivedQty === 0) throw new AppError("Dòng cần có số lượng.", 400);
      return { ...line, receiveState: "", barCount: 0, lengthMm: null, invoiceGrams: 0, weighedGrams: 0, theoryGrams: 0 };
    }
    const receiveState = isKgReceiveState(line.receiveState) ? line.receiveState : "tam_nhap";
    const lengthMm = line.lengthMm ?? material.barLengthMm;
    const theory = theoryGrams(line.barCount, lengthMm, material.gramsPerMeter, material.gramsPerBar);
    if (receiveState === "tam_nhap" && line.invoiceGrams <= 0) throw new AppError(`${material.code} tạm nhập cần có kg hóa đơn.`, 400);
    if (receiveState === "da_xac_nhan" && material.stockUnit === "kg" && line.weighedGrams <= 0) {
      throw new AppError(`${material.code} cần kg cân khi đã có phiếu.`, 400);
    }
    if (receiveState === "da_xac_nhan" && material.stockUnit !== "kg" && line.barCount <= 0) {
      throw new AppError(`${material.code} cần số thanh khi đã có phiếu.`, 400);
    }
    const receivedQty = receiveState === "tam_nhap" ? 0 : material.stockUnit === "kg" ? line.weighedGrams : line.barCount;
    const documentQty = material.stockUnit === "kg" ? line.invoiceGrams : line.barCount;
    return { ...line, receiveState, lengthMm, theoryGrams: theory, receivedQty, documentQty };
  });
}

async function assertRefs(data: CleanSlip) {
  const partnerIds = [data.partnerId, data.fromKind === "ncc" ? data.fromRef : "", data.toKind === "ncc" ? data.toRef : ""].filter((item): item is string => Boolean(item));
  const projectIds = [data.projectId, data.fromKind === "cong_trinh" ? data.fromRef : "", data.toKind === "cong_trinh" ? data.toRef : ""].filter((item): item is string => Boolean(item));
  if (partnerIds.length) {
    const found = await prisma.partner.count({ where: { id: { in: partnerIds }, status: "dang_dung" } });
    if (found < new Set(partnerIds).size) throw new AppError("Không thấy nhà cung cấp đang dùng.", 400);
  }
  if (projectIds.length) {
    const found = await prisma.project.count({ where: { id: { in: projectIds } } });
    if (found < new Set(projectIds).size) throw new AppError("Không thấy công trình.", 400);
  }
}

function lineData(lines: CleanLine[]) {
  return lines.map((line, index) => ({ ...line, sortOrder: index }));
}

const slipInclude = {
  partner: { select: { id: true, code: true, name: true } },
  project: { select: { id: true, code: true, name: true } },
  lines: {
    orderBy: { sortOrder: "asc" as const },
    include: { material: { select: { id: true, code: true, name: true, stockUnit: true, priceBasis: true, gramsPerMeter: true, gramsPerBar: true } } },
  },
} satisfies Prisma.StockSlipInclude;

function partyName(row: { code: string; name: string } | null) {
  if (!row) return "";
  return row.name.trim() || row.code;
}

export function placeText(kind: string, ref: string, projects: Map<string, string>, partners: Map<string, string>) {
  const base = stockPlaceLabel(kind);
  if (kind === "ncc" && ref.includes("|")) {
    const [projectId, partnerId] = ref.split("|");
    return [base, partners.get(partnerId) ?? partnerId, projects.get(projectId) ?? projectId].filter(Boolean).join(" · ");
  }
  if (kind === "cong_trinh" || kind === "dang_giao" || kind === "da_lap" || kind === "da_dat" || kind === "da_san_xuat" || (kind === "hong" && ref)) {
    return ref ? `${base} · ${projects.get(ref) ?? ref}` : base;
  }
  if (kind === "ncc") return ref ? `${base} · ${partners.get(ref) ?? ref}` : base;
  if (kind === "xuong") return ref ? `${base} · ${partners.get(ref) ?? ref}` : `${base} · Nội bộ`;
  return base;
}

function presentSlip(
  row: Prisma.StockSlipGetPayload<{ include: typeof slipInclude }>,
  files: { id: string; fileName: string }[],
) {
  const projects = new Map(row.project ? [[row.project.id, partyName(row.project)]] : []);
  const partners = new Map(row.partner ? [[row.partner.id, partyName(row.partner)]] : []);
  return {
    id: row.id,
    code: row.code,
    kind: row.kind,
    status: row.status,
    slipNo: row.slipNo,
    partnerId: row.partnerId ?? "",
    partnerName: partyName(row.partner),
    projectId: row.projectId ?? "",
    projectName: partyName(row.project),
    fromKind: row.fromKind,
    fromRef: row.fromRef,
    toKind: row.toKind,
    toRef: row.toRef,
    fromLabel: row.kind === "kinh" ? glassStepText(row.fromKind, partyName(row.project), partyName(row.partner)) : row.fromKind ? placeText(row.fromKind, row.fromRef, projects, partners) : "",
    toLabel: row.kind === "kinh" ? glassStepText(row.toKind, partyName(row.project), partyName(row.partner)) : placeText(row.toKind, row.toRef, projects, partners),
    reason: row.reason,
    note: row.note,
    revision: row.revision,
    when: formatWhen(row.createdAt),
    lines: row.lines.map((line) => ({
      id: line.id,
      materialId: line.materialId,
      code: line.material.code,
      name: line.material.name,
      unit: line.material.stockUnit,
      documentQty: line.documentQty,
      receivedQty: line.receivedQty,
      note: line.note,
      priceBasis: line.material.priceBasis,
      gramsPerMeter: line.material.gramsPerMeter,
      gramsPerBar: line.material.gramsPerBar,
      receiveState: line.receiveState,
      barCount: line.barCount,
      lengthMm: line.lengthMm,
      invoiceGrams: line.invoiceGrams,
      weighedGrams: line.weighedGrams,
      theoryGrams: line.theoryGrams,
    })),
    files,
  };
}

export async function listStockOptions(user: User) {
  assertAny(user, ["inventory.view"]);
  const [projects, partners] = await Promise.all([
    prisma.project.findMany({ select: { id: true, code: true, name: true }, orderBy: { code: "desc" }, take: 200 }),
    prisma.partner.findMany({
      where: { status: "dang_dung" },
      select: { id: true, code: true, name: true, roles: { select: { role: true } } },
      orderBy: { code: "asc" },
    }),
  ]);
  return {
    projects: projects.map((row) => ({ id: row.id, code: row.code, name: row.name })),
    partners: partners.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name.trim() || row.code,
      roles: row.roles.map((item) => item.role),
    })),
  };
}

export async function searchStockMaterials(user: User, q: string, glassOnly = false) {
  assertAny(user, ["inventory.view"]);
  const query = q.trim();
  if (!query) return [];
  const rows = await prisma.material.findMany({
    where: {
      OR: [
        { code: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
      ],
    },
    select: { id: true, code: true, name: true, stockUnit: true, priceBasis: true, gramsPerMeter: true, gramsPerBar: true, barLengthMm: true },
    orderBy: { code: "asc" },
    take: glassOnly ? 40 : 8,
  });
  const listed = rows.map((row) => ({ ...row, glass: isGlassMaterial(row) }));
  return glassOnly ? listed.filter((row) => row.glass).slice(0, 8) : listed;
}

export async function listSlips(user: User, filters: { q?: string; kind?: string; page?: number }) {
  assertAny(user, ["inventory.view"]);
  const q = filters.q?.trim();
  const page = Math.max(1, filters.page || 1);
  const where: Prisma.StockSlipWhereInput = {
    ...(filters.kind && isStockSlipKind(filters.kind) ? { kind: filters.kind } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { slipNo: { contains: q, mode: "insensitive" } },
            { partner: { code: { contains: q, mode: "insensitive" } } },
            { project: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.stockSlip.count({ where }),
    prisma.stockSlip.findMany({
      where,
      include: { partner: { select: { code: true, name: true } }, project: { select: { code: true, name: true } }, _count: { select: { lines: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return {
    total,
    page,
    pageSize,
    rows: rows.map((row) => ({
      id: row.id,
      code: row.code,
      kind: row.kind,
      status: row.status,
      slipNo: row.slipNo,
      partnerName: partyName(row.partner),
      projectName: partyName(row.project),
      lineCount: row._count.lines,
      when: formatWhen(row.createdAt),
    })),
  };
}

export async function listBalances(user: User, filters: { q?: string; place?: string; includeClosed?: boolean }) {
  assertAny(user, ["inventory.view"]);
  const [inbound, outbound] = await Promise.all([
    prisma.stockMove.groupBy({ by: ["materialId", "placeKind", "placeRef"], where: { direction: "vao" }, _sum: { qty: true } }),
    prisma.stockMove.groupBy({ by: ["materialId", "placeKind", "placeRef"], where: { direction: "ra" }, _sum: { qty: true } }),
  ]);
  const totals = new Map<string, { materialId: string; placeKind: string; placeRef: string; qty: number }>();
  for (const row of inbound) {
    const key = `${row.materialId}|${row.placeKind}|${row.placeRef}`;
    totals.set(key, { materialId: row.materialId, placeKind: row.placeKind, placeRef: row.placeRef, qty: row._sum.qty ?? 0 });
  }
  for (const row of outbound) {
    const key = `${row.materialId}|${row.placeKind}|${row.placeRef}`;
    const current = totals.get(key) ?? { materialId: row.materialId, placeKind: row.placeKind, placeRef: row.placeRef, qty: 0 };
    current.qty -= row._sum.qty ?? 0;
    totals.set(key, current);
  }
  const q = filters.q?.trim().toLocaleLowerCase("vi");
  let rows = [...totals.values()].filter((row) => row.qty !== 0);
  if (!filters.includeClosed) rows = rows.filter((row) => row.placeKind !== "da_lap" && row.placeKind !== "hong");
  if (filters.place && isMovablePlace(filters.place)) rows = rows.filter((row) => row.placeKind === filters.place);
  const materialIds = [...new Set(rows.map((row) => row.materialId))];
  const projectIds = rows.flatMap((row) => projectRef(row.placeKind, row.placeRef));
  const partnerIds = rows.flatMap((row) => partnerRef(row.placeKind, row.placeRef));
  const [materials, projects, partners] = await Promise.all([
    prisma.material.findMany({ where: { id: { in: materialIds } }, select: { id: true, code: true, name: true, stockUnit: true } }),
    prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, code: true, name: true } }),
    prisma.partner.findMany({ where: { id: { in: partnerIds } }, select: { id: true, code: true, name: true } }),
  ]);
  const materialMap = new Map(materials.map((row) => [row.id, row]));
  const projectMap = new Map(projects.map((row) => [row.id, partyName(row)]));
  const partnerMap = new Map(partners.map((row) => [row.id, partyName(row)]));
  const listed = rows
    .map((row) => {
      const material = materialMap.get(row.materialId);
      if (!material) return null;
      return {
        materialId: row.materialId,
        code: material.code,
        name: material.name,
        unit: material.stockUnit,
        placeKind: row.placeKind,
        placeLabel: placeText(row.placeKind, row.placeRef, projectMap, partnerMap),
        qty: row.qty,
      };
    })
    .filter((row) => row !== null)
    .filter((row) => !q || `${row.code} ${row.name}`.toLocaleLowerCase("vi").includes(q))
    .sort((a, b) => a.code.localeCompare(b.code, "vi") || a.placeLabel.localeCompare(b.placeLabel, "vi"));
  return { total: listed.length, rows: listed };
}

export async function getSlip(user: User, id: string) {
  assertAny(user, ["inventory.view"]);
  const row = await prisma.stockSlip.findUnique({ where: { id }, include: slipInclude });
  if (!row) throw new AppError("Không tìm thấy phiếu.", 404);
  const files = await prisma.attachment.findMany({
    where: { entityType: "phieu_kho", entityId: id },
    select: { id: true, fileName: true },
    orderBy: { createdAt: "asc" },
  });
  return presentSlip(row, files);
}

export async function createSlip(user: User, input: SlipInput, now = new Date()) {
  assertAny(user, ["inventory.create"]);
  const data = clean(input);
  await assertRefs(data);
  await settleLines(data);
  return prisma.$transaction(async (tx) => {
    const code = await nextCode(tx, "PK", now);
    const row = await tx.stockSlip.create({
      data: {
        code,
        kind: data.kind,
        slipNo: data.slipNo,
        partnerId: data.partnerId,
        projectId: data.projectId,
        fromKind: data.fromKind,
        fromRef: data.fromRef,
        toKind: data.toKind,
        toRef: data.toRef,
        reason: data.reason,
        note: data.note,
        lines: { create: lineData(data.lines) },
      },
    });
    await writeAudit(tx, user.id, "tao", "phieu_kho", row.id, `Tạo phiếu ${code}`);
    return row;
  });
}

export async function updateSlip(user: User, id: string, input: SlipInput) {
  assertAny(user, ["inventory.update", "inventory.create"]);
  const current = await prisma.stockSlip.findUnique({ where: { id } });
  if (!current) throw new AppError("Không tìm thấy phiếu.", 404);
  if (current.status !== "nhap") throw new AppError("Phiếu đã ghi sổ, không sửa. Lập phiếu khác nếu cần điều chỉnh.", 400);
  if (current.revision !== input.revision) throw new AppError("Phiếu vừa được cập nhật. Hãy tải lại.", 409);
  const data = clean(input);
  await assertRefs(data);
  await settleLines(data);
  await prisma.$transaction(async (tx) => {
    const updated = await tx.stockSlip.updateMany({
      where: { id, revision: current.revision, status: "nhap" },
      data: {
        kind: data.kind,
        slipNo: data.slipNo,
        partnerId: data.partnerId,
        projectId: data.projectId,
        fromKind: data.fromKind,
        fromRef: data.fromRef,
        toKind: data.toKind,
        toRef: data.toRef,
        reason: data.reason,
        note: data.note,
        revision: { increment: 1 },
      },
    });
    if (updated.count === 0) throw new AppError("Phiếu vừa được cập nhật. Hãy tải lại.", 409);
    await tx.stockSlipLine.deleteMany({ where: { slipId: id } });
    await tx.stockSlipLine.createMany({ data: lineData(data.lines).map((line) => ({ ...line, slipId: id })) });
    await writeAudit(tx, user.id, "sua", "phieu_kho", id, `Cập nhật ${current.code}`);
  });
  return prisma.stockSlip.findUniqueOrThrow({ where: { id } });
}

async function onHand(tx: Prisma.TransactionClient, materialId: string, placeKind: string, placeRef: string) {
  const rows = await tx.stockMove.groupBy({
    by: ["direction"],
    where: { materialId, placeKind, placeRef },
    _sum: { qty: true },
  });
  const inbound = rows.find((row) => row.direction === "vao")?._sum.qty ?? 0;
  const outbound = rows.find((row) => row.direction === "ra")?._sum.qty ?? 0;
  return inbound - outbound;
}

function projectRef(kind: string, ref: string) {
  if (!ref) return [];
  if (kind === "ncc" && ref.includes("|")) return [ref.split("|")[0]].filter(Boolean);
  if (kind === "cong_trinh" || kind === "dang_giao" || kind === "da_lap" || kind === "da_dat" || kind === "da_san_xuat" || kind === "hong") return [ref];
  return [];
}

function partnerRef(kind: string, ref: string) {
  if (!ref) return [];
  if (kind === "ncc" && ref.includes("|")) return [ref.split("|")[1]].filter(Boolean);
  if (kind === "ncc" || kind === "xuong") return [ref];
  return [];
}

function glassMovePlace(state: string, projectId: string, partnerId: string) {
  if (state === "da_giao") return { kind: "cong_trinh", ref: projectId };
  if (state === "vo") return { kind: "hong", ref: projectId };
  if (state === "ncc") return { kind: "ncc", ref: `${projectId}|${partnerId}` };
  if (state === "da_lap") return { kind: "da_lap", ref: projectId };
  return { kind: state, ref: projectId };
}

async function assertGlassSlip(data: { kind: string; slipNo: string; partnerId: string | null }, exceptId?: string) {
  if (data.kind !== "kinh" || !data.slipNo || !data.partnerId) return;
  const dup = await prisma.stockSlip.findFirst({
    where: {
      kind: "kinh",
      partnerId: data.partnerId,
      slipNo: data.slipNo,
      status: "da_ghi",
      ...(exceptId ? { NOT: { id: exceptId } } : {}),
    },
    select: { code: true },
  });
  if (dup) throw new AppError(`Số phiếu ${data.slipNo} đã có trên ${dup.code} của nhà cung cấp này.`, 400);
}

export async function postSlip(user: User, id: string) {
  assertAny(user, ["inventory.update", "inventory.create"]);
  const current = await prisma.stockSlip.findUnique({ where: { id }, include: { lines: true } });
  if (!current) throw new AppError("Không tìm thấy phiếu.", 404);
  if (current.status !== "nhap") throw new AppError("Phiếu đã ghi sổ.", 400);
  if (!current.lines.some((line) => line.receivedQty > 0 || line.receiveState === "tam_nhap")) {
    throw new AppError("Cần số lượng thực nhận, hoặc kg hóa đơn nếu tạm nhập.", 400);
  }
  if (current.kind === "kinh") await assertGlassSlip(current);
  await prisma.$transaction(async (tx) => {
    const fresh = await tx.stockSlip.updateMany({ where: { id, status: "nhap" }, data: { status: "da_ghi", postedAt: new Date() } });
    if (fresh.count === 0) throw new AppError("Phiếu đã ghi sổ.", 400);
    const outbound = new Map<string, { materialId: string; placeKind: string; placeRef: string; qty: number }>();
    const moves: Prisma.StockMoveCreateManyInput[] = [];
    for (const line of current.lines) {
      if (line.receivedQty <= 0) continue;
      const add = (direction: string, placeKind: string, placeRef: string) => {
        moves.push({ slipId: id, lineId: line.id, materialId: line.materialId, placeKind, placeRef, direction, qty: line.receivedQty });
        if (direction === "ra") {
          const key = `${line.materialId}|${placeKind}|${placeRef}`;
          const row = outbound.get(key) ?? { materialId: line.materialId, placeKind, placeRef, qty: 0 };
          row.qty += line.receivedQty;
          outbound.set(key, row);
        }
      };
      if (current.kind === "kinh") {
        const fromPlace = current.fromKind ? glassMovePlace(current.fromKind, current.projectId ?? "", current.partnerId ?? "") : null;
        const toPlace = glassMovePlace(current.toKind, current.projectId ?? "", current.partnerId ?? "");
        if (fromPlace) add("ra", fromPlace.kind, fromPlace.ref);
        add("vao", toPlace.kind, toPlace.ref);
      } else {
        if (current.fromKind) add("ra", current.fromKind, current.fromRef);
        add("vao", current.toKind, current.toRef);
      }
    }
    for (const row of outbound.values()) {
      const have = await onHand(tx, row.materialId, row.placeKind, row.placeRef);
      if (have < row.qty) {
        const material = await tx.material.findUnique({ where: { id: row.materialId }, select: { code: true } });
        throw new AppError(`Không đủ tồn ${material?.code ?? "vật tư"} tại ${stockPlaceLabel(row.placeKind)}. Đang có ${formatStockQty(have)}.`, 400);
      }
    }
    if (moves.length) await tx.stockMove.createMany({ data: moves });
    await writeAudit(tx, user.id, "ghi_so", "phieu_kho", id, `Ghi sổ ${current.code}`);
  });
}

export async function deleteSlip(user: User, id: string) {
  assertAny(user, ["inventory.update", "inventory.create"]);
  const current = await prisma.stockSlip.findUnique({ where: { id } });
  if (!current) throw new AppError("Không tìm thấy phiếu.", 404);
  if (current.status !== "nhap") throw new AppError("Phiếu đã ghi sổ, không xóa.", 400);
  await prisma.$transaction(async (tx) => {
    await writeAudit(tx, user.id, "xoa", "phieu_kho", id, `Xóa phiếu ${current.code}`);
    await tx.stockSlip.delete({ where: { id } });
  });
}

export async function listPendingKg(user: User) {
  assertAny(user, ["inventory.view"]);
  const rows = await prisma.stockSlipLine.findMany({
    where: { receiveState: "tam_nhap", slip: { status: "da_ghi" } },
    include: {
      material: { select: { code: true, name: true, stockUnit: true } },
      slip: { select: { id: true, code: true, createdAt: true } },
    },
    orderBy: { slip: { createdAt: "desc" } },
    take: 20,
  });
  return rows.map((row) => ({
    lineId: row.id,
    slipId: row.slip.id,
    slipCode: row.slip.code,
    code: row.material.code,
    name: row.material.name,
    unit: row.material.stockUnit,
    invoiceGrams: row.invoiceGrams,
    barCount: row.barCount,
    when: formatWhen(row.slip.createdAt),
  }));
}

export async function confirmKgLine(
  user: User,
  slipId: string,
  lineId: string,
  input: { barCount?: unknown; lengthM?: unknown; weighedKg?: unknown },
) {
  assertAny(user, ["inventory.update", "inventory.create"]);
  const slip = await prisma.stockSlip.findUnique({
    where: { id: slipId },
    include: { lines: { include: { material: true } } },
  });
  if (!slip) throw new AppError("Không tìm thấy phiếu.", 404);
  if (slip.status !== "da_ghi") throw new AppError("Chỉ xác nhận trên phiếu đã ghi sổ.", 400);
  const line = slip.lines.find((item) => item.id === lineId);
  if (!line || line.receiveState !== "tam_nhap") throw new AppError("Dòng này không đang chờ phiếu.", 400);
  if (line.material.priceBasis !== "kg") throw new AppError("Dòng này không tính theo kg.", 400);
  const bars = qtyOf(input.barCount, "Số thanh");
  const lengthRaw = String(input.lengthM ?? "").trim();
  const lengthMm = lengthRaw ? qtyOf(input.lengthM, "Chiều dài thanh") : line.lengthMm ?? line.material.barLengthMm;
  const weighed = qtyOf(input.weighedKg, "Kg cân");
  if (line.material.stockUnit === "kg" && weighed <= 0) throw new AppError(`${line.material.code} cần kg cân khi đã có phiếu.`, 400);
  if (line.material.stockUnit !== "kg" && bars <= 0) throw new AppError(`${line.material.code} cần số thanh khi đã có phiếu.`, 400);
  const theory = theoryGrams(bars || line.barCount, lengthMm, line.material.gramsPerMeter, line.material.gramsPerBar);
  const receivedQty = line.material.stockUnit === "kg" ? weighed : bars;
  await prisma.$transaction(async (tx) => {
    const updated = await tx.stockSlipLine.updateMany({
      where: { id: lineId, receiveState: "tam_nhap" },
      data: {
        receiveState: "da_xac_nhan",
        barCount: bars || line.barCount,
        lengthMm,
        weighedGrams: weighed || line.weighedGrams,
        theoryGrams: theory,
        receivedQty,
        documentQty: line.material.stockUnit === "kg" ? line.invoiceGrams : bars || line.barCount,
      },
    });
    if (updated.count === 0) throw new AppError("Dòng này đã được xác nhận.", 400);
    const moves: Prisma.StockMoveCreateManyInput[] = [];
    const push = (direction: string, placeKind: string, placeRef: string) => {
      moves.push({ slipId, lineId, materialId: line.materialId, placeKind, placeRef, direction, qty: receivedQty });
    };
    if (slip.fromKind) {
      const have = await onHand(tx, line.materialId, slip.fromKind, slip.fromRef);
      if (have < receivedQty) throw new AppError(`Không đủ tồn ${line.material.code} tại ${stockPlaceLabel(slip.fromKind)}.`, 400);
      push("ra", slip.fromKind, slip.fromRef);
    }
    push("vao", slip.toKind, slip.toRef);
    await tx.stockMove.createMany({ data: moves });
    await writeAudit(tx, user.id, "xac_nhan", "phieu_kho", slipId, `Xác nhận nhận ${line.material.code} trên ${slip.code}`);
  });
}

function ngayPhieu(value: Date | null) {
  if (!value) return "";
  const shifted = new Date(value.getTime() + 7 * 60 * 60 * 1000);
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${shifted.getUTCFullYear()}`;
}

// Tồn của một công trình, gom theo mã. Không cộng lẫn đơn vị.
export async function listMaterialsAtProject(projectId: string) {
  const moves = await prisma.stockMove.findMany({
    where: {
      OR: [
        { placeKind: { in: ["cong_trinh", "da_lap", "hong", "da_dat", "da_san_xuat", "dang_giao"] }, placeRef: projectId },
        { placeKind: "ncc", placeRef: { startsWith: `${projectId}|` } },
        { placeKind: "xuong", placeRef: projectId },
      ],
    },
    select: {
      slipId: true,
      materialId: true,
      placeKind: true,
      direction: true,
      qty: true,
      material: { select: { code: true, name: true, stockUnit: true } },
    },
  });
  type Bucket = {
    materialId: string;
    code: string;
    name: string;
    unit: string;
    glass: boolean;
    site: number;
    installed: number;
    broken: number;
    ordered: number;
    made: number;
    held: number;
    shipping: number;
    slipIds: Set<string>;
  };
  const rows = new Map<string, Bucket>();
  for (const move of moves) {
    const row = rows.get(move.materialId) ?? {
      materialId: move.materialId,
      code: move.material.code,
      name: move.material.name,
      unit: move.material.stockUnit,
      glass: isGlassMaterial(move.material),
      site: 0,
      installed: 0,
      broken: 0,
      ordered: 0,
      made: 0,
      held: 0,
      shipping: 0,
      slipIds: new Set<string>(),
    };
    const delta = move.direction === "ra" ? -move.qty : move.qty;
    if (move.placeKind === "cong_trinh") row.site += delta;
    else if (move.placeKind === "da_lap") row.installed += delta;
    else if (move.placeKind === "hong") row.broken += delta;
    else if (move.placeKind === "da_dat") row.ordered += delta;
    else if (move.placeKind === "da_san_xuat") row.made += delta;
    else if (move.placeKind === "ncc" || move.placeKind === "xuong") row.held += delta;
    else if (move.placeKind === "dang_giao") row.shipping += delta;
    row.slipIds.add(move.slipId);
    rows.set(move.materialId, row);
  }
  const slipIds = [...new Set(moves.map((move) => move.slipId))];
  const slips = slipIds.length
    ? await prisma.stockSlip.findMany({
        where: { id: { in: slipIds }, status: { in: ["da_ghi", "da_nhan", "cho_nhan"] } },
        include: {
          partner: { select: { code: true, name: true } },
          lines: { select: { materialId: true, documentQty: true, receivedQty: true } },
        },
        orderBy: { postedAt: "desc" },
      })
    : [];
  const listed = [...rows.values()]
    .filter((row) => row.site > 0 || row.installed > 0 || row.broken > 0 || row.ordered > 0 || row.made > 0 || row.held > 0 || row.shipping > 0)
    .sort((a, b) => a.code.localeCompare(b.code, "vi"));
  const materials = listed.map((row) => {
    const slipRows = slips.flatMap((slip) => {
      if (!row.slipIds.has(slip.id)) return [];
      const lines = slip.lines.filter((line) => line.materialId === row.materialId);
      if (!lines.length) return [];
      const documentQty = lines.reduce((sum, line) => sum + line.documentQty, 0);
      const receivedQty = lines.reduce((sum, line) => sum + line.receivedQty, 0);
      return [{
        id: slip.id,
        code: slip.code,
        kindLabel: stockSlipKindLabel(slip.kind),
        postedOn: ngayPhieu(slip.postedAt ?? slip.createdAt),
        partnerName: slip.partner?.name.trim() || slip.partner?.code || "",
        documentQty,
        receivedQty,
        mismatch: slip.status === "da_nhan" && documentQty !== receivedQty,
      }];
    });
    return {
      materialId: row.materialId,
      code: row.code,
      name: row.name,
      unit: row.unit,
      glass: row.glass,
      site: row.site,
      installed: row.installed,
      broken: row.broken,
      ordered: row.ordered,
      made: row.made,
      held: row.held,
      shipping: row.shipping,
      mismatch: slipRows.some((slip) => slip.mismatch),
      slips: slipRows,
    };
  });
  const count = (pick: (row: (typeof materials)[number]) => number) => materials.filter((row) => pick(row) > 0).length;
  return {
    materials,
    counts: {
      site: count((row) => row.site),
      installed: count((row) => row.installed),
      broken: count((row) => row.broken),
      away: count((row) => row.ordered + row.made + row.held + row.shipping),
    },
  };
}
