import { createHash } from "node:crypto";
import type { User } from "@/shared/auth/types";
import { hasAnyCapability } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { canonMeasureUnit } from "@/shared/catalog/units";
import { foldVi } from "@/shared/catalog/materials";
import { assertAny, assertOwn } from "@/modules/system/access";
import { writeAudit } from "@/modules/system/audit";
import { nextCode } from "@/modules/system/codes";
import { phanBoGiao } from "@/modules/deliveries/service";
import { cleanSupplierContact, readOrderPdf, type PdfLine } from "@/modules/projects/order-pdf";
import { docTep, ghiTep, khoaDonHang, noiLuuHienTai, xoaTep, type NoiLuu } from "@/modules/projects/document-store";

const maxSize = 15 * 1024 * 1024;

type LineInput = {
  materialCode?: unknown;
  name?: unknown;
  spec?: unknown;
  unit?: unknown;
  colorCode?: unknown;
  widthMm?: unknown;
  heightMm?: unknown;
  barCount?: unknown;
  lengthM?: unknown;
  kgPerM?: unknown;
  totalKg?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
  vatPercent?: unknown;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function milli(value: unknown) {
  const raw = text(value).replace(/\s/g, "").replace(",", ".");
  if (!raw) return 0;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) throw new AppError("Số lượng không hợp lệ.", 400);
  return Math.round(amount * 1000);
}

function money(value: unknown) {
  const raw = text(value).replace(/\s/g, "").replace(/\./g, "");
  if (!raw) return 0;
  if (!/^\d+$/.test(raw)) throw new AppError("Đơn giá không hợp lệ.", 400);
  const amount = Number(raw);
  if (!Number.isSafeInteger(amount)) throw new AppError("Đơn giá không hợp lệ.", 400);
  return amount;
}

function ngay(value: Date) {
  const shifted = new Date(value.getTime() + 7 * 60 * 60 * 1000);
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${shifted.getUTCFullYear()}`;
}

async function visible(user: User, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, ownerId: true } });
  if (!project) throw new AppError("Không tìm thấy công trình.", 404);
  assertOwn(user, "projects.view", "projects.view.assigned", project.ownerId);
  return project;
}

function canEdit(user: User) {
  if (!hasAnyCapability(user, ["projects.update", "projects.create"])) throw new AppError("Bạn không có quyền sửa đơn hàng.", 403);
}

function unitOf(kind: string, value: unknown) {
  if (kind === "nhom") return "thanh";
  if (kind === "kinh") return "tấm";
  const unit = canonMeasureUnit(text(value).replace("m²", "m2"));
  if (!unit) throw new AppError("Đơn vị tính không có trong danh mục.", 400);
  return unit;
}

function whole(value: unknown) {
  const raw = text(value).replace(/\s/g, "").replace(/[.,]/g, "");
  if (!raw) return 0;
  if (!/^\d+$/.test(raw)) throw new AppError("Kích thước không hợp lệ.", 400);
  return Number(raw);
}

function kindLabel(kind: string) {
  if (kind === "nhom") return "Nhôm";
  if (kind === "kinh") return "Kính";
  return "Bộ, cái";
}

function glassCode(name: string) {
  const digits = name.replace(/\D/g, "").slice(0, 8) || "KINH";
  const plain = foldVi(name);
  const kind = plain.includes("mo") ? "MO" : "TRONG";
  return `K${digits}-${kind}`;
}

function junk(line: PdfLine) {
  const name = foldVi(line.name);
  return name.includes("tong") || name.includes("dat coc") || name.includes("phu thu") || name.includes("cong tien");
}

function fromPdf(kind: string, line: PdfLine, sortOrder: number) {
  if (kind === "kinh") {
    return {
      sortOrder,
      materialCode: line.code.slice(0, 80),
      name: line.name.slice(0, 300),
      spec: line.spec.slice(0, 500),
      unit: "tấm",
      colorCode: line.colorCode.slice(0, 80),
      barCount: line.heightMm,
      lengthMm: line.widthMm,
      gramsPerMeter: 0,
      totalGrams: 0,
      quantityMilli: Math.round(line.quantity * 1000),
      unitPrice: line.unitPrice,
      taxBps: 0,
    };
  }
  const unit = kind === "nhom" ? "thanh" : canonMeasureUnit(line.unit.replace("m²", "m2")) ?? line.unit;
  return {
    sortOrder,
    materialCode: line.code.slice(0, 80),
    name: line.name.slice(0, 300),
    spec: line.spec.slice(0, 500),
    unit,
    colorCode: line.colorCode.slice(0, 40),
    barCount: line.barCount,
    lengthMm: Math.round(line.lengthM * 1000),
    gramsPerMeter: Math.round(line.kgPerM * 1000),
    totalGrams: Math.round(line.totalKg * 1000),
    quantityMilli: kind === "nhom" ? line.barCount * 1000 : Math.round(line.quantity * 1000),
    unitPrice: line.unitPrice,
    taxBps: Math.round(line.vatPercent * 100),
  };
}

async function matchLines(kind: string, lines: ReturnType<typeof fromPdf>[]) {
  if (kind === "kinh") {
    const names = [...new Set(lines.map((line) => line.name).filter(Boolean))];
    const found = names.length
      ? await prisma.material.findMany({ where: { stockUnit: "m2", OR: names.map((name) => ({ name: { equals: name, mode: "insensitive" } })) }, select: { id: true, name: true } })
      : [];
    return lines.map((line) => {
      const hit = found.find((row) => foldVi(row.name) === foldVi(line.name));
      return { ...line, materialId: hit?.id ?? null, isNew: !hit, unit: "tấm" };
    });
  }
  const codes = [...new Set(lines.map((line) => line.materialCode))];
  const found = codes.length
    ? await prisma.material.findMany({ where: { OR: codes.map((code) => ({ code: { equals: code, mode: "insensitive" } })) }, select: { id: true, code: true } })
    : [];
  const byCode = new Map(found.map((row) => [row.code.toLocaleLowerCase("vi"), row]));
  return lines.map((line) => {
    const hit = byCode.get(line.materialCode.toLocaleLowerCase("vi"));
    return { ...line, materialId: hit?.id ?? null, materialCode: hit?.code ?? line.materialCode, isNew: !hit, unit: kind === "nhom" ? "thanh" : line.unit };
  });
}

function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

type DongDon = { materialCode: string; barCount: number; lengthMm: number; quantityMilli: number; totalGrams: number };
type NhaDon = { partnerId: string; supplierName: string; supplierPhone: string };

function tenNha(value: string) {
  return foldVi(value).replace(/\s+/g, " ").trim();
}

function cungNha(left: NhaDon, right: NhaDon) {
  if (left.partnerId && left.partnerId === right.partnerId) return true;
  const tenLeft = tenNha(left.supplierName);
  const tenRight = tenNha(right.supplierName);
  if (!tenLeft || tenLeft !== tenRight) return false;
  const dtLeft = phoneDigits(left.supplierPhone);
  const dtRight = phoneDigits(right.supplierPhone);
  if (dtLeft && dtRight && dtLeft !== dtRight) return false;
  return true;
}

function khoaDong(line: DongDon) {
  return [line.materialCode.trim().toLocaleLowerCase("vi"), line.barCount, line.lengthMm, line.quantityMilli, line.totalGrams].join(":");
}

function khoaNoiDung(lines: DongDon[]) {
  return lines.map(khoaDong).sort().join("|");
}

async function chanDonTrung(projectId: string, hash: string, kind: string, nha: NhaDon, lines: DongDon[]) {
  if (hash) {
    const cungTep = await prisma.projectOrder.findFirst({
      where: { projectId, fileHash: hash },
      select: { code: true },
    });
    if (cungTep) throw new AppError(`Tệp này đã được đọc thành đơn ${cungTep.code}. Không tạo thêm.`, 409);
  }
  if (!lines.length || (!tenNha(nha.supplierName) && !nha.partnerId)) return;
  const dau = khoaNoiDung(lines);
  const rows = await prisma.projectOrder.findMany({
    where: { projectId, kind },
    select: {
      code: true,
      partnerId: true,
      supplierName: true,
      supplierPhone: true,
      lines: { select: { materialCode: true, barCount: true, lengthMm: true, quantityMilli: true, totalGrams: true } },
    },
  });
  const trung = rows.find((row) => cungNha(nha, { partnerId: row.partnerId ?? "", supplierName: row.supplierName, supplierPhone: row.supplierPhone }) && khoaNoiDung(row.lines) === dau);
  if (trung) throw new AppError(`Nội dung trùng đơn ${trung.code}. Cùng nhà cung cấp và cùng các dòng hàng.`, 409);
}

function samePlace(left: string, right: string) {
  return foldVi(left).replace(/\s+/g, " ") === foldVi(right).replace(/\s+/g, " ");
}

async function matchSupplier(name: string, address: string, phone: string) {
  if (!name.trim()) return null;
  const digits = phoneDigits(phone);
  const rows = await prisma.partner.findMany({
    where: { status: "dang_dung", name: { equals: name, mode: "insensitive" } },
    select: {
      id: true,
      code: true,
      name: true,
      address: true,
      phone: true,
      email: true,
      website: true,
      taxCode: true,
      bankName: true,
      accountNumber: true,
      representativeName: true,
      representativeTitle: true,
      roles: { select: { role: true } },
    },
  });
  if (address.trim() && digits) return rows.find((row) => samePlace(row.address, address) && phoneDigits(row.phone) === digits) ?? null;
  const khop = rows.filter((row) => {
    if (address.trim() && !samePlace(row.address, address)) return false;
    if (digits && phoneDigits(row.phone) !== digits) return false;
    return true;
  });
  return khop.length === 1 ? khop[0] : null;
}

// Chỉ điền ô đang trống. Ô đã có dữ liệu giữ nguyên.
function supplierGaps(partner: { email: string; website: string; taxCode: string; bankName: string; accountNumber: string; representativeName: string; representativeTitle: string }, incoming: { email: string; website: string; taxCode: string; bankName: string; accountNumber: string; representativeName: string; representativeTitle: string }) {
  const data: Partial<typeof incoming> = {};
  const dien = (key: keyof typeof incoming, current: string, next: string) => {
    if (!current.trim() && next.trim()) data[key] = next.trim();
  };
  dien("email", partner.email, incoming.email);
  dien("website", partner.website, incoming.website);
  dien("taxCode", partner.taxCode, incoming.taxCode);
  dien("bankName", partner.bankName, incoming.bankName);
  dien("accountNumber", partner.accountNumber, incoming.accountNumber);
  dien("representativeName", partner.representativeName, incoming.representativeName);
  dien("representativeTitle", partner.representativeTitle, incoming.representativeTitle);
  return data;
}

function supplierBank(bankName: string, accountNumber: string) {
  const name = bankName.trim();
  const number = accountNumber.replace(/[\s.-]/g, "");
  if (!name || !/^\d{6,20}$/.test(number)) return { bankName: "", accountNumber: "" };
  return { bankName: name.slice(0, 80), accountNumber: number };
}

export function orderLineAmount(kind: string, line: { totalGrams: number; quantityMilli: number; unitPrice: number; lengthMm: number; barCount: number }) {
  if (!line.unitPrice) return 0;
  if (kind === "kinh") {
    const tam = line.quantityMilli / 1000;
    const metVuong = Math.round((line.lengthMm * line.barCount * tam) / 10_000);
    return Math.round((metVuong * line.unitPrice) / 100);
  }
  const base = kind === "nhom" ? line.totalGrams : line.quantityMilli;
  return Math.round(base * line.unitPrice / 1000);
}

function present(order: {
  id: string;
  code: string;
  kind: string;
  status: string;
  supplierName: string;
  supplierAddress: string;
  supplierPhone: string;
  supplierBankName: string;
  supplierAccountNumber: string;
  supplierWebsite: string;
  supplierEmail: string;
  supplierTaxCode: string;
  supplierRepresentativeName: string;
  supplierRepresentativeTitle: string;
  headerNote: string;
  fileName: string;
  createdAt: Date;
  partner: { id: string; code: string; name: string } | null;
  lines: {
    id: string;
    sortOrder: number;
    materialId: string | null;
    materialCode: string;
    name: string;
    spec: string;
    unit: string;
    colorCode: string;
    barCount: number;
    lengthMm: number;
    gramsPerMeter: number;
    totalGrams: number;
    quantityMilli: number;
    unitPrice: number;
    taxBps: number;
  }[];
}, delivery = "", canShip = true, shipped = false) {
  return {
    id: order.id,
    code: order.code,
    kind: order.kind,
    kindLabel: kindLabel(order.kind),
    status: order.status,
    delivery,
    canShip,
    shipped,
    statusLabel: order.status === "da_luu" ? "Đã lưu" : "Chờ xem",
    supplierName: order.partner?.name || order.supplierName,
    supplierCode: order.partner?.code ?? "",
    supplierAddress: order.supplierAddress,
    supplierPhone: order.supplierPhone,
    supplierBankName: order.supplierBankName,
    supplierAccountNumber: order.supplierAccountNumber,
    supplierWebsite: order.supplierWebsite,
    supplierEmail: order.supplierEmail,
    supplierTaxCode: order.supplierTaxCode,
    supplierRepresentativeName: order.supplierRepresentativeName,
    supplierRepresentativeTitle: order.supplierRepresentativeTitle,
    partnerId: order.partner?.id ?? "",
    supplierIsNew: !order.partner,
    headerNote: order.headerNote,
    fileName: order.fileName,
    createdOn: ngay(order.createdAt),
    amount: order.lines.reduce((sum, line) => sum + orderLineAmount(order.kind, line), 0),
    lines: order.lines.map((line) => ({
      id: line.id,
      sortOrder: line.sortOrder,
      materialId: line.materialId ?? "",
      materialCode: line.materialCode,
      name: line.name,
      spec: line.spec,
      unit: line.unit,
      colorCode: line.colorCode,
      barCount: line.barCount,
      lengthM: line.lengthMm / 1000,
      widthMm: line.lengthMm,
      heightMm: line.barCount,
      kgPerM: line.gramsPerMeter / 1000,
      totalKg: line.totalGrams / 1000,
      quantity: line.quantityMilli / 1000,
      unitPrice: line.unitPrice,
      vatPercent: line.taxBps / 100,
    isNew: !line.materialId,
    })),
  };
}

const include = { partner: { select: { id: true, code: true, name: true } }, lines: { orderBy: { sortOrder: "asc" as const } } };

async function conDuocGiao(rows: { id: string; kind: string; lines: { id: string; materialId: string | null; barCount: number; lengthMm: number; quantityMilli: number }[] }[]) {
  if (!rows.length) return new Map<string, { canShip: boolean; shipped: boolean }>();
  const slips = await prisma.stockSlip.findMany({
    where: { orderId: { in: rows.map((row) => row.id) }, kind: "giao_hang", status: { in: ["cho_nhan", "da_nhan"] } },
    select: {
      orderId: true,
      status: true,
      toKind: true,
      lines: { select: { orderLineId: true, materialId: true, lengthMm: true, documentQty: true, receivedQty: true } },
    },
  });
  const byOrder = new Map<string, typeof slips>();
  for (const slip of slips) {
    if (!slip.orderId) continue;
    const list = byOrder.get(slip.orderId) ?? [];
    list.push(slip);
    byOrder.set(slip.orderId, list);
  }
  return new Map(rows.map((row) => {
    const sent = byOrder.get(row.id) ?? [];
    return [row.id, { canShip: phanBoGiao(row.kind, row.lines, sent).some((line) => line.remaining > 0), shipped: sent.length > 0 }];
  }));
}

async function deliveryMark(ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const slips = await prisma.stockSlip.findMany({
    where: { orderId: { in: ids }, kind: "giao_hang" },
    select: { orderId: true, status: true },
    orderBy: { createdAt: "desc" },
  });
  const marks = new Map<string, string>();
  for (const slip of slips) {
    if (!slip.orderId || marks.has(slip.orderId)) continue;
    marks.set(slip.orderId, slip.status === "cho_nhan" || slip.status === "da_nhan" ? slip.status : "");
  }
  return marks;
}

export async function listProjectOrders(user: User, projectId: string) {
  await visible(user, projectId);
  const rows = await prisma.projectOrder.findMany({ where: { projectId }, include, orderBy: { createdAt: "desc" } });
  const marks = await deliveryMark(rows.map((row) => row.id));
  const open = await conDuocGiao(rows);
  return rows.map((row) => present(row, marks.get(row.id) ?? "", open.get(row.id)?.canShip ?? false, open.get(row.id)?.shipped ?? false));
}

export async function getProjectOrder(user: User, projectId: string, orderId: string) {
  await visible(user, projectId);
  const row = await prisma.projectOrder.findFirst({ where: { id: orderId, projectId }, include });
  if (!row) throw new AppError("Không tìm thấy đơn hàng.", 404);
  const marks = await deliveryMark([row.id]);
  const open = await conDuocGiao([row]);
  return present(row, marks.get(row.id) ?? "", open.get(row.id)?.canShip ?? false, open.get(row.id)?.shipped ?? false);
}

export async function importProjectOrder(user: User, projectId: string, file: File, onStage: (stage: string) => void) {
  canEdit(user);
  await visible(user, projectId);
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) throw new AppError("Chỉ nhận file PDF.", 400);
  if (file.size <= 0 || file.size > maxSize) throw new AppError("Tệp cần nhỏ hơn 15 MB.", 400);
  onStage("doc");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") throw new AppError("Tệp không phải PDF.", 400);
  const fileHash = createHash("sha256").update(bytes).digest("hex");
  const parsed = await readOrderPdf(bytes);
  onStage("doi");
  const kept = parsed.lines.filter((line) => !junk(line));
  if (!kept.length) throw new AppError("Không bóc được dòng hàng nào trong tệp.", 400);
  const shaped = await matchLines(parsed.kind, kept.map((line, index) => fromPdf(parsed.kind, line, index + 1)));
  const supplier = await matchSupplier(parsed.supplierName, parsed.supplierAddress, parsed.supplierPhone);
  await chanDonTrung(projectId, fileHash, parsed.kind, {
    partnerId: supplier?.id ?? "",
    supplierName: supplier?.name || parsed.supplierName,
    supplierPhone: parsed.supplierPhone,
  }, shaped);
  const noi = noiLuuHienTai();
  const storedName = khoaDonHang(noi);
  await ghiTep(noi, storedName, bytes, "application/pdf");
  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
    const code = await nextCode(tx, "DH", new Date());
    const order = await tx.projectOrder.create({
      data: {
        code,
        projectId,
        partnerId: supplier?.id,
        supplierName: supplier?.name || parsed.supplierName,
        supplierAddress: parsed.supplierAddress,
        supplierPhone: parsed.supplierPhone,
        supplierBankName: parsed.supplierBankName,
        supplierAccountNumber: parsed.supplierAccountNumber,
        supplierWebsite: parsed.supplierWebsite,
        supplierEmail: parsed.supplierEmail,
        supplierTaxCode: parsed.supplierTaxCode,
        supplierRepresentativeName: parsed.supplierRepresentativeName,
        supplierRepresentativeTitle: parsed.supplierRepresentativeTitle,
        kind: parsed.kind,
        status: "cho_xem",
        fileName: file.name.slice(0, 180),
        storedName,
        fileStore: noi,
        fileHash,
        headerNote: parsed.headerNote,
        lines: { create: shaped.map(({ isNew: _isNew, ...line }) => line) },
      },
      include,
    });
    await writeAudit(tx, user.id, "tao", "don_hang", order.id, `Bóc tách ${order.code}`);
    return order;
    });
  } catch (error) {
    await xoaTep(noi, storedName).catch(() => undefined);
    throw error;
  }
  return present(created);
}

function cleanLine(kind: string, input: LineInput, sortOrder: number) {
  const materialCode = text(input.materialCode);
  const name = text(input.name);
  if (!materialCode) throw new AppError(kind === "kinh" ? "Cần nhập ký hiệu." : "Cần nhập mã hàng.", 400);
  if (!name) throw new AppError("Cần nhập tên hàng.", 400);
  if (kind === "kinh") {
    const width = whole(input.widthMm);
    const height = whole(input.heightMm);
    if (width <= 0 || height <= 0) throw new AppError(`${materialCode} thiếu kích thước.`, 400);
    return {
      sortOrder,
      materialCode,
      name,
      spec: text(input.spec).slice(0, 500),
      unit: "tấm",
      colorCode: text(input.colorCode).slice(0, 120),
      barCount: height,
      lengthMm: width,
      gramsPerMeter: 0,
      totalGrams: 0,
      quantityMilli: milli(input.quantity),
      unitPrice: money(input.unitPrice),
      taxBps: 0,
    };
  }
  const unit = unitOf(kind, input.unit);
  const barCount = kind === "nhom" ? Math.round(milli(input.barCount) / 1000) : 0;
  const lengthMm = kind === "nhom" ? milli(input.lengthM) : 0;
  const gramsPerMeter = kind === "nhom" ? milli(input.kgPerM) : 0;
  const totalGrams = kind === "nhom" ? milli(input.totalKg) : 0;
  if (kind === "nhom" && gramsPerMeter <= 0) throw new AppError(`${materialCode} thiếu kg/m.`, 400);
  return {
    sortOrder,
    materialCode,
    name,
    spec: text(input.spec).slice(0, 500),
    unit,
    colorCode: text(input.colorCode).slice(0, 40),
    barCount,
    lengthMm,
    gramsPerMeter,
    totalGrams,
    quantityMilli: kind === "nhom" ? barCount * 1000 : milli(input.quantity),
    unitPrice: money(input.unitPrice),
    taxBps: Math.round(Math.max(0, Number(text(input.vatPercent).replace(",", ".")) || 0) * 100),
  };
}

export async function saveProjectOrder(user: User, projectId: string, orderId: string, input: { supplierName?: unknown; supplierAddress?: unknown; supplierPhone?: unknown; supplierBankName?: unknown; supplierAccountNumber?: unknown; supplierWebsite?: unknown; supplierEmail?: unknown; supplierTaxCode?: unknown; supplierRepresentativeName?: unknown; supplierRepresentativeTitle?: unknown; headerNote?: unknown; lines?: unknown }) {
  canEdit(user);
  await visible(user, projectId);
  const current = await prisma.projectOrder.findFirst({ where: { id: orderId, projectId } });
  if (!current) throw new AppError("Không tìm thấy đơn hàng.", 404);
  const given = (value: unknown, fallback: string) => value === undefined || value === null ? fallback : text(value);
  const supplierName = given(input.supplierName, current.supplierName);
  const supplierAddress = given(input.supplierAddress, current.supplierAddress);
  const supplierPhone = given(input.supplierPhone, current.supplierPhone);
  const bank = supplierBank(given(input.supplierBankName, current.supplierBankName), given(input.supplierAccountNumber, current.supplierAccountNumber));
  const rawWebsite = given(input.supplierWebsite, current.supplierWebsite);
  const rawEmail = given(input.supplierEmail, current.supplierEmail);
  const rawTaxCode = given(input.supplierTaxCode, current.supplierTaxCode);
  const contact = cleanSupplierContact(supplierName, {
    website: rawWebsite,
    email: rawEmail,
    taxCode: rawTaxCode,
    representativeName: given(input.supplierRepresentativeName, current.supplierRepresentativeName),
    representativeTitle: given(input.supplierRepresentativeTitle, current.supplierRepresentativeTitle),
  }, true);
  if (rawWebsite.trim() && !contact.supplierWebsite) throw new AppError("Website nhà cung cấp không đúng.", 400);
  if (rawEmail.trim() && !contact.supplierEmail) throw new AppError("Email nhà cung cấp không đúng.", 400);
  if (rawTaxCode.trim() && !contact.supplierTaxCode) throw new AppError("Mã số thuế không đúng.", 400);
  const headerNote = given(input.headerNote, current.headerNote);
  if (!supplierName) throw new AppError("Đơn hàng không hợp lệ. Thiếu tên nhà cung cấp.", 400);
  const digits = phoneDigits(supplierPhone);
  if (digits && (digits.length < 9 || digits.length > 12)) throw new AppError("Đơn hàng không hợp lệ. Số điện thoại nhà cung cấp không đúng.", 400);
  const rawLines = Array.isArray(input.lines) ? input.lines : [];
  if (!rawLines.length) throw new AppError("Đơn chưa có dòng hàng.", 400);
  const lines = rawLines.map((line, index) => cleanLine(current.kind, line as LineInput, index + 1));
  const needsMaterial = lines.some((line) => line.materialCode);
  if (needsMaterial) assertAny(user, ["inventory.create", "inventory.update"]);
  const known = await matchSupplier(supplierName, supplierAddress, supplierPhone);
  const gaps = known ? supplierGaps(known, {
    email: contact.supplierEmail,
    website: contact.supplierWebsite,
    taxCode: contact.supplierTaxCode,
    bankName: bank.bankName,
    accountNumber: bank.accountNumber,
    representativeName: contact.supplierRepresentativeName,
    representativeTitle: contact.supplierRepresentativeTitle,
  }) : {};
  const needRole = known ? !known.roles.some((item) => item.role === "nha_cung_cap") : false;
  if (!known) assertAny(user, ["partners.create"]);
  if (known && (Object.keys(gaps).length || needRole)) assertAny(user, ["partners.update"]);
  const saved = await prisma.$transaction(async (tx) => {
    let partnerId = known?.id ?? "";
    let partnerCode = known?.code ?? "";
    if (known && gaps.taxCode) {
      const taken = await tx.partner.findFirst({
        where: { taxCode: gaps.taxCode, status: "dang_dung", NOT: { id: known.id } },
        select: { code: true, name: true },
      });
      if (taken) throw new AppError(`Mã số thuế đã thuộc ${taken.code} · ${taken.name}.`, 409);
    }
    if (known && (Object.keys(gaps).length || needRole)) {
      if (Object.keys(gaps).length) {
        await tx.partner.update({ where: { id: known.id }, data: { ...gaps, revision: { increment: 1 } } });
      }
      if (needRole) await tx.partnerRole.create({ data: { partnerId: known.id, role: "nha_cung_cap" } });
      await writeAudit(tx, user.id, "sua", "doi_tac", known.id, Object.keys(gaps).length ? `Bổ sung thông tin còn trống cho ${known.code} từ đơn hàng` : `Gắn vai trò nhà cung cấp cho ${known.code} từ đơn hàng`);
    }
    if (!known) {
      const code = await nextCode(tx, "DT", new Date());
      const partner = await tx.partner.create({
        data: {
          code,
          name: supplierName,
          address: supplierAddress,
          phone: supplierPhone,
          bankName: bank.bankName,
          accountNumber: bank.accountNumber,
          website: contact.supplierWebsite,
          email: contact.supplierEmail,
          taxCode: contact.supplierTaxCode,
          representativeName: contact.supplierRepresentativeName,
          representativeTitle: contact.supplierRepresentativeTitle,
          roles: { create: { role: "nha_cung_cap" } },
        },
      });
      partnerId = partner.id;
      partnerCode = partner.code;
      await writeAudit(tx, user.id, "tao", "doi_tac", partner.id, `Thêm nhà cung cấp ${partner.code} từ đơn hàng`);
    }
    await tx.projectOrderLine.deleteMany({ where: { orderId } });
    const materialIds = new Map<string, string>();
    for (const line of lines) {
      const key = current.kind === "kinh" ? foldVi(line.name) : line.materialCode.toLocaleLowerCase("vi");
      if (materialIds.has(key)) continue;
      if (current.kind === "kinh") {
        const found = await tx.material.findFirst({ where: { stockUnit: "m2", name: { equals: line.name, mode: "insensitive" } }, select: { id: true } });
        if (found) {
          materialIds.set(key, found.id);
          continue;
        }
        const taken = await tx.material.findUnique({ where: { code: glassCode(line.name) }, select: { id: true } });
        const code = taken ? `${glassCode(line.name)}-${line.sortOrder}` : glassCode(line.name);
        const created = await tx.material.create({
          data: { code, name: line.name, spec: line.spec, stockUnit: "m2", priceBasis: "sl", nature: "vat_tu", groupName: "", supplierCode: partnerCode },
        });
        materialIds.set(key, created.id);
        await writeAudit(tx, user.id, "tao", "vat_tu", created.id, `Thêm vật tư ${created.code} từ đơn kính`);
        continue;
      }
      const found = await tx.material.findFirst({ where: { code: { equals: line.materialCode, mode: "insensitive" } }, select: { id: true, code: true } });
      if (found) {
        line.materialCode = found.code;
        materialIds.set(key, found.id);
        continue;
      }
      const created = await tx.material.create({
        data: {
          code: line.materialCode,
          name: line.name,
          groupName: current.kind === "nhom" ? "Nhôm" : "",
          supplierCode: partnerCode,
          spec: line.spec,
          stockUnit: line.unit,
          priceBasis: current.kind === "nhom" ? "kg" : "sl",
          gramsPerMeter: current.kind === "nhom" ? line.gramsPerMeter : null,
          nature: "vat_tu",
          taxBps: line.taxBps,
        },
      });
      materialIds.set(key, created.id);
      await writeAudit(tx, user.id, "tao", "vat_tu", created.id, `Thêm vật tư ${created.code} từ đơn hàng`);
    }
    await tx.projectOrderLine.createMany({
      data: lines.map((line) => ({
        ...line,
        orderId,
        materialId: materialIds.get(current.kind === "kinh" ? foldVi(line.name) : line.materialCode.toLocaleLowerCase("vi")) ?? null,
      })),
    });
    const order = await tx.projectOrder.update({
      where: { id: orderId },
      data: {
        partnerId,
        supplierName,
        supplierAddress,
        supplierPhone,
        supplierBankName: bank.bankName,
        supplierAccountNumber: bank.accountNumber,
        supplierWebsite: contact.supplierWebsite,
        supplierEmail: contact.supplierEmail,
        supplierTaxCode: contact.supplierTaxCode,
        supplierRepresentativeName: contact.supplierRepresentativeName,
        supplierRepresentativeTitle: contact.supplierRepresentativeTitle,
        headerNote,
        status: "da_luu",
      },
      include,
    });
    await writeAudit(tx, user.id, "sua", "don_hang", order.id, `Lưu ${order.code}`);
    return order;
  });
  return present(saved);
}

export async function deleteProjectOrder(user: User, projectId: string, orderId: string) {
  canEdit(user);
  await visible(user, projectId);
  const current = await prisma.projectOrder.findFirst({
    where: { id: orderId, projectId },
    select: { id: true, code: true, storedName: true, fileStore: true },
  });
  if (!current) throw new AppError("Không tìm thấy đơn hàng.", 404);
  const sent = await prisma.stockSlip.findFirst({ where: { orderId, kind: "giao_hang" }, select: { code: true } });
  if (sent) throw new AppError(`Đơn đã có phiếu giao ${sent.code}, không xóa.`, 400);
  await prisma.$transaction(async (tx) => {
    await tx.projectOrder.delete({ where: { id: orderId } });
    await writeAudit(tx, user.id, "xoa", "don_hang", orderId, `Xóa ${current.code}`);
  });
  if (current.storedName) await xoaTepDon(current.fileStore, current.storedName);
}

function noiCuaDon(fileStore: string): NoiLuu {
  return fileStore === "s3" ? "s3" : "may_chu";
}

async function xoaTepDon(fileStore: string, storedName: string) {
  await xoaTep(noiCuaDon(fileStore), storedName).catch(() => undefined);
}

export async function readOrderFile(user: User, projectId: string, orderId: string) {
  await visible(user, projectId);
  const order = await prisma.projectOrder.findFirst({
    where: { id: orderId, projectId },
    select: { code: true, fileName: true, storedName: true, fileStore: true },
  });
  if (!order?.storedName) throw new AppError("Đơn này chưa có tệp.", 404);
  const bytes = await docTep(noiCuaDon(order.fileStore), order.storedName);
  return { bytes, fileName: order.fileName || `${order.code}.pdf` };
}
