import type { Prisma } from "@prisma/client";
import type { User } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { writeAudit } from "@/modules/system/audit";
import { assertAny, assertOwn, listOwner } from "@/modules/system/access";
import { nextCode } from "@/modules/system/codes";
import { rejectAdminPayload, seesAdminPrice } from "@/modules/contracts/guard";
import { contractKindLabel, priceBasisLabel, scopeKindLabel } from "@/modules/contracts/labels";
import { controlWarning, linePretax, placementError, sumLeaves, type ScopeLine } from "@/modules/contracts/money";
import { currentQuantity, fabricationOver } from "@/modules/contracts/quantity";

const include = {
  project: { select: { id: true, code: true, name: true, ownerId: true } },
  customer: { select: { id: true, code: true, name: true } },
  quotationVersion: { select: { id: true, number: true, quotation: { select: { id: true, code: true } } } },
  lines: { orderBy: { sortOrder: "asc" as const } },
  milestones: { orderBy: { sortOrder: "asc" as const } },
  payments: { orderBy: { sortOrder: "asc" as const } },
  changes: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.ContractInclude;

type ContractRow = Prisma.ContractGetPayload<{ include: typeof include }>;

function optionalInt(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) throw new AppError(`${label} phải là số nguyên không âm hoặc để trống.`, 400);
  return number;
}

function optionalDelta(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isInteger(number)) throw new AppError("Chênh số bộ phải là số nguyên hoặc để trống.", 400);
  return number;
}

function frozen(row: { signStatus: string; effectStatus: string }) {
  return row.signStatus === "da_ky" || row.effectStatus !== "chua_hieu_luc";
}

function assertDraft(row: { signStatus: string; effectStatus: string }) {
  if (frozen(row)) throw new AppError("Hợp đồng đã ký hoặc đã hiệu lực. Đổi phạm vi và giá phải qua đề xuất phát sinh.", 400);
}

async function load(user: User, id: string) {
  const row = await prisma.contract.findUnique({ where: { id }, include });
  if (!row) throw new AppError("Không tìm thấy hợp đồng.", 404);
  assertOwn(user, "contracts.view", "contracts.view.assigned", row.ownerId);
  return row;
}

function toScope(row: ContractRow): ScopeLine[] {
  return row.lines.map((line) => ({
    id: line.id,
    parentId: line.parentId,
    kind: line.kind,
    quantity: line.quantity,
    signedUnitPrice: line.signedUnitPrice,
    adminUnitPrice: line.adminUnitPrice,
    widthMm: line.widthMm,
    heightMm: line.heightMm,
    taxBps: line.taxBps,
  }));
}

export function presentContract(user: User, row: ContractRow) {
  const admin = seesAdminPrice(user);
  const scope = toScope(row);
  const lineSumSigned = sumLeaves(scope, "signedUnitPrice");
  const lineSumAdmin = admin ? sumLeaves(scope, "adminUnitPrice") : null;
  const effectiveDeltas = new Map<string, Array<number | null>>();
  for (const change of row.changes) {
    if (change.status !== "hieu_luc" || !change.lineId) continue;
    const list = effectiveDeltas.get(change.lineId) ?? [];
    list.push(change.deltaQuantity);
    effectiveDeltas.set(change.lineId, list);
  }
  return {
    id: row.id,
    code: row.code,
    signedNumber: row.signedNumber,
    kind: row.kind,
    name: row.name,
    project: row.project,
    customer: row.customer,
    quotation: row.quotationVersion
      ? { id: row.quotationVersion.quotation.id, code: row.quotationVersion.quotation.code, versionId: row.quotationVersion.id, number: row.quotationVersion.number }
      : null,
    internalStatus: row.internalStatus,
    signStatus: row.signStatus,
    effectStatus: row.effectStatus,
    executionStatus: row.executionStatus,
    priceBasis: row.priceBasis,
    signedOn: row.signedOn,
    effectiveOn: row.effectiveOn,
    ownerId: row.ownerId,
    revision: row.revision,
    scopeText: row.scopeText,
    paymentText: row.paymentText,
    warrantyText: row.warrantyText,
    note: row.note,
    declaredSignedTotal: row.declaredSignedTotal,
    declaredAdminTotal: admin ? row.declaredAdminTotal : null,
    canSeeAdmin: admin,
    lineSumSigned,
    lineSumAdmin,
    signedWarning: controlWarning(row.declaredSignedTotal, lineSumSigned),
    adminWarning: admin ? controlWarning(row.declaredAdminTotal, lineSumAdmin) : null,
    priceNote: row.priceBasis === "tron_goi" ? "Hợp đồng trọn gói không lấy khối lượng nhân đơn giá làm giá trị quyết toán." : row.priceBasis === "chua_xac_nhan" ? "Chưa xác nhận cơ sở giá. Chưa tính công nợ, lợi nhuận hay thuế." : null,
    lines: row.lines.map((line) => mapLine(line, admin, effectiveDeltas)),
    milestones: row.milestones,
    payments: row.payments.map((item) => ({ ...item, collected: null as null, source: "Kế hoạch thu. Chưa có khoản phải thu từ phân hệ tài chính." })),
    changes: row.changes.map((item) => ({
      id: item.id,
      lineId: item.lineId,
      title: item.title,
      reason: item.reason,
      deltaQuantity: item.deltaQuantity,
      status: item.status,
    })),
    quantitySources: {
      fabrication: "Chưa có dữ liệu từ phân hệ gia công",
      received: "Chưa có dữ liệu từ phân hệ gia công",
      installed: "Chưa có dữ liệu từ phân hệ thi công",
      accepted: "Chưa có dữ liệu nghiệm thu khách hàng",
    },
  };
}

function mapLine(
  line: ContractRow["lines"][number],
  admin: boolean,
  deltas: Map<string, Array<number | null>>,
) {
  return {
    id: line.id,
    parentId: line.parentId,
    kind: line.kind,
    code: line.code,
    name: line.name,
    unit: line.unit,
    widthMm: line.widthMm,
    heightMm: line.heightMm,
    quantity: line.quantity,
    currentQuantity: currentQuantity(line.quantity, deltas.get(line.id) ?? []),
    signedUnitPrice: line.signedUnitPrice,
    signedAmount: linePretax(line.quantity, line.signedUnitPrice, line.widthMm, line.heightMm),
    adminUnitPrice: admin ? line.adminUnitPrice : null,
    adminAmount: admin ? linePretax(line.quantity, line.adminUnitPrice, line.widthMm, line.heightMm) : null,
    taxBps: line.taxBps,
    note: line.note,
  };
}

export async function listContracts(user: User, filters: { q?: string; projectId?: string }) {
  const owner = listOwner(user, "contracts.view", "contracts.view.assigned");
  const q = filters.q?.trim();
  const rows = await prisma.contract.findMany({
    where: {
      ...(owner ? { ownerId: owner } : {}),
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q } },
              { name: { contains: q } },
              { signedNumber: { contains: q } },
              { customer: { name: { contains: q } } },
              { project: { name: { contains: q } } },
              { lines: { some: { OR: [{ name: { contains: q } }, { code: { contains: q } }] } } },
            ],
          }
        : {}),
    },
    include,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map((row) => presentContract(user, row));
}

export async function getContract(user: User, id: string) {
  return presentContract(user, await load(user, id));
}

async function assertSignedNumber(projectId: string, signedNumber: string, ignoreId?: string) {
  const number = signedNumber.trim();
  if (!number) return;
  const existing = await prisma.contract.findFirst({
    where: { projectId, signedNumber: number, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
    select: { id: true },
  });
  if (existing) throw new AppError("Số hợp đồng ký đã có trên công trình này.", 400);
}

export async function createContract(
  user: User,
  input: { projectId: string; customerId?: string; kind: string; name?: string; priceBasis?: string; quotationVersionId?: string },
  now = new Date(),
) {
  assertAny(user, ["contracts.create"]);
  if (input.quotationVersionId) return createFromQuotation(user, input.quotationVersionId, input.kind, now);
  if (!(input.kind in contractKindLabel)) throw new AppError("Chọn một trong ba loại hợp đồng.", 400);
  const basis = input.priceBasis && input.priceBasis in priceBasisLabel ? input.priceBasis : "chua_xac_nhan";
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) throw new AppError("Không tìm thấy công trình.", 404);
  assertOwn(user, "projects.view", "projects.view.assigned", project.ownerId);
  const customerId = input.customerId || project.customerId;
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer || customer.status !== "dang_dung") throw new AppError("Đối tác không còn dùng được.", 400);
  const name = (input.name ?? "").trim() || `Hợp đồng ${project.name}`;
  return prisma.$transaction(async (tx) => {
    const code = await nextCode(tx, "HD", now);
    const contract = await tx.contract.create({
      data: {
        code,
        kind: input.kind,
        name,
        projectId: project.id,
        customerId: customer.id,
        priceBasis: basis,
        ownerId: user.id,
      },
    });
    await writeAudit(tx, user.id, "tao", "hop_dong", contract.id, `Tạo hợp đồng ${code}`);
    return contract;
  });
}

export async function createFromQuotation(user: User, versionId: string, kind = "thi_cong", now = new Date()) {
  assertAny(user, ["contracts.create"]);
  if (!(kind in contractKindLabel)) throw new AppError("Chọn một trong ba loại hợp đồng.", 400);
  const version = await prisma.quotationVersion.findUnique({
    where: { id: versionId },
    include: { items: { orderBy: { sortOrder: "asc" } }, quotation: true, contract: { select: { id: true } } },
  });
  if (!version) throw new AppError("Không tìm thấy phiên bản báo giá.", 404);
  if (version.customerStatus !== "chap_thuan") throw new AppError("Chỉ tạo hợp đồng từ phiên bản khách đã chấp thuận.", 400);
  if (version.contract) return prisma.contract.findUniqueOrThrow({ where: { id: version.contract.id } });
  assertOwn(user, "projects.view", "projects.view.assigned", version.ownerId);
  return prisma.$transaction(async (tx) => {
    const again = await tx.contract.findUnique({ where: { quotationVersionId: version.id } });
    if (again) return again;
    const code = await nextCode(tx, "HD", now);
    const contract = await tx.contract.create({
      data: {
        code,
        kind,
        name: version.title.trim() || `Hợp đồng ${version.projectName || code}`,
        projectId: version.quotation.projectId,
        customerId: version.quotation.customerId,
        quotationVersionId: version.id,
        priceBasis: "chua_xac_nhan",
        ownerId: user.id,
        scopeText: version.includedScope,
        paymentText: version.paymentTerms,
        warrantyText: version.warrantyTerms,
        note: version.note,
        lines: {
          create: version.items.map((item, index) => ({
            kind: "ky_hieu",
            code: item.positionCode,
            name: item.name,
            unit: item.unit,
            widthMm: item.widthMm,
            heightMm: item.heightMm,
            quantity: item.quantity,
            signedUnitPrice: item.mainUnitPrice,
            adminUnitPrice: null,
            taxBps: null,
            sortOrder: index + 1,
            note: item.note,
          })),
        },
      },
    });
    await writeAudit(tx, user.id, "tao", "hop_dong", contract.id, `Tạo ${code} từ báo giá ${version.quotationId} phiên bản ${version.number}`);
    return contract;
  });
}

export async function updateContract(user: User, id: string, body: Record<string, unknown>) {
  assertAny(user, ["contracts.update", "contracts.create"]);
  rejectAdminPayload(user, body);
  const current = await load(user, id);
  assertDraft(current);
  const revision = Number(body.revision);
  if (current.revision !== revision) throw new AppError("Hợp đồng vừa được cập nhật. Hãy tải lại.", 409);
  const signedNumber = String(body.signedNumber ?? current.signedNumber);
  await assertSignedNumber(current.projectId, signedNumber, current.id);
  const basis = String(body.priceBasis ?? current.priceBasis);
  if (!(basis in priceBasisLabel)) throw new AppError("Cơ sở giá không hợp lệ.", 400);
  const data: Prisma.ContractUpdateManyMutationInput = {
    name: String(body.name ?? current.name).trim() || current.name,
    signedNumber: signedNumber.trim(),
    priceBasis: basis,
    scopeText: String(body.scopeText ?? current.scopeText),
    paymentText: String(body.paymentText ?? current.paymentText),
    warrantyText: String(body.warrantyText ?? current.warrantyText),
    note: String(body.note ?? current.note),
    declaredSignedTotal: optionalInt(body.declaredSignedTotal === undefined ? current.declaredSignedTotal : body.declaredSignedTotal, "Tổng ký khai báo"),
    revision: { increment: 1 },
  };
  if (seesAdminPrice(user) && Object.prototype.hasOwnProperty.call(body, "declaredAdminTotal")) {
    data.declaredAdminTotal = optionalInt(body.declaredAdminTotal, "Tổng quản trị khai báo");
  }
  const updated = await prisma.contract.updateMany({ where: { id, revision }, data });
  if (updated.count === 0) throw new AppError("Hợp đồng vừa được cập nhật. Hãy tải lại.", 409);
  await prisma.auditLog.create({ data: { actorId: user.id, action: "sua", entityType: "hop_dong", entityId: id, summary: `Cập nhật ${current.code}` } });
  return getContract(user, id);
}

export async function addLine(user: User, id: string, body: Record<string, unknown>) {
  assertAny(user, ["contracts.update", "contracts.create"]);
  rejectAdminPayload(user, body);
  const current = await load(user, id);
  assertDraft(current);
  const kind = String(body.kind ?? "ky_hieu");
  if (!(kind in scopeKindLabel)) throw new AppError("Loại phạm vi không hợp lệ.", 400);
  const name = String(body.name ?? "").trim();
  if (!name) throw new AppError("Cần tên điểm, nhà hoặc ký hiệu.", 400);
  const parentId = typeof body.parentId === "string" && body.parentId ? body.parentId : null;
  const parent = parentId ? current.lines.find((line) => line.id === parentId) : null;
  if (parentId && !parent) throw new AppError("Nhánh cha không thuộc hợp đồng này.", 400);
  const place = placementError(kind, parent?.kind ?? null);
  if (place) throw new AppError(place, 400);
  const sortOrder = current.lines.length + 1;
  await prisma.contractLine.create({
    data: {
      contractId: id,
      parentId,
      kind,
      code: String(body.code ?? "").trim(),
      name,
      unit: String(body.unit ?? "bộ").trim() || "bộ",
      widthMm: optionalInt(body.widthMm, "Rộng"),
      heightMm: optionalInt(body.heightMm, "Cao"),
      quantity: optionalInt(body.quantity, "Số bộ"),
      signedUnitPrice: optionalInt(body.signedUnitPrice, "Đơn giá ký"),
      adminUnitPrice: seesAdminPrice(user) ? optionalInt(body.adminUnitPrice, "Đơn giá quản trị") : null,
      taxBps: body.taxBps === undefined || body.taxBps === "" || body.taxBps === null ? null : optionalInt(body.taxBps, "Thuế suất"),
      sortOrder,
      note: String(body.note ?? ""),
    },
  });
  await prisma.contract.update({ where: { id }, data: { revision: { increment: 1 } } });
  return getContract(user, id);
}

export async function moveLine(user: User, id: string, body: Record<string, unknown>) {
  assertAny(user, ["contracts.update", "contracts.create"]);
  const current = await load(user, id);
  assertDraft(current);
  const line = current.lines.find((item) => item.id === String(body.lineId ?? ""));
  if (!line) throw new AppError("Không tìm thấy dòng phạm vi.", 404);
  const parentId = typeof body.parentId === "string" && body.parentId ? body.parentId : null;
  const parent = parentId ? current.lines.find((item) => item.id === parentId) : null;
  if (parentId && !parent) throw new AppError("Nhánh cha không thuộc hợp đồng này.", 400);
  if (parentId === line.id) throw new AppError("Không gắn một nhánh vào chính nó.", 400);
  const place = placementError(line.kind, parent?.kind ?? null);
  if (place) throw new AppError(place, 400);
  const descendants = new Set<string>();
  const walk = (nodeId: string) => {
    for (const child of current.lines) {
      if (child.parentId !== nodeId || descendants.has(child.id)) continue;
      descendants.add(child.id);
      walk(child.id);
    }
  };
  walk(line.id);
  if (parentId && descendants.has(parentId)) throw new AppError("Không đưa nhánh vào bên trong chính nó.", 400);
  await prisma.contractLine.update({ where: { id: line.id }, data: { parentId } });
  await prisma.contract.update({ where: { id }, data: { revision: { increment: 1 } } });
  return getContract(user, id);
}

export async function addMilestone(user: User, id: string, body: Record<string, unknown>) {
  assertAny(user, ["contracts.update", "contracts.create"]);
  const current = await load(user, id);
  const name = String(body.name ?? "").trim();
  if (!name) throw new AppError("Cần tên mốc.", 400);
  await prisma.contractMilestone.create({
    data: {
      contractId: id,
      name,
      planOn: String(body.planOn ?? "").trim() || null,
      note: String(body.note ?? "Mốc nội bộ, không sửa hạn cam kết trên hợp đồng đã ký."),
      sortOrder: current.milestones.length + 1,
    },
  });
  return getContract(user, id);
}

export async function addPayment(user: User, id: string, body: Record<string, unknown>) {
  assertAny(user, ["contracts.update", "contracts.create"]);
  const current = await load(user, id);
  if (frozen(current)) throw new AppError("Không ghi đè lịch thanh toán đã đi cùng hợp đồng ký. Lập đề xuất nếu cần điều chỉnh.", 400);
  const name = String(body.name ?? "").trim();
  if (!name) throw new AppError("Cần tên đợt thanh toán.", 400);
  await prisma.contractPayment.create({
    data: {
      contractId: id,
      name,
      basis: String(body.basis ?? "chua_xac_nhan"),
      amount: optionalInt(body.amount, "Số tiền đợt"),
      percentBps: optionalInt(body.percentBps, "Tỷ lệ"),
      note: String(body.note ?? "Kế hoạch thu, chưa phải tiền đã thu."),
      sortOrder: current.payments.length + 1,
    },
  });
  return getContract(user, id);
}

export async function addChange(user: User, id: string, body: Record<string, unknown>) {
  assertAny(user, ["contracts.update", "contracts.create"]);
  const current = await load(user, id);
  const title = String(body.title ?? "").trim();
  if (!title) throw new AppError("Cần nội dung phát sinh.", 400);
  const lineId = typeof body.lineId === "string" && body.lineId ? body.lineId : null;
  if (lineId && !current.lines.some((line) => line.id === lineId)) throw new AppError("Ký hiệu không thuộc hợp đồng này.", 400);
  await prisma.contractChange.create({
    data: {
      contractId: id,
      lineId,
      title,
      reason: String(body.reason ?? ""),
      deltaQuantity: optionalDelta(body.deltaQuantity),
      status: "nhap",
    },
  });
  return getContract(user, id);
}

export async function actContract(user: User, id: string, action: string, body: Record<string, unknown>) {
  const current = await load(user, id);
  if (action === "gui-duyet") {
    assertAny(user, ["contracts.submit", "contracts.create"]);
    if (current.internalStatus !== "nhap" && current.internalStatus !== "yeu_cau_chinh") throw new AppError("Chỉ gửi duyệt từ bản nháp.", 400);
    if (!current.lines.some((line) => line.kind === "ky_hieu") && current.declaredSignedTotal === null) {
      throw new AppError("Cần ít nhất một ký hiệu hoặc tổng ký khai báo trước khi gửi duyệt.", 400);
    }
    await prisma.contract.update({ where: { id }, data: { internalStatus: "cho_duyet", revision: { increment: 1 } } });
  } else if (action === "duyet") {
    assertAny(user, ["contracts.approve"]);
    if (current.ownerId === user.id) throw new AppError("Người lập không tự duyệt hợp đồng của mình. Chính sách duyệt chưa được khách chốt thêm cấp.", 400);
    if (current.internalStatus !== "cho_duyet") throw new AppError("Hợp đồng không đang chờ duyệt.", 400);
    await prisma.contract.update({ where: { id }, data: { internalStatus: "da_duyet", revision: { increment: 1 } } });
  } else if (action === "yeu-cau-sua") {
    assertAny(user, ["contracts.approve"]);
    if (current.ownerId === user.id) throw new AppError("Người lập không tự yêu cầu chỉnh hợp đồng đang chờ mình duyệt.", 400);
    if (current.internalStatus !== "cho_duyet") throw new AppError("Hợp đồng không đang chờ duyệt.", 400);
    await prisma.contract.update({ where: { id }, data: { internalStatus: "yeu_cau_chinh", revision: { increment: 1 } } });
  } else if (action === "rut-nhap") {
    assertAny(user, ["contracts.submit", "contracts.update"]);
    if (current.internalStatus !== "cho_duyet") throw new AppError("Chỉ rút bản đang chờ duyệt.", 400);
    await prisma.contract.update({ where: { id }, data: { internalStatus: "nhap", revision: { increment: 1 } } });
  } else if (action === "ghi-ky") {
    assertAny(user, ["contracts.sign"]);
    if (current.internalStatus !== "da_duyet") throw new AppError("Nội bộ chưa duyệt thì chưa ghi nhận ký.", 400);
    const signedOn = String(body.signedOn ?? "").trim();
    if (!signedOn) throw new AppError("Cần ngày ký.", 400);
    await prisma.contract.update({ where: { id }, data: { signStatus: "da_ky", signedOn, revision: { increment: 1 } } });
  } else if (action === "ghi-hieu-luc") {
    assertAny(user, ["contracts.effect"]);
    if (current.signStatus !== "da_ky") throw new AppError("Chưa ghi nhận ký thì chưa đặt hiệu lực.", 400);
    const effectiveOn = String(body.effectiveOn ?? "").trim();
    if (!effectiveOn) throw new AppError("Cần ngày hiệu lực.", 400);
    await prisma.contract.update({ where: { id }, data: { effectStatus: "co_hieu_luc", effectiveOn, executionStatus: "dang_thuc_hien", revision: { increment: 1 } } });
  } else if (action === "hieu-luc-phu-luc") {
    assertAny(user, ["contracts.effect"]);
    const changeId = String(body.changeId ?? "");
    const change = current.changes.find((item) => item.id === changeId);
    if (!change || change.status !== "chap_thuan") throw new AppError("Chỉ ghi hiệu lực phụ lục đã được chấp thuận nội bộ.", 400);
    if (change.lineId && change.deltaQuantity !== null) {
      const line = current.lines.find((item) => item.id === change.lineId);
      const base = line?.quantity ?? null;
      const applied = current.changes.filter((item) => item.lineId === change.lineId && item.status === "hieu_luc").map((item) => item.deltaQuantity);
      const next = currentQuantity(base, [...applied, change.deltaQuantity]);
      if (next !== null && next < 0) throw new AppError("Giảm phạm vi xuống dưới 0. Chưa có nghiệm thu để đối chiếu; không xóa lịch sử.", 400);
    }
    await prisma.contractChange.update({ where: { id: change.id }, data: { status: "hieu_luc" } });
  } else if (action === "chap-thuan-phat-sinh") {
    assertAny(user, ["contracts.approve"]);
    if (current.ownerId === user.id) throw new AppError("Người lập không tự duyệt phát sinh của mình.", 400);
    const change = current.changes.find((item) => item.id === String(body.changeId ?? ""));
    if (!change || (change.status !== "nhap" && change.status !== "cho_duyet")) throw new AppError("Phát sinh không ở trạng thái chờ xử lý.", 400);
    await prisma.contractChange.update({ where: { id: change.id }, data: { status: "chap_thuan" } });
  } else {
    throw new AppError("Thao tác không hợp lệ.", 400);
  }
  await prisma.auditLog.create({ data: { actorId: user.id, action, entityType: "hop_dong", entityId: id, summary: `${action} ${current.code}` } });
  return getContract(user, id);
}

export async function checkQuantity(user: User, id: string, body: Record<string, unknown>) {
  const current = await load(user, id);
  const line = current.lines.find((item) => item.id === String(body.lineId ?? ""));
  if (!line) throw new AppError("Không tìm thấy ký hiệu.", 404);
  if (body.daGiao === undefined || body.them === undefined) throw new AppError("Cần số đã giao và số định giao thêm từ phân hệ gia công.", 400);
  const assigned = Number(body.daGiao);
  const adding = Number(body.them);
  if (!Number.isInteger(assigned) || !Number.isInteger(adding) || assigned < 0 || adding < 0) throw new AppError("Khối lượng kiểm tra phải là số nguyên không âm.", 400);
  const scope = toScope(current);
  const base = scope.find((item) => item.id === line.id)?.quantity ?? null;
  const deltas = current.changes.filter((item) => item.lineId === line.id && item.status === "hieu_luc").map((item) => item.deltaQuantity);
  const contractQty = currentQuantity(base, deltas);
  if (contractQty === null) return { known: false, message: "Chưa có số bộ hợp đồng cho ký hiệu này." };
  const result = fabricationOver(contractQty, assigned, adding);
  return { known: true, contractQty, ...result, message: result.over > 0 ? `Vượt ${result.over} so với khối lượng hợp đồng hiện hành.` : "Chưa vượt khối lượng hợp đồng." };
}
