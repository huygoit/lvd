import type { User } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { isGlassMaterial } from "@/shared/catalog/materials";
import { formatStockQty } from "@/shared/catalog/stock";
import { formatYmd, todayYmd } from "@/shared/lib/dates";
import { assertOwn } from "@/modules/system/access";
import { listMaterialsAtProject } from "@/modules/stock/service";

type DonDaLuu = {
  key: string;
  code: string;
  orderedOn: string;
  supplierName: string;
  qty: number;
  lengthMm: number;
};

// Nhãn nơi đến rút gọn cho cột Ghi chú.
function nhanNoiDen(toKind: string) {
  if (toKind === "kho") return "nhà kho";
  if (toKind === "xuong") return "nhà xưởng";
  return "công trình";
}

export async function listProjectMaterials(user: User, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } });
  if (!project) throw new AppError("Không tìm thấy công trình.", 404);
  assertOwn(user, "projects.view", "projects.view.assigned", project.ownerId);
  const stock = await listMaterialsAtProject(projectId);
  const lines = await prisma.projectOrderLine.findMany({
    where: { order: { projectId, status: "da_luu" }, materialId: { not: null } },
    select: {
      materialId: true,
      barCount: true,
      lengthMm: true,
      quantityMilli: true,
      order: { select: { id: true, code: true, kind: true, createdAt: true, supplierName: true, partner: { select: { name: true } } } },
    },
  });
  const daNhan = await prisma.stockSlipLine.findMany({
    where: {
      materialId: { not: "" },
      slip: { projectId, kind: "giao_hang", status: "da_nhan", fromKind: { not: "kho" } },
    },
    select: {
      materialId: true,
      receivedQty: true,
      slip: { select: { toKind: true } },
    },
  });
  const dangGiao = await prisma.stockSlipLine.findMany({
    where: {
      materialId: { not: "" },
      slip: { projectId, kind: "giao_hang", status: "cho_nhan", fromKind: { not: "kho" } },
    },
    select: {
      materialId: true,
      documentQty: true,
      slip: { select: { toKind: true } },
    },
  });
  const transit = new Map<string, number>();
  // Gộp SL đang giao theo vật tư + nơi đến (công trình / nhà kho / nhà xưởng).
  const dangGiaoTheoNoi = new Map<string, Map<string, number>>();
  for (const row of dangGiao) {
    transit.set(row.materialId, (transit.get(row.materialId) ?? 0) + row.documentQty);
    const noi = nhanNoiDen(row.slip.toKind || "cong_trinh");
    const theoNoi = dangGiaoTheoNoi.get(row.materialId) ?? new Map<string, number>();
    theoNoi.set(noi, (theoNoi.get(noi) ?? 0) + row.documentQty);
    dangGiaoTheoNoi.set(row.materialId, theoNoi);
  }
  const receivedAll = new Map<string, number>();
  const receivedKho = new Map<string, number>();
  const receivedXuong = new Map<string, number>();
  for (const row of daNhan) {
    receivedAll.set(row.materialId, (receivedAll.get(row.materialId) ?? 0) + row.receivedQty);
    if (row.slip.toKind === "kho") receivedKho.set(row.materialId, (receivedKho.get(row.materialId) ?? 0) + row.receivedQty);
    if (row.slip.toKind === "xuong") receivedXuong.set(row.materialId, (receivedXuong.get(row.materialId) ?? 0) + row.receivedQty);
  }
  const ids = [...new Set(lines.map((line) => line.materialId).filter((id): id is string => Boolean(id)))];
  const cards = ids.length
    ? await prisma.material.findMany({ where: { id: { in: ids } }, select: { id: true, code: true, name: true, stockUnit: true } })
    : [];
  const cardOf = new Map(cards.map((card) => [card.id, card]));
  const orderQty = new Map<string, number>();
  const grouped = new Map<string, DonDaLuu & { materialId: string; at: number }>();
  for (const line of lines) {
    if (!line.materialId) continue;
    const nhom = line.order.kind === "nhom";
    const qty = nhom ? line.barCount * 1000 : line.quantityMilli;
    const lengthMm = nhom ? line.lengthMm : 0;
    orderQty.set(line.materialId, (orderQty.get(line.materialId) ?? 0) + qty);
    const key = `${line.order.id}:${line.materialId}:${lengthMm}`;
    const current = grouped.get(key);
    if (current) {
      current.qty += qty;
      continue;
    }
    grouped.set(key, {
      key,
      materialId: line.materialId,
      code: line.order.code,
      orderedOn: formatYmd(todayYmd(line.order.createdAt)),
      supplierName: line.order.partner?.name || line.order.supplierName,
      qty,
      lengthMm,
      at: line.order.createdAt.getTime(),
    });
  }
  const ordersOf = new Map<string, DonDaLuu[]>();
  const slices = [...grouped.values()].sort((a, b) => b.at - a.at || a.code.localeCompare(b.code, "vi") || b.lengthMm - a.lengthMm);
  for (const slice of slices) {
    const list = ordersOf.get(slice.materialId) ?? [];
    list.push({ key: slice.key, code: slice.code, orderedOn: slice.orderedOn, supplierName: slice.supplierName, qty: slice.qty, lengthMm: slice.lengthMm });
    ordersOf.set(slice.materialId, list);
  }
  function conONcc(materialId: string) {
    const dat = orderQty.get(materialId) ?? 0;
    const daVe = receivedAll.get(materialId) ?? 0;
    return Math.max(0, dat - daVe);
  }

  // Chỉ ghi chú đang giao từ NCC — ngắn, có SL + nơi đến.
  function ghiChuCua(materialId: string, shipping: number) {
    const theoNoi = dangGiaoTheoNoi.get(materialId);
    if (theoNoi?.size) {
      return [...theoNoi.entries()].map(([noi, sl]) => `Đang giao ${formatStockQty(sl)} từ NCC đến ${noi}`);
    }
    if (shipping > 0) return [`Đang giao ${formatStockQty(shipping)} từ NCC`];
    return [] as string[];
  }

  const materials = stock.materials.map((row) => {
    const supplierQty = conONcc(row.materialId);
    const xuongQty = receivedXuong.get(row.materialId) ?? 0;
    return {
      ...row,
      orderQty: orderQty.get(row.materialId) ?? 0,
      supplierQty,
      khoQty: receivedKho.get(row.materialId) ?? 0,
      xuongQty,
      transitQty: transit.get(row.materialId) ?? 0,
      notes: ghiChuCua(row.materialId, row.shipping),
      orders: ordersOf.get(row.materialId) ?? [],
    };
  });
  for (const [materialId, qty] of orderQty) {
    if (materials.some((row) => row.materialId === materialId)) continue;
    const card = cardOf.get(materialId);
    if (!card) continue;
    const supplierQty = conONcc(materialId);
    const xuongQty = receivedXuong.get(materialId) ?? 0;
    materials.push({
      materialId,
      code: card.code,
      name: card.name,
      unit: card.stockUnit,
      glass: isGlassMaterial(card),
      site: 0,
      installed: 0,
      broken: 0,
      ordered: 0,
      made: 0,
      held: 0,
      shipping: 0,
      mismatch: false,
      slips: [],
      orderQty: qty,
      supplierQty,
      khoQty: receivedKho.get(materialId) ?? 0,
      xuongQty,
      transitQty: transit.get(materialId) ?? 0,
      notes: ghiChuCua(materialId, 0),
      orders: ordersOf.get(materialId) ?? [],
    });
  }
  const count = (pick: (row: (typeof materials)[number]) => number) => materials.filter((row) => pick(row) > 0).length;
  return {
    materials,
    counts: {
      supplier: count((row) => row.ordered + row.made + row.held + row.shipping + row.supplierQty + row.transitQty),
      workshop: count((row) => row.xuongQty),
      site: stock.counts.site,
      warehouse: count((row) => row.khoQty),
      broken: stock.counts.broken,
    },
  };
}
