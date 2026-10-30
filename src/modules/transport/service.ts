import type { User } from "@/shared/auth/types";
import { hasAnyCapability, hasCapability } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { assertOwn } from "@/modules/system/access";
import { writeAudit } from "@/modules/system/audit";
import { nextCode } from "@/modules/system/codes";
import {
  chuoi,
  donVi,
  donViMacDinh,
  ngayBatBuoc,
  ngayTuyChon,
  parsePricing,
  parseStatus,
  soLuongMilli,
  soNguyenKhongAm,
  soTien,
  thanhTienDong,
  type TransportStatus,
} from "@/modules/transport/fields";

function batXem(user: User) {
  if (!hasCapability(user, "transport.view") && !hasAnyCapability(user, ["projects.view", "projects.view.assigned", "projects.update", "projects.create"])) {
    throw new AppError("Bạn không có quyền xem hợp đồng vận chuyển.", 403);
  }
}

function batSua(user: User) {
  if (!hasAnyCapability(user, ["transport.create", "transport.update", "projects.update", "projects.create"])) {
    throw new AppError("Bạn không có quyền sửa hợp đồng vận chuyển.", 403);
  }
}

async function moCongTrinh(user: User, projectId: string) {
  batXem(user);
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, code: true, name: true, ownerId: true },
  });
  if (!project) throw new AppError("Không tìm thấy công trình.", 404);
  assertOwn(user, "projects.view", "projects.view.assigned", project.ownerId);
  return project;
}

async function xeHopLe(partnerId: string) {
  const partner = await prisma.partner.findFirst({
    where: { id: partnerId, status: "dang_dung", roles: { some: { role: "van_tai" } } },
    select: { id: true, code: true, name: true },
  });
  if (!partner) throw new AppError("Chọn đối tác đang dùng, có vai trò vận tải.", 400);
  return partner;
}

const include = {
  partner: { select: { id: true, code: true, name: true } },
  lines: { orderBy: { sortOrder: "asc" as const } },
  advances: { orderBy: [{ occurredOn: "desc" as const }, { createdAt: "desc" as const }] },
};

function present(row: {
  id: string;
  code: string;
  projectId: string;
  partnerId: string;
  name: string;
  pricingKind: string;
  status: string;
  signedOn: string;
  unitPrice: number | null;
  note: string;
  revision: number;
  partner: { id: string; code: string; name: string };
  lines: {
    id: string;
    sortOrder: number;
    name: string;
    routeText: string;
    unit: string;
    quantityMilli: number;
    unitPrice: number;
    amount: number;
    note: string;
  }[];
  advances: { id: string; occurredOn: string; amount: number; payerId: string; note: string; createdAt: Date }[];
}) {
  const tongHopDong = row.lines.reduce((tong, dong) => tong + dong.amount, 0);
  const tongTamUng = row.advances.reduce((tong, dong) => tong + dong.amount, 0);
  return {
    id: row.id,
    code: row.code,
    projectId: row.projectId,
    partnerId: row.partnerId,
    partnerCode: row.partner.code,
    partnerName: row.partner.name,
    name: row.name,
    pricingKind: row.pricingKind,
    status: row.status,
    signedOn: row.signedOn,
    unitPrice: row.unitPrice,
    note: row.note,
    revision: row.revision,
    tongHopDong,
    tongTamUng,
    conLai: tongHopDong - tongTamUng,
    lines: row.lines.map((dong) => ({
      id: dong.id,
      sortOrder: dong.sortOrder,
      name: dong.name,
      routeText: dong.routeText,
      unit: dong.unit,
      quantity: dong.quantityMilli / 1000,
      unitPrice: dong.unitPrice,
      amount: dong.amount,
      note: dong.note,
    })),
    advances: row.advances.map((dong) => ({
      id: dong.id,
      occurredOn: dong.occurredOn,
      amount: dong.amount,
      payerId: dong.payerId,
      note: dong.note,
      createdAt: dong.createdAt.toISOString(),
    })),
  };
}

type LineInput = {
  name?: unknown;
  routeText?: unknown;
  unit?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
  note?: unknown;
};

function cleanLines(raw: unknown, defaultPrice: number | null, pricingKind: string) {
  if (!Array.isArray(raw)) throw new AppError("Danh sách chuyến vận chuyển không hợp lệ.", 400);
  if (raw.length > 200) throw new AppError("Một hợp đồng tối đa 200 dòng.", 400);
  const donViGoiY = donViMacDinh(parsePricing(pricingKind));
  return raw.map((item, index) => {
    const dong = (item ?? {}) as LineInput;
    const name = chuoi(dong.name, 200);
    if (!name) throw new AppError(`Dòng ${index + 1}: cần nội dung chuyến.`, 400);
    const quantityMilli = soLuongMilli(dong.quantity);
    const unitPrice = dong.unitPrice === undefined || dong.unitPrice === null || String(dong.unitPrice).trim() === ""
      ? defaultPrice ?? 0
      : soNguyenKhongAm(dong.unitPrice, "Đơn giá");
    return {
      sortOrder: index + 1,
      name,
      routeText: chuoi(dong.routeText, 300),
      unit: donVi(dong.unit) || donViGoiY,
      quantityMilli,
      unitPrice,
      amount: thanhTienDong(quantityMilli, unitPrice),
      note: chuoi(dong.note, 300),
    };
  });
}

export async function listTransportPartners(user: User) {
  batXem(user);
  return prisma.partner.findMany({
    where: { status: "dang_dung", roles: { some: { role: "van_tai" } } },
    select: { id: true, code: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function listProjectTransport(user: User, projectId: string) {
  await moCongTrinh(user, projectId);
  const rows = await prisma.transportContract.findMany({
    where: { projectId },
    include,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(present);
}

export async function getTransportContract(user: User, projectId: string, id: string) {
  await moCongTrinh(user, projectId);
  const row = await prisma.transportContract.findFirst({ where: { id, projectId }, include });
  if (!row) throw new AppError("Không tìm thấy hợp đồng vận chuyển.", 404);
  return present(row);
}

export async function createTransportContract(
  user: User,
  projectId: string,
  input: {
    partnerId?: unknown;
    name?: unknown;
    pricingKind?: unknown;
    signedOn?: unknown;
    unitPrice?: unknown;
    note?: unknown;
    lines?: unknown;
    status?: unknown;
  },
) {
  batSua(user);
  if (!hasCapability(user, "transport.create") && !hasAnyCapability(user, ["projects.create", "projects.update"])) {
    throw new AppError("Bạn không có quyền thêm hợp đồng vận chuyển.", 403);
  }
  const project = await moCongTrinh(user, projectId);
  const partner = await xeHopLe(chuoi(input.partnerId, 64));
  const pricingKind = parsePricing(input.pricingKind ?? "theo_chuyen");
  const unitPrice = input.unitPrice === undefined || String(input.unitPrice ?? "").trim() === ""
    ? null
    : soNguyenKhongAm(input.unitPrice, "Đơn giá");
  const lines = cleanLines(input.lines ?? [], unitPrice, pricingKind);
  const status = input.status === undefined ? (lines.length ? "da_luu" : "nhap") : parseStatus(input.status);
  if (status !== "nhap" && status !== "da_luu") throw new AppError("Trạng thái tạo mới chỉ nhận nháp hoặc đã lưu.", 400);
  return prisma.$transaction(async (tx) => {
    const code = await nextCode(tx, "VC", new Date());
    const row = await tx.transportContract.create({
      data: {
        code,
        projectId: project.id,
        partnerId: partner.id,
        name: chuoi(input.name, 200) || `Vận chuyển · ${partner.name}`,
        pricingKind,
        status,
        signedOn: ngayTuyChon(input.signedOn),
        unitPrice,
        note: chuoi(input.note, 1000),
        lines: { create: lines },
      },
      include,
    });
    await writeAudit(tx, user.id, "tao", "hop_dong_van_chuyen", row.id, `Thêm ${row.code} cho ${project.code}`);
    return present(row);
  });
}

export async function updateTransportContract(
  user: User,
  projectId: string,
  id: string,
  input: {
    partnerId?: unknown;
    name?: unknown;
    pricingKind?: unknown;
    signedOn?: unknown;
    unitPrice?: unknown;
    note?: unknown;
    lines?: unknown;
    status?: unknown;
  },
) {
  batSua(user);
  if (!hasCapability(user, "transport.update") && !hasAnyCapability(user, ["projects.create", "projects.update"])) {
    throw new AppError("Bạn không có quyền sửa hợp đồng vận chuyển.", 403);
  }
  const project = await moCongTrinh(user, projectId);
  const current = await prisma.transportContract.findFirst({ where: { id, projectId } });
  if (!current) throw new AppError("Không tìm thấy hợp đồng vận chuyển.", 404);
  if (current.status === "ket_thuc") throw new AppError("Hợp đồng đã kết thúc, không sửa.", 400);
  const partner = input.partnerId === undefined ? null : await xeHopLe(chuoi(input.partnerId, 64));
  const pricingKind = input.pricingKind === undefined ? current.pricingKind : parsePricing(input.pricingKind);
  const unitPrice = input.unitPrice === undefined
    ? current.unitPrice
    : String(input.unitPrice ?? "").trim() === ""
      ? null
      : soNguyenKhongAm(input.unitPrice, "Đơn giá");
  const lines = input.lines === undefined ? null : cleanLines(input.lines, unitPrice, pricingKind);
  const status: TransportStatus = input.status === undefined ? (current.status as TransportStatus) : parseStatus(input.status);
  return prisma.$transaction(async (tx) => {
    if (lines) await tx.transportLine.deleteMany({ where: { contractId: id } });
    const row = await tx.transportContract.update({
      where: { id },
      data: {
        partnerId: partner?.id ?? current.partnerId,
        name: input.name === undefined ? current.name : chuoi(input.name, 200) || current.name,
        pricingKind,
        signedOn: input.signedOn === undefined ? current.signedOn : ngayTuyChon(input.signedOn),
        unitPrice,
        note: input.note === undefined ? current.note : chuoi(input.note, 1000),
        status,
        revision: { increment: 1 },
        ...(lines ? { lines: { create: lines } } : {}),
      },
      include,
    });
    await writeAudit(tx, user.id, "sua", "hop_dong_van_chuyen", id, `Sửa ${row.code} của ${project.code}`);
    return present(row);
  });
}

export async function deleteTransportContract(user: User, projectId: string, id: string) {
  batSua(user);
  const project = await moCongTrinh(user, projectId);
  const current = await prisma.transportContract.findFirst({
    where: { id, projectId },
    include: { _count: { select: { advances: true } } },
  });
  if (!current) throw new AppError("Không tìm thấy hợp đồng vận chuyển.", 404);
  if (current._count.advances > 0) throw new AppError("Hợp đồng đã có tạm ứng, không xóa. Hãy kết thúc thay vì xóa.", 400);
  await prisma.$transaction(async (tx) => {
    await writeAudit(tx, user.id, "xoa", "hop_dong_van_chuyen", id, `Xóa ${current.code} của ${project.code}`);
    await tx.transportContract.delete({ where: { id } });
  });
}

export async function addTransportAdvance(
  user: User,
  projectId: string,
  contractId: string,
  input: { occurredOn?: unknown; amount?: unknown; payerId?: unknown; note?: unknown },
) {
  batSua(user);
  const project = await moCongTrinh(user, projectId);
  const current = await prisma.transportContract.findFirst({ where: { id: contractId, projectId } });
  if (!current) throw new AppError("Không tìm thấy hợp đồng vận chuyển.", 404);
  if (current.status === "nhap") throw new AppError("Lưu hợp đồng trước khi ghi tạm ứng.", 400);
  const amount = soTien(input.amount);
  const occurredOn = ngayBatBuoc(input.occurredOn);
  const payerId = chuoi(input.payerId, 64);
  if (payerId) {
    const staff = await prisma.staff.findUnique({ where: { id: payerId }, select: { id: true } });
    if (!staff) throw new AppError("Không tìm thấy người chi tạm ứng.", 400);
  }
  return prisma.$transaction(async (tx) => {
    const row = await tx.transportAdvance.create({
      data: {
        contractId,
        occurredOn,
        amount,
        payerId,
        note: chuoi(input.note, 300),
      },
    });
    await writeAudit(tx, user.id, "tao", "tam_ung_van_chuyen", row.id, `Tạm ứng ${amount.toLocaleString("vi-VN")} ₫ cho ${current.code} · ${project.code}`);
    const full = await tx.transportContract.findUniqueOrThrow({ where: { id: contractId }, include });
    return present(full);
  });
}

export async function deleteTransportAdvance(user: User, projectId: string, contractId: string, advanceId: string) {
  batSua(user);
  const project = await moCongTrinh(user, projectId);
  const current = await prisma.transportAdvance.findFirst({
    where: { id: advanceId, contractId, contract: { projectId } },
    include: { contract: { select: { code: true } } },
  });
  if (!current) throw new AppError("Không tìm thấy khoản tạm ứng.", 404);
  await prisma.$transaction(async (tx) => {
    await writeAudit(tx, user.id, "xoa", "tam_ung_van_chuyen", advanceId, `Xóa tạm ứng của ${current.contract.code} · ${project.code}`);
    await tx.transportAdvance.delete({ where: { id: advanceId } });
  });
  const full = await prisma.transportContract.findUniqueOrThrow({ where: { id: contractId }, include });
  return present(full);
}

export async function tongChiPhiVanChuyen(projectId: string) {
  const rows = await prisma.transportContract.findMany({
    where: { projectId, status: { in: ["da_luu", "ket_thuc"] } },
    select: { lines: { select: { amount: true } } },
  });
  return rows.reduce((tong, hop) => tong + hop.lines.reduce((dong, line) => dong + line.amount, 0), 0);
}
