import type { User } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { assertOwn } from "@/modules/system/access";
import { costCategoryLabel, type CostCategory } from "@/modules/projects/cost-fields";
import { hangMucAmount } from "@/modules/projects/item-fields";
import { orderLineAmount } from "@/modules/projects/orders";
import { thayChiPhiChung } from "@/modules/projects/shared-costs";
import { tinhSoTongQuan, type NhomChiPhi, type SoTongQuan } from "@/modules/projects/overview-figures";

const HO_SO_CONG_TY = "mac-dinh";

export type BangTongQuan = SoTongQuan & {
  nhomChiPhi: NhomChiPhi[];
  khoanChung: { name: string; rateBps: number }[];
  hienChiPhiChung: boolean;
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

  const [hangMuc, chiPhi, donHang, chung, hoSo] = await Promise.all([
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
      select: { kind: true, lines: { select: { totalGrams: true, quantityMilli: true, unitPrice: true, lengthMm: true, barCount: true } } },
    }),
    prisma.projectSharedCost.findMany({
      where: { projectId },
      select: { name: true, rateBps: true },
      orderBy: { name: "asc" },
    }),
    prisma.companyProfile.findUnique({ where: { id: HO_SO_CONG_TY }, select: { incomeTaxBps: true } }),
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
    (tong, don) => tong + don.lines.reduce((dong, line) => dong + orderLineAmount(don.kind, line), 0),
    0,
  );
  const thay = thayChiPhiChung(user);
  const so = tinhSoTongQuan({
    vatPercent: project.vatPercent,
    thanhTien: hangMuc.map((dong) => hangMucAmount(dong.unitPrice, dong.quantityMilli)),
    tyLeChungBps: thay ? chung.map((dong) => dong.rateBps) : [],
    tienDonHang,
    tienCongTrinh: tienChi.reduce((tong, tien) => tong + tien, 0),
    thueTndnBps: hoSo?.incomeTaxBps ?? null,
  });
  return {
    ...so,
    nhomChiPhi,
    khoanChung: thay ? chung.map((dong) => ({ name: dong.name, rateBps: dong.rateBps })) : [],
    hienChiPhiChung: thay,
  };
}
