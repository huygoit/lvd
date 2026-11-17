import type { User } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { assertAny } from "@/modules/system/access";
import { writeAudit } from "@/modules/system/audit";
import {
  chuanDotThanhToan,
  defaultPaymentMilestones,
  loiTongPhanTramThanhToan,
  stripChuaVatNote,
  type PaymentMilestone,
} from "@/modules/quotations/document";
import { taxRateBps, taxSelectValue } from "@/modules/quotations/calc";

const ID = "mac-dinh";
const LOI_CHAO_MAC_DINH = "Xin gửi báo giá với thông tin như sau:";

export type TieuChuanBaoGia = {
  greeting: string;
  /** Ghi chú tay mặc định khi tạo báo giá mới. */
  quoteNote: string;
  validityDays: number;
  warrantyMonths: number;
  /** "chua" | "0" | "5" | "8" | "10" */
  taxPercent: string;
  paymentMilestones: PaymentMilestone[];
};

function batBuoc(user: User) {
  assertAny(user, ["settings.manage"]);
}

/** Tạo bản mặc định nếu chưa có. */
export async function damBaoTieuChuanBaoGia() {
  const existing = await prisma.quotationStandard.findUnique({ where: { id: ID } });
  if (existing) return existing;
  return prisma.quotationStandard.create({
    data: {
      id: ID,
      greeting: LOI_CHAO_MAC_DINH,
      quoteNote: "",
      validityDays: 15,
      warrantyMonths: 0,
      defaultTaxBps: 1000,
      paymentMilestones: defaultPaymentMilestones(),
    },
  });
}

export async function getTieuChuanBaoGia(_user?: User): Promise<TieuChuanBaoGia> {
  const row = await damBaoTieuChuanBaoGia();
  return {
    greeting: row.greeting.trim() || LOI_CHAO_MAC_DINH,
    quoteNote: stripChuaVatNote(row.quoteNote),
    validityDays: Math.max(0, row.validityDays),
    warrantyMonths: Math.max(0, row.warrantyMonths),
    taxPercent: taxSelectValue(row.defaultTaxBps),
    paymentMilestones: (() => {
      const list = chuanDotThanhToan(row.paymentMilestones);
      return list.length ? list : defaultPaymentMilestones();
    })(),
  };
}

export async function saveTieuChuanBaoGia(user: User, input: {
  greeting?: unknown;
  quoteNote?: unknown;
  validityDays?: unknown;
  warrantyMonths?: unknown;
  taxPercent?: unknown;
  paymentMilestones?: unknown;
}) {
  batBuoc(user);
  await damBaoTieuChuanBaoGia();
  const greeting = String(input.greeting ?? "").trim().slice(0, 500) || LOI_CHAO_MAC_DINH;
  const quoteNote = stripChuaVatNote(String(input.quoteNote ?? "")).slice(0, 4000);
  const validityDays = Number(input.validityDays ?? 0);
  const warrantyMonths = Number(input.warrantyMonths ?? 0);
  if (!Number.isInteger(validityDays) || validityDays < 0 || validityDays > 9999) {
    throw new AppError("Số ngày hiệu lực báo giá không hợp lệ.", 400);
  }
  if (!Number.isInteger(warrantyMonths) || warrantyMonths < 0 || warrantyMonths > 999) {
    throw new AppError("Số tháng bảo hành không hợp lệ.", 400);
  }
  const taxRaw = String(input.taxPercent ?? "10").trim();
  const defaultTaxBps = taxRaw === "chua" ? -1 : taxRateBps(Number(taxRaw));
  const paymentMilestones = chuanDotThanhToan(input.paymentMilestones);
  const loiPhanTram = loiTongPhanTramThanhToan(paymentMilestones);
  if (loiPhanTram) throw new AppError(loiPhanTram, 400);
  await prisma.quotationStandard.update({
    where: { id: ID },
    data: {
      greeting,
      quoteNote,
      validityDays,
      warrantyMonths,
      defaultTaxBps,
      paymentMilestones,
    },
  });
  await prisma.$transaction(async (tx) => {
    await writeAudit(tx, user.id, "sua", "tieu_chuan_bao_gia", ID, "Cập nhật cấu hình báo giá");
  });
  return getTieuChuanBaoGia(user);
}
