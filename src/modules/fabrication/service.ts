import type { User } from "@/shared/auth/types";
import { hasAnyCapability, hasCapability } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { assertOwn } from "@/modules/system/access";
import { writeAudit } from "@/modules/system/audit";
import { nextCode } from "@/modules/system/codes";
import {
  chuoi,
  dienTichMilli,
  khoiLuongOverrideMilli,
  ngayBatBuoc,
  ngayTuyChon,
  parseStatus,
  parseVat,
  soLuongMilli,
  soNguyenKhongAm,
  soTien,
  thanhTienDong,
  type FabricationStatus,
} from "@/modules/fabrication/fields";
import {
  chuanHoaContractStatus,
  contractStatusTinhChiPhi,
  hopDongChoThanhToan,
  hopDongDangKhoa,
} from "@/shared/catalog/contract-status";

function batXem(user: User) {
  if (!hasCapability(user, "fabrication.view") && !hasAnyCapability(user, ["projects.view", "projects.view.assigned", "projects.update", "projects.create"])) {
    throw new AppError("Bạn không có quyền xem hợp đồng gia công.", 403);
  }
}

function batSua(user: User) {
  if (!hasAnyCapability(user, ["fabrication.create", "fabrication.update", "projects.update", "projects.create"])) {
    throw new AppError("Bạn không có quyền sửa hợp đồng gia công.", 403);
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

async function xuongHopLe(partnerId: string) {
  const partner = await prisma.partner.findFirst({
    where: { id: partnerId, status: "dang_dung", roles: { some: { role: "xuong_gia_cong" } } },
    select: { id: true, code: true, name: true },
  });
  if (!partner) throw new AppError("Chọn đối tác đang dùng, có vai trò xưởng gia công.", 400);
  return partner;
}

const include = {
  partner: { select: { id: true, code: true, name: true } },
  lines: { orderBy: { sortOrder: "asc" as const } },
  advances: { orderBy: [{ occurredOn: "desc" as const }, { createdAt: "desc" as const }] },
  stockSlips: {
    where: { kind: "giao_hang", status: { in: ["cho_nhan", "da_nhan"] } },
    orderBy: [{ createdAt: "desc" as const }],
    select: {
      id: true,
      code: true,
      status: true,
      expectedAt: true,
      createdAt: true,
      // NCC trên phiếu hoặc từ đơn gốc.
      partner: { select: { name: true } },
      order: { select: { code: true, supplierName: true, partner: { select: { name: true } } } },
      // Ảnh chứng từ nhận hàng — cùng nguồn với lịch sử giao đơn.
      photos: { orderBy: { createdAt: "asc" as const }, select: { id: true } },
      lines: {
        orderBy: { sortOrder: "asc" as const },
        select: {
          id: true,
          documentQty: true,
          receivedQty: true,
          lengthMm: true,
          note: true,
          material: { select: { code: true, name: true, groupName: true, stockUnit: true } },
        },
      },
    },
  },
};

function nhanPhieuGiao(status: string) {
  if (status === "cho_nhan") return "Chờ nhận";
  if (status === "da_nhan") return "Đã nhận";
  return status;
}

function present(row: {
  id: string;
  code: string;
  projectId: string;
  partnerId: string;
  name: string;
  status: string;
  signedOn: string;
  taxBps: number;
  note: string;
  revision: number;
  partner: { id: string; code: string; name: string };
  lines: {
    id: string;
    sortOrder: number;
    name: string;
    unit: string;
    widthMm: number;
    heightMm: number;
    quantityMilli: number;
    areaMilli: number;
    areaOverrideMilli: number | null;
    unitPrice: number;
    amount: number;
    taxBps: number;
    note: string;
  }[];
  advances: { id: string; occurredOn: string; amount: number; payerId: string; note: string; createdAt: Date }[];
  stockSlips?: {
    id: string;
    code: string;
    status: string;
    expectedAt: Date | null;
    createdAt: Date;
    partner: { name: string } | null;
    order: { code: string; supplierName: string; partner: { name: string } | null } | null;
    photos: { id: string }[];
    lines: {
      id: string;
      documentQty: number;
      receivedQty: number;
      lengthMm: number | null;
      note: string;
      material: { code: string; name: string; groupName: string; stockUnit: string };
    }[];
  }[];
}) {
  const truocThue = row.lines.reduce((tong, dong) => tong + dong.amount, 0);
  // Tiền thuế cộng từ từng dòng (VAT theo dòng).
  const tienThue = row.lines.reduce((tong, dong) => tong + Math.round((dong.amount * dong.taxBps) / 10000), 0);
  const tongHopDong = truocThue + tienThue;
  const tongDaThanhToan = row.advances.reduce((tong, dong) => tong + dong.amount, 0);
  return {
    id: row.id,
    code: row.code,
    projectId: row.projectId,
    partnerId: row.partnerId,
    partnerCode: row.partner.code,
    partnerName: row.partner.name,
    name: row.name,
    status: chuanHoaContractStatus(row.status),
    signedOn: row.signedOn,
    taxBps: row.taxBps,
    note: row.note,
    revision: row.revision,
    truocThue,
    tienThue,
    tongHopDong,
    tongDaThanhToan,
    conLai: tongHopDong - tongDaThanhToan,
    lines: row.lines.map((dong) => ({
      id: dong.id,
      sortOrder: dong.sortOrder,
      name: dong.name,
      unit: dong.unit,
      widthMm: dong.widthMm,
      heightMm: dong.heightMm,
      quantity: dong.quantityMilli / 1000,
      areaM2: dong.areaMilli / 1000,
      areaOverrideM2: dong.areaOverrideMilli === null ? null : dong.areaOverrideMilli / 1000,
      unitPrice: dong.unitPrice,
      amount: dong.amount,
      taxBps: dong.taxBps,
      tienThue: Math.round((dong.amount * dong.taxBps) / 10000),
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
    deliveries: (row.stockSlips ?? []).map((phieu) => {
      // Ưu tiên NCC trên phiếu → tên NCC đơn → đối tác đơn.
      const supplierName = phieu.partner?.name || phieu.order?.supplierName || phieu.order?.partner?.name || "";
      return {
        id: phieu.id,
        code: phieu.code,
        status: phieu.status,
        statusLabel: nhanPhieuGiao(phieu.status),
        orderCode: phieu.order?.code ?? "",
        supplierName,
        lineCount: phieu.lines.length,
        expectedAt: phieu.expectedAt?.toISOString() ?? "",
        createdAt: phieu.createdAt.toISOString(),
        photos: (phieu.photos ?? []).map((anh) => ({
          id: anh.id,
          url: `/api/hien-truong/giao/${phieu.id}/anh/${anh.id}`,
        })),
        lines: phieu.lines.map((dong) => ({
          id: dong.id,
          code: dong.material.code,
          name: dong.material.name,
          groupName: dong.material.groupName,
          unit: dong.note || dong.material.stockUnit,
          lengthMm: dong.lengthMm ?? 0,
          documentQty: dong.documentQty,
          receivedQty: dong.receivedQty,
        })),
      };
    }),
  };
}

type LineInput = {
  name?: unknown;
  widthMm?: unknown;
  heightMm?: unknown;
  quantity?: unknown;
  areaOverride?: unknown;
  unitPrice?: unknown;
  taxBps?: unknown;
  note?: unknown;
};

function cleanLines(raw: unknown) {
  if (!Array.isArray(raw)) throw new AppError("Danh sách dòng gia công không hợp lệ.", 400);
  if (raw.length > 200) throw new AppError("Một hợp đồng tối đa 200 dòng.", 400);
  return raw.map((item, index) => {
    const dong = (item ?? {}) as LineInput;
    const name = chuoi(dong.name, 200);
    if (!name) throw new AppError(`Dòng ${index + 1}: cần nội dung hoặc ký hiệu.`, 400);
    const widthMm = soNguyenKhongAm(dong.widthMm, "Chiều rộng");
    const heightMm = soNguyenKhongAm(dong.heightMm, "Chiều cao");
    const quantityMilli = soLuongMilli(dong.quantity);
    const unitPrice = soNguyenKhongAm(dong.unitPrice, "Đơn giá");
    const areaOverrideMilli = khoiLuongOverrideMilli(dong.areaOverride);
    const areaMilli = areaOverrideMilli ?? dienTichMilli(widthMm, heightMm, quantityMilli);
    const amount = thanhTienDong(areaMilli, unitPrice);
    const taxBps = parseVat(dong.taxBps);
    return {
      sortOrder: index + 1,
      name,
      unit: "m2",
      widthMm,
      heightMm,
      quantityMilli,
      areaMilli,
      areaOverrideMilli,
      unitPrice,
      amount,
      taxBps,
      note: chuoi(dong.note, 300),
    };
  });
}

export async function listWorkshopPartners(user: User) {
  batXem(user);
  return prisma.partner.findMany({
    where: { status: "dang_dung", roles: { some: { role: "xuong_gia_cong" } } },
    select: { id: true, code: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function listProjectFabrication(user: User, projectId: string) {
  await moCongTrinh(user, projectId);
  const rows = await prisma.fabricationContract.findMany({
    where: { projectId },
    include,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(present);
}

export async function getFabricationContract(user: User, projectId: string, id: string) {
  await moCongTrinh(user, projectId);
  const row = await prisma.fabricationContract.findFirst({ where: { id, projectId }, include });
  if (!row) throw new AppError("Không tìm thấy hợp đồng gia công.", 404);
  return present(row);
}

export async function createFabricationContract(
  user: User,
  projectId: string,
  input: {
    partnerId?: unknown;
    name?: unknown;
    signedOn?: unknown;
    taxBps?: unknown;
    note?: unknown;
    lines?: unknown;
    status?: unknown;
  },
) {
  batSua(user);
  if (!hasCapability(user, "fabrication.create") && !hasAnyCapability(user, ["projects.create", "projects.update"])) {
    throw new AppError("Bạn không có quyền thêm hợp đồng gia công.", 403);
  }
  const project = await moCongTrinh(user, projectId);
  const partner = await xuongHopLe(chuoi(input.partnerId, 64));
  const taxBps = parseVat(input.taxBps);
  const lines = cleanLines(input.lines ?? []);
  const status = input.status === undefined ? (lines.length ? "dang_thuc_hien" : "nhap") : parseStatus(input.status);
  if (hopDongDangKhoa(status)) throw new AppError("Không tạo hợp đồng ở trạng thái đã kết thúc/hủy.", 400);
  return prisma.$transaction(async (tx) => {
    const code = await nextCode(tx, "GC", new Date());
    const row = await tx.fabricationContract.create({
      data: {
        code,
        projectId: project.id,
        partnerId: partner.id,
        name: chuoi(input.name, 200) || `Gia công kính · ${partner.name}`,
        status,
        signedOn: ngayTuyChon(input.signedOn),
        taxBps,
        note: chuoi(input.note, 1000),
        lines: { create: lines },
      },
      include,
    });
    await writeAudit(tx, user.id, "tao", "hop_dong_gia_cong", row.id, `Thêm ${row.code} cho ${project.code}`);
    return present(row);
  });
}

export async function updateFabricationContract(
  user: User,
  projectId: string,
  id: string,
  input: {
    partnerId?: unknown;
    name?: unknown;
    signedOn?: unknown;
    taxBps?: unknown;
    note?: unknown;
    lines?: unknown;
    status?: unknown;
  },
) {
  batSua(user);
  if (!hasCapability(user, "fabrication.update") && !hasAnyCapability(user, ["projects.create", "projects.update"])) {
    throw new AppError("Bạn không có quyền sửa hợp đồng gia công.", 403);
  }
  const project = await moCongTrinh(user, projectId);
  const current = await prisma.fabricationContract.findFirst({ where: { id, projectId } });
  if (!current) throw new AppError("Không tìm thấy hợp đồng gia công.", 404);
  if (hopDongDangKhoa(current.status)) throw new AppError("Hợp đồng đã kết thúc/hủy, không sửa.", 400);
  const partner = input.partnerId === undefined ? null : await xuongHopLe(chuoi(input.partnerId, 64));
  const taxBps = input.taxBps === undefined ? current.taxBps : parseVat(input.taxBps);
  const lines = input.lines === undefined ? null : cleanLines(input.lines);
  const status: FabricationStatus = input.status === undefined ? parseStatus(current.status) : parseStatus(input.status);
  return prisma.$transaction(async (tx) => {
    if (lines) await tx.fabricationLine.deleteMany({ where: { contractId: id } });
    const row = await tx.fabricationContract.update({
      where: { id },
      data: {
        partnerId: partner?.id ?? current.partnerId,
        name: input.name === undefined ? current.name : chuoi(input.name, 200) || current.name,
        signedOn: input.signedOn === undefined ? current.signedOn : ngayTuyChon(input.signedOn),
        taxBps,
        note: input.note === undefined ? current.note : chuoi(input.note, 1000),
        status,
        revision: { increment: 1 },
        ...(lines ? { lines: { create: lines } } : {}),
      },
      include,
    });
    await writeAudit(tx, user.id, "sua", "hop_dong_gia_cong", id, `Sửa ${row.code} của ${project.code}`);
    return present(row);
  });
}

export async function deleteFabricationContract(user: User, projectId: string, id: string) {
  batSua(user);
  const project = await moCongTrinh(user, projectId);
  const current = await prisma.fabricationContract.findFirst({
    where: { id, projectId },
    include: { _count: { select: { advances: true } } },
  });
  if (!current) throw new AppError("Không tìm thấy hợp đồng gia công.", 404);
  if (current._count.advances > 0) throw new AppError("Hợp đồng đã có thanh toán, không xóa. Hãy kết thúc thay vì xóa.", 400);
  await prisma.$transaction(async (tx) => {
    await writeAudit(tx, user.id, "xoa", "hop_dong_gia_cong", id, `Xóa ${current.code} của ${project.code}`);
    await tx.fabricationContract.delete({ where: { id } });
  });
}

export async function addFabricationAdvance(
  user: User,
  projectId: string,
  contractId: string,
  input: { occurredOn?: unknown; amount?: unknown; payerId?: unknown; note?: unknown },
) {
  batSua(user);
  const project = await moCongTrinh(user, projectId);
  const current = await prisma.fabricationContract.findFirst({ where: { id: contractId, projectId } });
  if (!current) throw new AppError("Không tìm thấy hợp đồng gia công.", 404);
  if (!hopDongChoThanhToan(current.status)) throw new AppError("Trạng thái hiện tại không cho ghi thanh toán.", 400);
  const amount = soTien(input.amount);
  const occurredOn = ngayBatBuoc(input.occurredOn);
  const payerId = chuoi(input.payerId, 64);
  if (payerId) {
    const staff = await prisma.staff.findUnique({ where: { id: payerId }, select: { id: true } });
    if (!staff) throw new AppError("Không tìm thấy người chi thanh toán.", 400);
  }
  return prisma.$transaction(async (tx) => {
    const row = await tx.fabricationAdvance.create({
      data: {
        contractId,
        occurredOn,
        amount,
        payerId,
        note: chuoi(input.note, 300),
      },
    });
    await writeAudit(tx, user.id, "tao", "thanh_toan_gia_cong", row.id, `Thanh toán ${amount.toLocaleString("vi-VN")} ₫ cho ${current.code} · ${project.code}`);
    const full = await tx.fabricationContract.findUniqueOrThrow({ where: { id: contractId }, include });
    return present(full);
  });
}

export async function deleteFabricationAdvance(user: User, projectId: string, contractId: string, advanceId: string) {
  batSua(user);
  const project = await moCongTrinh(user, projectId);
  const current = await prisma.fabricationAdvance.findFirst({
    where: { id: advanceId, contractId, contract: { projectId } },
    include: { contract: { select: { code: true } } },
  });
  if (!current) throw new AppError("Không tìm thấy khoản thanh toán.", 404);
  await prisma.$transaction(async (tx) => {
    await writeAudit(tx, user.id, "xoa", "thanh_toan_gia_cong", advanceId, `Xóa thanh toán của ${current.contract.code} · ${project.code}`);
    await tx.fabricationAdvance.delete({ where: { id: advanceId } });
  });
  const full = await prisma.fabricationContract.findUniqueOrThrow({ where: { id: contractId }, include });
  return present(full);
}

// Tổng thanh toán (đã gồm VAT) của hợp đồng đang/đã thực hiện, dùng cho tổng quan công trình.
export async function tongChiPhiGiaCong(projectId: string) {
  const rows = await prisma.fabricationContract.findMany({
    where: { projectId, status: { in: [...contractStatusTinhChiPhi] } },
    select: { lines: { select: { amount: true, taxBps: true } } },
  });
  return rows.reduce((tong, hop) => {
    return tong + hop.lines.reduce((dong, line) => dong + line.amount + Math.round((line.amount * line.taxBps) / 10000), 0);
  }, 0);
}
