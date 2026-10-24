import type { User } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { writeAudit } from "@/modules/system/audit";
import { assertAny, assertOwn, listOwner } from "@/modules/system/access";
import { parseQuantityMilli } from "@/modules/projects/item-fields";
import { nextCode } from "@/modules/system/codes";

const gate = ["installation.view"] as const;

export type SupplyLineInput = {
  name?: string;
  unit?: string;
  quantity?: string;
  note?: string;
  materialId?: string;
  materialCode?: string;
};

function cleanDate(value: string) {
  const text = value.trim();
  if (!text) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new AppError("Ngày cần hàng không hợp lệ.", 400);
  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new AppError("Ngày cần hàng không hợp lệ.", 400);
  }
  return text;
}

function quantityMilli(value: string | undefined) {
  const raw = (value ?? "").trim().replace(",", ".");
  if (!raw) throw new AppError("Cần số lượng.", 400);
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) throw new AppError("Số lượng phải lớn hơn 0.", 400);
  const milli = Math.round(amount * 1000);
  if (milli <= 0 || milli > 1_000_000_000) throw new AppError("Số lượng không hợp lệ.", 400);
  return milli;
}

function present(row: {
  id: string;
  code: string;
  neededOn: string;
  note: string;
  status: string;
  requesterId: string;
  createdAt: Date;
  project: { id: string; code: string; name: string };
  lines: { name: string; unit: string; quantityMilli: number; note: string; materialCode: string }[];
}) {
  return {
    id: row.id,
    code: row.code,
    neededOn: row.neededOn,
    note: row.note,
    status: row.status,
    requesterId: row.requesterId,
    createdAt: row.createdAt.toISOString(),
    projectId: row.project.id,
    projectCode: row.project.code,
    projectName: row.project.name,
    lines: row.lines.map((line) => ({
      name: line.name,
      unit: line.unit,
      quantityMilli: line.quantityMilli,
      note: line.note,
      materialCode: line.materialCode,
    })),
  };
}

export async function listFieldProjects(user: User) {
  assertAny(user, [...gate]);
  const owner = listOwner(user, "projects.view", "projects.view.assigned");
  const rows = await prisma.project.findMany({
    where: owner ? { ownerId: owner } : {},
    select: { id: true, code: true, name: true, location: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows;
}

export async function listSupplyRequests(user: User) {
  assertAny(user, [...gate]);
  const owner = listOwner(user, "projects.view", "projects.view.assigned");
  const rows = await prisma.fieldSupplyRequest.findMany({
    where: owner ? { project: { ownerId: owner } } : {},
    include: {
      project: { select: { id: true, code: true, name: true } },
      lines: { orderBy: { sortOrder: "asc" }, select: { name: true, unit: true, quantityMilli: true, note: true, materialCode: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return rows.map(present);
}

export async function searchFieldMaterials(user: User, q: string) {
  assertAny(user, [...gate]);
  const text = q.trim();
  if (text.length < 2) return [];
  const rows = await prisma.material.findMany({
    where: {
      OR: [
        { code: { contains: text, mode: "insensitive" } },
        { name: { contains: text, mode: "insensitive" } },
        { color: { contains: text, mode: "insensitive" } },
      ],
    },
    select: { id: true, code: true, name: true, stockUnit: true, color: true },
    orderBy: { code: "asc" },
    take: 8,
  });
  return rows.map((row) => ({ id: row.id, code: row.code, name: row.name, unit: row.stockUnit, color: row.color }));
}

export async function createSupplyRequest(
  user: User,
  input: { projectId: string; neededOn?: string; note?: string; lines: SupplyLineInput[] },
  now = new Date(),
) {
  assertAny(user, [...gate]);
  const project = await prisma.project.findUnique({ where: { id: input.projectId }, select: { id: true, code: true, ownerId: true } });
  if (!project) throw new AppError("Không tìm thấy công trình.", 404);
  assertOwn(user, "projects.view", "projects.view.assigned", project.ownerId);
  const lines = input.lines ?? [];
  if (lines.length === 0) throw new AppError("Cần ít nhất một dòng vật tư.", 400);
  if (lines.length > 30) throw new AppError("Một phiếu tối đa 30 dòng.", 400);
  const neededOn = cleanDate(input.neededOn ?? "");
  const note = (input.note ?? "").trim();
  if (note.length > 500) throw new AppError("Ghi chú tối đa 500 ký tự.", 400);
  const materialIds = [...new Set(lines.map((line) => (line.materialId ?? "").trim()).filter(Boolean))];
  const materials = materialIds.length
    ? await prisma.material.findMany({ where: { id: { in: materialIds } }, select: { id: true, code: true, name: true, stockUnit: true } })
    : [];
  const byId = new Map(materials.map((row) => [row.id, row]));
  const dataLines = lines.map((line, index) => {
    const material = byId.get((line.materialId ?? "").trim());
    const name = (material?.name || line.name || "").trim();
    const unit = (material?.stockUnit || line.unit || "").trim();
    const lineNote = (line.note ?? "").trim();
    if (!name) throw new AppError("Cần tên vật tư.", 400);
    if (name.length > 120) throw new AppError("Tên vật tư tối đa 120 ký tự.", 400);
    if (!unit) throw new AppError("Cần đơn vị tính.", 400);
    if (unit.length > 20) throw new AppError("Đơn vị tính tối đa 20 ký tự.", 400);
    if (lineNote.length > 200) throw new AppError("Ghi chú dòng tối đa 200 ký tự.", 400);
    if ((line.materialId ?? "").trim() && !material) throw new AppError("Không tìm thấy vật tư trong danh mục.", 400);
    return {
      sortOrder: index + 1,
      materialId: material?.id ?? "",
      materialCode: material?.code ?? "",
      name,
      unit,
      quantityMilli: quantityMilli(line.quantity),
      note: lineNote,
    };
  });
  return prisma.$transaction(async (tx) => {
    const code = await nextCode(tx, "YC", now);
    const row = await tx.fieldSupplyRequest.create({
      data: {
        code,
        projectId: project.id,
        requesterId: user.id,
        neededOn,
        note,
        lines: { create: dataLines },
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        lines: { orderBy: { sortOrder: "asc" }, select: { name: true, unit: true, quantityMilli: true, note: true, materialCode: true } },
      },
    });
    await writeAudit(tx, user.id, "tao", "yeu_cau_vat_tu", row.id, `Gửi yêu cầu vật tư ${code}`);
    return present(row);
  });
}

export async function cancelSupplyRequest(user: User, id: string) {
  assertAny(user, [...gate]);
  const current = await prisma.fieldSupplyRequest.findUnique({
    where: { id },
    include: { project: { select: { ownerId: true } } },
  });
  if (!current) throw new AppError("Không tìm thấy phiếu yêu cầu.", 404);
  assertOwn(user, "projects.view", "projects.view.assigned", current.project.ownerId);
  if (current.requesterId !== user.id) throw new AppError("Chỉ người gửi phiếu được hủy.", 400);
  if (current.status !== "da_gui") throw new AppError("Phiếu đã được xử lý nên không hủy được.", 400);
  await prisma.$transaction(async (tx) => {
    await tx.fieldSupplyRequest.delete({ where: { id } });
    await writeAudit(tx, user.id, "xoa", "yeu_cau_vat_tu", id, `Hủy yêu cầu vật tư ${current.code}`);
  });
}

function reportDate(value: string) {
  const text = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new AppError("Ngày báo cáo không hợp lệ.", 400);
  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new AppError("Ngày báo cáo không hợp lệ.", 400);
  }
  return text;
}

async function visibleProject(user: User, projectId: string) {
  assertAny(user, [...gate]);
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, code: true, name: true, ownerId: true } });
  if (!project) throw new AppError("Không tìm thấy công trình.", 404);
  assertOwn(user, "projects.view", "projects.view.assigned", project.ownerId);
  return project;
}

export async function listProgressItems(user: User, projectId: string) {
  const project = await visibleProject(user, projectId);
  const items = await prisma.projectItem.findMany({
    where: { projectId: project.id },
    orderBy: { sortOrder: "asc" },
    select: { id: true, sortOrder: true, name: true, spec: true, unit: true, quantityMilli: true },
  });
  const history = items.length
    ? await prisma.fieldProgressLine.findMany({
        where: { itemId: { in: items.map((item) => item.id) }, report: { projectId: project.id } },
        orderBy: { report: { createdAt: "desc" } },
        select: { itemId: true, doneMilli: true, report: { select: { reportedOn: true } } },
      })
    : [];
  const latest = new Map<string, { doneMilli: number; reportedOn: string }>();
  for (const line of history) {
    if (!latest.has(line.itemId)) latest.set(line.itemId, { doneMilli: line.doneMilli, reportedOn: line.report.reportedOn });
  }
  return {
    projectId: project.id,
    projectCode: project.code,
    projectName: project.name,
    items: items.map((item) => ({
      id: item.id,
      sortOrder: item.sortOrder,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
      plannedMilli: item.quantityMilli,
      lastDoneMilli: latest.get(item.id)?.doneMilli ?? null,
      lastReportedOn: latest.get(item.id)?.reportedOn ?? "",
    })),
  };
}

export async function listProgressReports(user: User) {
  assertAny(user, [...gate]);
  const owner = listOwner(user, "projects.view", "projects.view.assigned");
  const rows = await prisma.fieldProgressReport.findMany({
    where: owner ? { project: { ownerId: owner } } : {},
    include: {
      project: { select: { code: true, name: true } },
      lines: { orderBy: { sortOrder: "asc" }, select: { name: true, unit: true, plannedMilli: true, doneMilli: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    reportedOn: row.reportedOn,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    reporterId: row.reporterId,
    projectCode: row.project.code,
    projectName: row.project.name,
    lines: row.lines,
  }));
}

export async function createProgressReport(
  user: User,
  input: { projectId: string; reportedOn?: string; note?: string; lines: { itemId?: string; quantity?: string; note?: string }[] },
  now = new Date(),
) {
  const project = await visibleProject(user, input.projectId);
  const rawLines = input.lines ?? [];
  if (rawLines.length === 0) throw new AppError("Cần ghi tiến độ ít nhất một hạng mục.", 400);
  if (rawLines.length > 200) throw new AppError("Một báo cáo tối đa 200 hạng mục.", 400);
  const reportedOn = reportDate(input.reportedOn ?? "");
  const note = (input.note ?? "").trim();
  if (note.length > 500) throw new AppError("Ghi chú tối đa 500 ký tự.", 400);
  const ids = rawLines.map((line) => (line.itemId ?? "").trim());
  if (new Set(ids).size !== ids.length) throw new AppError("Hạng mục bị chọn trùng.", 400);
  const items = await prisma.projectItem.findMany({
    where: { id: { in: ids }, projectId: project.id },
    select: { id: true, sortOrder: true, name: true, spec: true, unit: true, quantityMilli: true },
  });
  const byId = new Map(items.map((item) => [item.id, item]));
  const dataLines = rawLines.map((line) => {
    const item = byId.get((line.itemId ?? "").trim());
    if (!item) throw new AppError("Hạng mục không thuộc công trình này.", 400);
    const lineNote = (line.note ?? "").trim();
    if (lineNote.length > 200) throw new AppError("Ghi chú hạng mục tối đa 200 ký tự.", 400);
    const doneMilli = parseQuantityMilli(line.quantity);
    if (doneMilli > 1_000_000_000) throw new AppError("Khối lượng đã làm quá lớn.", 400);
    return {
      itemId: item.id,
      sortOrder: item.sortOrder,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
      plannedMilli: item.quantityMilli,
      doneMilli,
      note: lineNote,
    };
  });
  return prisma.$transaction(async (tx) => {
    const code = await nextCode(tx, "TD", now);
    const row = await tx.fieldProgressReport.create({
      data: {
        code,
        projectId: project.id,
        reporterId: user.id,
        reportedOn,
        note,
        lines: { create: dataLines },
      },
      include: {
        project: { select: { code: true, name: true } },
        lines: { orderBy: { sortOrder: "asc" }, select: { name: true, unit: true, plannedMilli: true, doneMilli: true } },
      },
    });
    await writeAudit(tx, user.id, "tao", "bao_cao_tien_do", row.id, `Báo cáo tiến độ ${code}`);
    return {
      id: row.id,
      code: row.code,
      reportedOn: row.reportedOn,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
      reporterId: row.reporterId,
      projectCode: row.project.code,
      projectName: row.project.name,
      lines: row.lines,
    };
  });
}

export async function cancelProgressReport(user: User, id: string) {
  assertAny(user, [...gate]);
  const current = await prisma.fieldProgressReport.findUnique({
    where: { id },
    include: { project: { select: { ownerId: true } } },
  });
  if (!current) throw new AppError("Không tìm thấy báo cáo.", 404);
  assertOwn(user, "projects.view", "projects.view.assigned", current.project.ownerId);
  if (current.reporterId !== user.id) throw new AppError("Chỉ người gửi báo cáo được hủy.", 400);
  await prisma.$transaction(async (tx) => {
    await tx.fieldProgressReport.delete({ where: { id } });
    await writeAudit(tx, user.id, "xoa", "bao_cao_tien_do", id, `Hủy báo cáo tiến độ ${current.code}`);
  });
}
