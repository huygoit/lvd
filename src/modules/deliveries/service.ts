// Giao từ đơn đã lưu: chưa trừ kho, chờ công trình xác nhận mới vào đang ở công trình.
// Giao từ kho: trừ kho ngay, chuyển sang đang giao, xác nhận rồi mới vào công trình.
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import type { User } from "@/shared/auth/types";
import { hasAnyCapability, hasCapability } from "@/shared/auth/types";
import { isGlassMaterial } from "@/shared/catalog/materials";
import { formatStockQty } from "@/shared/catalog/stock";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { writeAudit } from "@/modules/system/audit";
import { assertAny, assertOwn } from "@/modules/system/access";
import { nextCode } from "@/modules/system/codes";

const photoRoot = path.join(process.cwd(), "storage", "giao-hang");

type ProjectCard = { id: string; code: string; name: string; ownerId: string };

type DraftLine = {
  materialId: string;
  documentQty: number;
  receivedQty: number;
  note: string;
  lengthMm: number | null;
  barCount: number;
  sortOrder: number;
};

function assertSee(user: User, ownerId: string) {
  if (hasCapability(user, "settings.manage") || hasCapability(user, "projects.view")) return;
  if (ownerId === user.id) return;
  throw new AppError("Bạn không có quyền xem phiếu giao này.", 403);
}

function assertConfirm(user: User, ownerId: string) {
  if (ownerId === user.id) return;
  if (hasCapability(user, "orders.confirm") && hasCapability(user, "projects.view")) return;
  throw new AppError("Bạn không có quyền xác nhận phiếu này.", 403);
}

function listWhere(user: User): Prisma.StockSlipWhereInput {
  if (hasCapability(user, "projects.view") || hasCapability(user, "settings.manage")) return { kind: "giao_hang" };
  return { kind: "giao_hang", project: { ownerId: user.id } };
}

function positiveMilli(value: unknown) {
  const raw = String(value ?? "").trim().replace(",", ".");
  const amount = Number(raw);
  if (!raw || !Number.isFinite(amount) || amount <= 0) throw new AppError("Số lượng phải lớn hơn 0.", 400);
  const qty = Math.round(amount * 1000);
  if (qty <= 0 || qty > 1_000_000_000) throw new AppError("Số lượng không hợp lệ.", 400);
  return qty;
}

function receivedMilli(value: unknown) {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) return 0;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) throw new AppError("Số lượng thực nhận không hợp lệ.", 400);
  const qty = Math.round(amount * 1000);
  if (qty > 1_000_000_000) throw new AppError("Số lượng thực nhận không hợp lệ.", 400);
  return qty;
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

async function accounts(tx: Prisma.TransactionClient) {
  return tx.loginAccount.findMany({
    where: { active: true, staff: { active: true } },
    select: {
      id: true,
      staff: { select: { roleLinks: { select: { role: { select: { active: true, capabilities: true } } } } } },
    },
  });
}

function capsOf(row: Awaited<ReturnType<typeof accounts>>[number]) {
  return row.staff.roleLinks.filter((link) => link.role.active).flatMap((link) => link.role.capabilities);
}

async function notify(tx: Prisma.TransactionClient, userIds: string[], notice: { title: string; body: string; href: string; kind: string }) {
  const ids = [...new Set(userIds)];
  if (!ids.length) return;
  await tx.notice.createMany({ data: ids.map((userId) => ({ userId, ...notice })) });
}

function sourceLabel(fromKind: string, orderCode: string) {
  if (fromKind === "kho") return "Từ kho công ty";
  if (orderCode) return `Theo đơn ${orderCode}`;
  return "Giao thẳng từ nhà cung cấp";
}

const slipInclude = {
  project: { select: { id: true, code: true, name: true, ownerId: true } },
  order: { select: { code: true } },
  lines: {
    orderBy: { sortOrder: "asc" as const },
    include: { material: { select: { code: true, name: true, stockUnit: true } } },
  },
  photos: { orderBy: { createdAt: "asc" as const }, select: { id: true } },
};

function presentSlip(slip: Prisma.StockSlipGetPayload<{ include: typeof slipInclude }>) {
  return {
    id: slip.id,
    code: slip.code,
    status: slip.status,
    projectCode: slip.project?.code ?? "",
    projectName: slip.project?.name ?? "",
    sourceLabel: sourceLabel(slip.fromKind, slip.order?.code ?? ""),
    createdAt: slip.createdAt.toISOString(),
    lines: slip.lines.map((line) => ({
      id: line.id,
      code: line.material.code,
      name: line.material.name,
      unit: line.note || line.material.stockUnit,
      lengthMm: line.lengthMm ?? 0,
      documentQty: line.documentQty,
      receivedQty: line.receivedQty,
    })),
    photos: slip.photos.map((photo) => ({ id: photo.id, url: `/api/hien-truong/giao/${slip.id}/anh/${photo.id}` })),
  };
}

async function createDelivery(
  user: User,
  input: { project: ProjectCard; orderId: string | null; partnerId: string | null; fromKind: string; lines: DraftLine[]; moveFromKho: boolean },
) {
  const slip = await prisma.$transaction(async (tx) => {
    if (input.moveFromKho) {
      for (const line of input.lines) {
        const have = await onHand(tx, line.materialId, "kho", "");
        if (have < line.documentQty) {
          const material = await tx.material.findUnique({ where: { id: line.materialId }, select: { code: true } });
          throw new AppError(`Không đủ ${material?.code ?? "vật tư"} trong kho. Đang có ${formatStockQty(have)}.`, 400);
        }
      }
    }
    const code = await nextCode(tx, "GH", new Date());
    const created = await tx.stockSlip.create({
      data: {
        code,
        kind: "giao_hang",
        status: "cho_nhan",
        projectId: input.project.id,
        partnerId: input.partnerId,
        orderId: input.orderId,
        fromKind: input.fromKind,
        toKind: "cong_trinh",
        toRef: input.project.id,
        lines: { create: input.lines },
      },
      include: { lines: true },
    });
    if (input.moveFromKho) {
      const moves: Prisma.StockMoveCreateManyInput[] = [];
      for (const line of created.lines) {
        moves.push({ slipId: created.id, lineId: line.id, materialId: line.materialId, placeKind: "kho", placeRef: "", direction: "ra", qty: line.documentQty });
        moves.push({ slipId: created.id, lineId: line.id, materialId: line.materialId, placeKind: "dang_giao", placeRef: input.project.id, direction: "vao", qty: line.documentQty });
      }
      if (moves.length) await tx.stockMove.createMany({ data: moves });
    }
    const people = await accounts(tx);
    const recipients = people.flatMap((row) => {
      const caps = capsOf(row);
      const owner = row.id === input.project.ownerId;
      const sees = caps.includes("projects.view") || (caps.includes("projects.view.assigned") && owner);
      return owner || (caps.includes("orders.confirm") && sees) ? [row.id] : [];
    });
    await notify(tx, recipients, {
      title: "Vật tư đang được giao đến công trình",
      body: `Xin vui lòng xác nhận khi nhận hàng.\n${input.project.code} · ${input.project.name}`,
      href: `/hien-truong?viec=xac-nhan&phieu=${created.id}`,
      kind: "giao",
    });
    await writeAudit(tx, user.id, "giao", "phieu_kho", created.id, `Giao ${created.code} đến ${input.project.code}`);
    return created;
  });
  return { id: slip.id, code: slip.code };
}

export async function dispatchOrder(user: User, projectId: string, orderId: string) {
  if (!hasAnyCapability(user, ["projects.update", "projects.create"])) throw new AppError("Bạn không có quyền giao hàng.", 403);
  const order = await prisma.projectOrder.findFirst({
    where: { id: orderId, projectId },
    include: { lines: { orderBy: { sortOrder: "asc" } }, project: { select: { id: true, code: true, name: true, ownerId: true } } },
  });
  if (!order) throw new AppError("Không tìm thấy đơn hàng.", 404);
  assertOwn(user, "projects.view", "projects.view.assigned", order.project.ownerId);
  if (order.status !== "da_luu") throw new AppError("Chỉ giao đơn đã lưu.", 400);
  const open = await prisma.stockSlip.findFirst({ where: { orderId, kind: "giao_hang", status: "cho_nhan" }, select: { code: true } });
  if (open) throw new AppError(`Đơn đang chờ nhận trên phiếu ${open.code}.`, 409);
  const lines = order.lines.flatMap((line) => {
    if (!line.materialId) return [];
    const qty = order.kind === "nhom" ? line.barCount * 1000 : line.quantityMilli;
    if (qty <= 0) return [];
    const unit = order.kind === "nhom" ? "thanh" : order.kind === "kinh" ? "tấm" : line.unit || "cái";
    return [{
      materialId: line.materialId,
      documentQty: qty,
      receivedQty: 0,
      note: unit,
      lengthMm: order.kind === "nhom" ? line.lengthMm : null,
      barCount: order.kind === "nhom" ? qty : 0,
      sortOrder: line.sortOrder,
    }];
  });
  if (!lines.length) throw new AppError("Đơn chưa có vật tư trong danh mục để giao.", 400);
  return createDelivery(user, { project: order.project, orderId: order.id, partnerId: order.partnerId, fromKind: "", lines, moveFromKho: false });
}

export async function dispatchWarehouse(user: User, input: { projectId?: unknown; lines?: unknown }) {
  assertAny(user, ["inventory.create"]);
  const projectId = String(input.projectId ?? "").trim();
  if (!projectId) throw new AppError("Chọn công trình.", 400);
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, code: true, name: true, ownerId: true } });
  if (!project) throw new AppError("Không tìm thấy công trình.", 404);
  const raw = Array.isArray(input.lines) ? input.lines : [];
  if (!raw.length) throw new AppError("Chọn ít nhất một vật tư.", 400);
  if (raw.length > 40) throw new AppError("Một phiếu tối đa 40 dòng.", 400);
  const parsed: { materialId: string; qty: number }[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const row = item as { materialId?: unknown; qty?: unknown };
    const materialId = String(row.materialId ?? "").trim();
    if (!materialId) throw new AppError("Chọn vật tư cho từng dòng.", 400);
    if (seen.has(materialId)) throw new AppError("Mỗi vật tư chỉ một dòng.", 400);
    seen.add(materialId);
    parsed.push({ materialId, qty: positiveMilli(row.qty) });
  }
  const materials = await prisma.material.findMany({
    where: { id: { in: parsed.map((row) => row.materialId) } },
    select: { id: true, code: true, name: true, stockUnit: true },
  });
  const card = new Map(materials.map((row) => [row.id, row]));
  const lines = parsed.map((row, index) => {
    const material = card.get(row.materialId);
    if (!material) throw new AppError("Không tìm thấy vật tư.", 404);
    if (isGlassMaterial(material)) throw new AppError(`Kính ${material.code} chưa giao từ kho theo lối này.`, 400);
    return {
      materialId: material.id,
      documentQty: row.qty,
      receivedQty: 0,
      note: material.stockUnit || "cái",
      lengthMm: null,
      barCount: 0,
      sortOrder: index + 1,
    };
  });
  return createDelivery(user, { project, orderId: null, partnerId: null, fromKind: "kho", lines, moveFromKho: true });
}

export async function canOpenReceive(user: User) {
  if (hasCapability(user, "installation.view") || hasCapability(user, "orders.confirm") || hasCapability(user, "settings.manage") || hasCapability(user, "projects.view")) return true;
  const owned = await prisma.project.findFirst({ where: { ownerId: user.id }, select: { id: true } });
  return Boolean(owned);
}

export async function listDeliveries(user: User) {
  const rows = await prisma.stockSlip.findMany({
    where: listWhere(user),
    include: { project: { select: { code: true, name: true } }, order: { select: { code: true } }, _count: { select: { lines: true } } },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  const card = (row: (typeof rows)[number]) => ({
    id: row.id,
    code: row.code,
    status: row.status,
    projectCode: row.project?.code ?? "",
    projectName: row.project?.name ?? "",
    sourceLabel: sourceLabel(row.fromKind, row.order?.code ?? ""),
    lineCount: row._count.lines,
    createdAt: row.createdAt.toISOString(),
  });
  return {
    waiting: rows.filter((row) => row.status === "cho_nhan").map(card),
    recent: rows.filter((row) => row.status === "da_nhan").slice(0, 8).map(card),
  };
}

export async function getDelivery(user: User, id: string) {
  const slip = await prisma.stockSlip.findFirst({ where: { id, kind: "giao_hang" }, include: slipInclude });
  if (!slip?.project) throw new AppError("Không tìm thấy phiếu giao.", 404);
  assertSee(user, slip.project.ownerId);
  return presentSlip(slip);
}

function extOf(file: File) {
  const type = file.type.toLowerCase();
  if (type === "image/jpeg" || type === "image/jpg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "png";
  if (name.endsWith(".webp")) return "webp";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "jpg";
  throw new AppError("Chỉ nhận ảnh JPG, PNG hoặc WEBP.", 400);
}

export async function addDeliveryPhoto(user: User, id: string, file: File) {
  const slip = await prisma.stockSlip.findFirst({ where: { id, kind: "giao_hang" }, include: { project: { select: { ownerId: true } }, _count: { select: { photos: true } } } });
  if (!slip?.project) throw new AppError("Không tìm thấy phiếu giao.", 404);
  assertConfirm(user, slip.project.ownerId);
  if (slip.status !== "cho_nhan") throw new AppError("Phiếu này đã được xác nhận.", 400);
  if (slip._count.photos >= 6) throw new AppError("Mỗi phiếu tối đa 6 ảnh.", 400);
  if (file.size <= 0 || file.size > 5 * 1024 * 1024) throw new AppError("Ảnh cần nhỏ hơn 5 MB.", 400);
  const ext = extOf(file);
  const photoId = randomUUID();
  const storedName = `giao-hang/${id}/${photoId}.${ext}`;
  await mkdir(path.join(photoRoot, id), { recursive: true });
  await writeFile(path.join(process.cwd(), "storage", storedName), Buffer.from(await file.arrayBuffer()));
  try {
    await prisma.stockSlipPhoto.create({ data: { id: photoId, slipId: id, storedName } });
  } catch (error) {
    await unlink(path.join(process.cwd(), "storage", storedName)).catch(() => undefined);
    throw error;
  }
  return { id: photoId, url: `/api/hien-truong/giao/${id}/anh/${photoId}` };
}

export async function readDeliveryPhoto(user: User, id: string, photoId: string) {
  const photo = await prisma.stockSlipPhoto.findFirst({
    where: { id: photoId, slipId: id },
    include: { slip: { select: { project: { select: { ownerId: true } } } } },
  });
  if (!photo?.slip.project) throw new AppError("Không tìm thấy ảnh.", 404);
  assertSee(user, photo.slip.project.ownerId);
  if (!photo.storedName.startsWith(`giao-hang/${id}/`) || photo.storedName.includes("..")) throw new AppError("Không tìm thấy ảnh.", 404);
  const bytes = await readFile(path.join(process.cwd(), "storage", photo.storedName));
  const type = photo.storedName.endsWith(".png") ? "image/png" : photo.storedName.endsWith(".webp") ? "image/webp" : "image/jpeg";
  return { bytes, type };
}

export async function confirmDelivery(user: User, id: string, input: { lines?: unknown }) {
  const slip = await prisma.stockSlip.findFirst({
    where: { id, kind: "giao_hang" },
    include: { project: { select: { id: true, code: true, name: true, ownerId: true } }, lines: true },
  });
  if (!slip?.project) throw new AppError("Không tìm thấy phiếu giao.", 404);
  assertConfirm(user, slip.project.ownerId);
  if (slip.status !== "cho_nhan") throw new AppError("Phiếu này đã được xác nhận.", 409);
  const raw = Array.isArray(input.lines) ? input.lines : [];
  const sent = new Map<string, number>();
  for (const item of raw) {
    const row = item as { id?: unknown; received?: unknown };
    const lineId = String(row.id ?? "");
    if (!lineId) continue;
    sent.set(lineId, receivedMilli(row.received));
  }
  for (const line of slip.lines) {
    if (!sent.has(line.id)) throw new AppError("Thiếu dòng trên phiếu.", 400);
    if ((sent.get(line.id) ?? 0) > line.documentQty) throw new AppError("Không nhận nhiều hơn số trên phiếu.", 400);
  }
  const photos = await prisma.stockSlipPhoto.count({ where: { slipId: id } });
  if (photos < 1) throw new AppError("Cần ít nhất một ảnh hàng đã nhận.", 400);
  const mismatch = slip.lines.some((line) => (sent.get(line.id) ?? 0) !== line.documentQty);
  const project = slip.project;
  await prisma.$transaction(async (tx) => {
    const locked = await tx.stockSlip.updateMany({
      where: { id, status: "cho_nhan" },
      data: { status: "da_nhan", postedAt: new Date(), revision: { increment: 1 } },
    });
    if (locked.count === 0) throw new AppError("Phiếu này đã được xác nhận.", 409);
    const moves: Prisma.StockMoveCreateManyInput[] = [];
    const outbound = new Map<string, { materialId: string; qty: number }>();
    for (const line of slip.lines) {
      const received = sent.get(line.id) ?? 0;
      await tx.stockSlipLine.update({ where: { id: line.id }, data: { receivedQty: received } });
      if (received <= 0) continue;
      if (slip.fromKind === "kho") {
        moves.push({ slipId: id, lineId: line.id, materialId: line.materialId, placeKind: "dang_giao", placeRef: project.id, direction: "ra", qty: received });
        const key = line.materialId;
        const row = outbound.get(key) ?? { materialId: line.materialId, qty: 0 };
        row.qty += received;
        outbound.set(key, row);
      }
      moves.push({ slipId: id, lineId: line.id, materialId: line.materialId, placeKind: "cong_trinh", placeRef: project.id, direction: "vao", qty: received });
    }
    for (const row of outbound.values()) {
      const have = await onHand(tx, row.materialId, "dang_giao", project.id);
      if (have < row.qty) {
        const material = await tx.material.findUnique({ where: { id: row.materialId }, select: { code: true } });
        throw new AppError(`Không đủ ${material?.code ?? "vật tư"} đang giao.`, 400);
      }
    }
    if (moves.length) await tx.stockMove.createMany({ data: moves });
    const people = await accounts(tx);
    const leaders = people.filter((row) => capsOf(row).includes("settings.manage")).map((row) => row.id);
    await notify(tx, leaders, {
      title: "Đã nhận hàng tại công trình",
      body: mismatch ? `Có lệch số lượng.\n${project.code} · ${project.name}` : `${project.code} · ${project.name}`,
      href: `/hien-truong?viec=xac-nhan&phieu=${id}`,
      kind: "nhan",
    });
    await writeAudit(tx, user.id, "nhan", "phieu_kho", id, `Xác nhận nhận ${slip.code}`);
  });
  return getDelivery(user, id);
}

export async function listNotices(user: User) {
  const rows = await prisma.notice.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 });
  return {
    notices: rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      href: row.href,
      kind: row.kind,
      read: Boolean(row.readAt),
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function markNoticeRead(user: User, id: string) {
  const current = await prisma.notice.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!current) throw new AppError("Không tìm thấy thông báo.", 404);
  await prisma.notice.updateMany({ where: { id, userId: user.id, readAt: null }, data: { readAt: new Date() } });
  return { ok: true };
}
