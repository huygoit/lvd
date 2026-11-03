import type { Prisma } from "@prisma/client";
import { AppError } from "@/shared/errors";
import { todayYmd } from "@/shared/lib/dates";

type CodeKey = "KH" | "CT" | "BG" | "HD" | "DT" | "PK" | "DH" | "YC" | "TD" | "CP" | "GH" | "GC" | "VC";

// Kiểm tra mã đã có trong bảng tương ứng — tránh sequence tụt sau seed/import.
async function maDaCo(tx: Prisma.TransactionClient, key: CodeKey, code: string) {
  const where = { code: { equals: code, mode: "insensitive" as const } };
  const chon = { id: true };
  switch (key) {
    case "KH":
      return Boolean(await tx.customer.findFirst({ where, select: chon }));
    case "CT":
      return Boolean(await tx.project.findFirst({ where, select: chon }));
    case "BG":
      return Boolean(await tx.quotation.findFirst({ where, select: chon }));
    case "HD":
      return Boolean(await tx.contract.findFirst({ where, select: chon }));
    case "DT":
      return Boolean(await tx.partner.findFirst({ where, select: chon }));
    case "PK":
      return Boolean(await tx.stockSlip.findFirst({ where, select: chon }));
    case "DH":
      return Boolean(await tx.projectOrder.findFirst({ where, select: chon }));
    case "YC":
      return Boolean(await tx.fieldSupplyRequest.findFirst({ where, select: chon }));
    case "TD":
      return Boolean(await tx.fieldProgressReport.findFirst({ where, select: chon }));
    case "CP":
      return Boolean(await tx.projectCost.findFirst({ where, select: chon }));
    case "GH":
      return Boolean(await tx.stockSlip.findFirst({ where, select: chon }));
    case "GC":
      return Boolean(await tx.fabricationContract.findFirst({ where, select: chon }));
    case "VC":
      return Boolean(await tx.transportContract.findFirst({ where, select: chon }));
    default:
      return false;
  }
}

export async function nextCode(tx: Prisma.TransactionClient, key: CodeKey, now: Date) {
  const year = Number(todayYmd(now).slice(0, 4));
  await tx.codeSequence.upsert({
    where: { key_year: { key, year } },
    create: { key, year, lastNumber: 0 },
    update: {},
  });
  // Tăng dần đến khi mã trống (sequence lệch sau khi nạp sẵn dữ liệu trên VPS).
  for (let lan = 0; lan < 5000; lan += 1) {
    const row = await tx.codeSequence.update({
      where: { key_year: { key, year } },
      data: { lastNumber: { increment: 1 } },
    });
    const code = `${key}-${year}-${String(row.lastNumber).padStart(4, "0")}`;
    if (!(await maDaCo(tx, key, code))) return code;
  }
  throw new AppError(`Không cấp được mã ${key} mới. Kiểm tra bộ đếm mã trên hệ thống.`, 500);
}
