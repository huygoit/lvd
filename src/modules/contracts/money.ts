import { priceItem } from "@/modules/quotations/calc";

export type ScopeLine = {
  id: string;
  parentId: string | null;
  kind: string;
  quantity: number | null;
  signedUnitPrice: number | null;
  adminUnitPrice: number | null;
  widthMm: number | null;
  heightMm: number | null;
  taxBps: number | null;
};

export function linePretax(quantity: number | null, unitPrice: number | null, widthMm: number | null, heightMm: number | null) {
  if (quantity === null || unitPrice === null) return null;
  if (quantity === 0) return 0;
  return priceItem({
    groupKey: "pham-vi",
    name: "dòng phạm vi",
    widthMm,
    heightMm,
    quantity,
    mainUnitPrice: unitPrice,
    accessoryUnitPrice: 0,
  }).pretax;
}

export function leafLines<T extends { id: string; parentId: string | null }>(lines: T[]) {
  const parents = new Set(lines.map((line) => line.parentId).filter((id): id is string => Boolean(id)));
  return lines.filter((line) => !parents.has(line.id));
}

function childrenByParent(lines: ScopeLine[]) {
  const map = new Map<string, ScopeLine[]>();
  for (const line of lines) {
    if (!line.parentId) continue;
    const list = map.get(line.parentId) ?? [];
    list.push(line);
    map.set(line.parentId, list);
  }
  return map;
}

function hasPricedDescendant(id: string, field: "signedUnitPrice" | "adminUnitPrice", map: Map<string, ScopeLine[]>): boolean {
  for (const child of map.get(id) ?? []) {
    if (child[field] !== null) return true;
    if (hasPricedDescendant(child.id, field, map)) return true;
  }
  return false;
}

export function placementError(kind: string, parentKind: string | null) {
  if (kind === "diem") return parentKind ? "Gói/điểm nằm ngay dưới hợp đồng." : null;
  if (kind === "nha") return parentKind && parentKind !== "diem" ? "Hạng mục/nhà gắn vào gói/điểm, hoặc để ngay dưới hợp đồng khi chưa cần điểm." : null;
  if (kind === "ky_hieu") return parentKind && parentKind !== "diem" && parentKind !== "nha" ? "Ký hiệu cửa gắn vào nhà, điểm, hoặc ngay dưới hợp đồng." : null;
  if (kind === "bo") return parentKind !== "ky_hieu" ? "Bộ nằm dưới ký hiệu cửa." : null;
  return "Loại phạm vi không hợp lệ.";
}

export function sumLeaves(lines: ScopeLine[], field: "signedUnitPrice" | "adminUnitPrice") {
  const map = childrenByParent(lines);
  let total = 0;
  let any = false;
  for (const line of lines) {
    if (hasPricedDescendant(line.id, field, map)) continue;
    if (line[field] === null) {
      if (line.kind === "ky_hieu" && (map.get(line.id) ?? []).length === 0) return null;
      continue;
    }
    const amount = linePretax(line.quantity, line[field], line.widthMm, line.heightMm);
    if (amount === null) {
      if (line.kind === "bo") continue;
      return null;
    }
    any = true;
    total += amount;
  }
  return any ? total : null;
}

export function controlWarning(declared: number | null, lineSum: number | null) {
  if (declared === null || lineSum === null) return null;
  if (declared === lineSum) return null;
  return "Tổng khai báo khác tổng các dòng lá. Hệ thống không tự thêm dòng bù.";
}
