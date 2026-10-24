import type { Prisma } from "@prisma/client";
import { todayYmd } from "@/shared/lib/dates";

export async function nextCode(tx: Prisma.TransactionClient, key: "KH" | "CT" | "BG" | "HD" | "DT" | "PK" | "DH" | "YC" | "TD" | "CP" | "GH", now: Date) {
  const year = Number(todayYmd(now).slice(0, 4));
  await tx.codeSequence.upsert({
    where: { key_year: { key, year } },
    create: { key, year, lastNumber: 0 },
    update: {},
  });
  const row = await tx.codeSequence.update({
    where: { key_year: { key, year } },
    data: { lastNumber: { increment: 1 } },
  });
  return `${key}-${year}-${String(row.lastNumber).padStart(4, "0")}`;
}
