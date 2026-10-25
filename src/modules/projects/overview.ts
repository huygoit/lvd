import type { User } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { assertOwn } from "@/modules/system/access";
import { costCategoryLabel, type CostCategory } from "@/modules/projects/cost-fields";
import { hangMucAmount } from "@/modules/projects/item-fields";
import { tinhSoTongQuan, type NhomChiPhi, type SoTongQuan } from "@/modules/projects/overview-figures";

export type BangTongQuan = SoTongQuan & {
  nhomChiPhi: NhomChiPhi[];
  khoanChung: { name: string; rateBps: number }[];
};

function soTien(amount: bigint) {
  const tien = Number(amount);
  if (!Number.isSafeInteger(tien)) throw new AppError("Số tiền chi phí không đọc được.", 500);
  return tien;
}

function nhanNhom(nhom: string) {
  if (nhom in costCategoryLabel) return costCategoryLabel[nhom as CostCategory];
  return nhom;
}

export async function readProjectOverview(user: User, projectId: string): Promise<BangTongQuan> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true, vatPercent: true },
  });
  if (!project) throw new AppError("Không tìm thấy công trình.", 404);
  assertOwn(user, "projects.view", "projects.view.assigned", project.ownerId);

  const [hangMuc, chiPhi, donHang, chung] = await Promise.all([
    prisma.projectItem.findMany({
      where: { projectId },
      select: { unitPrice: true, quantityMilli: true },
    }),
    prisma.projectCost.findMany({
      where: { projectId },
      select: { category: true, amount: true },
    }),
    prisma.projectOrder.findMany({
      where: { projectId, status: "da_luu" },
      select: { kind: true, lines: { select: { totalGrams: true, quantityMilli: true, unitPrice: true } } },
    }),
    prisma.projectSharedCost.findMany({
      where: { projectId },
      select: { name: true, rateBps: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const theoNhom = new Map<string, number>();
  const tienChi = chiPhi.map((dong) => {
    const tien = soTien(dong.amount);
    theoNhom.set(dong.category, (theoNhom.get(dong.category) ?? 0) + tien);
    return tien;
  });

  const nhomChiPhi = [...theoNhom.entries()]
    .map(([nhom, tien]) => ({ nhom, nhan: nhanNhom(nhom), tien }))
    .sort((a, b) => b.tien - a.tien || a.nhan.localeCompare(b.nhan, "vi"));

  const tienDonHang = donHang.reduce(
    (tong, don) => tong + don.lines.reduce((dong, line) => dong + tienDongDon(don.kind, line), 0),
    0,
  );

  return {
    ...tinhSoTongQuan({
      vatPercent: project.vatPercent,
      thanhTien: hangMuc.map((dong) => hangMucAmount(dong.unitPrice, dong.quantityMilli)),
      tyLeChungBps: chung.map((dong) => dong.rateBps),
      tienDonHang,
      tienCongTrinh: tienChi.reduce((tong, tien) => tong + tien, 0),
    }),
    nhomChiPhi,
    khoanChung: chung.map((dong) => ({ name: dong.name, rateBps: dong.rateBps })),
  };
}

function tienDongDon(kind: string, line: { totalGrams: number; quantityMilli: number; unitPrice: number }) {
  if (!line.unitPrice) return 0;
  const coSo = kind === "nhom" ? line.totalGrams : line.quantityMilli;
  return Math.round((coSo * line.unitPrice) / 1000);
}
