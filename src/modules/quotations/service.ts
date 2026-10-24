import type { Prisma } from "@prisma/client";
import { unlink } from "node:fs/promises";
import path from "node:path";
import type { User } from "@/shared/auth/types";
import { hasCapability } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { addDays, isYmd, todayYmd } from "@/shared/lib/dates";
import { writeAudit } from "@/modules/system/audit";
import { assertAny } from "@/modules/system/access";
import { nextCode } from "@/modules/system/codes";
import { applyTax, priceItem, taxRateBps, type ItemInput } from "@/modules/quotations/calc";
import { assertQuoteCategories } from "@/modules/settings/categories";
import { canonMeasureUnit } from "@/shared/catalog/units";

export type LineInput = ItemInput & {
  id?: string;
  sourceItemId?: string | null;
  positionCode?: string;
  spec?: string;
  note?: string;
};

export type DraftInput = {
  revision: number;
  title: string;
  quoteDate: string;
  validUntil: string;
  ownerId: string;
  receiverName: string;
  receiverTitle: string;
  receiverPhone: string;
  receiverEmail: string;
  scheduleText: string;
  paymentTerms: string;
  deliveryTerms: string;
  warrantyTerms: string;
  includedScope: string;
  excludedScope: string;
  note: string;
  taxPercent: number;
  warrantyMonths: number;
  advanceAmount: number;
  advanceDays: number;
  paymentDays: number;
  items: LineInput[];
};

const editable = new Set(["nhap", "yeu_cau_chinh"]);

function text(value: string | undefined) {
  return (value ?? "").trim();
}

async function company() {
  const profile = await prisma.companyProfile.findUnique({ where: { id: "mac-dinh" } });
  if (!profile) throw new AppError("Chưa có hồ sơ công ty. Hãy khởi tạo dữ liệu trước.", 500);
  return profile;
}

async function assertQuote(user: User, id: string) {
  const quote = await prisma.quotation.findUnique({
    where: { id },
    include: { customer: true, project: true, versions: { select: { ownerId: true, authorId: true } } },
  });
  if (!quote) throw new AppError("Không tìm thấy báo giá.", 404);
  if (hasCapability(user, "quotations.view")) return quote;
  if (hasCapability(user, "quotations.view.assigned")) {
    const allowed =
      quote.customer.ownerId === user.id ||
      quote.project.ownerId === user.id ||
      quote.versions.some((version) => version.ownerId === user.id || version.authorId === user.id);
    if (allowed) return quote;
  }
  throw new AppError("Bạn không có quyền xem báo giá này.", 403);
}

function snapshot(
  customer: { name: string; taxCode: string; address: string; phone: string; email: string },
  project: { name: string; location: string },
  profile: { name: string; taxCode: string; address: string; phone: string; email: string; representativeName: string },
) {
  return {
    customerName: customer.name,
    customerTaxCode: customer.taxCode,
    customerAddress: customer.address,
    customerPhone: customer.phone,
    customerEmail: customer.email,
    projectName: project.name,
    projectLocation: project.location,
    companyName: profile.name,
    companyTaxCode: profile.taxCode,
    companyAddress: profile.address,
    companyPhone: profile.phone,
    companyEmail: profile.email,
    representativeName: profile.representativeName,
  };
}

function countField(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) throw new AppError(`${label} phải là số nguyên không âm.`, 400);
  return value;
}

function presentItem(item: Prisma.QuotationItemGetPayload<object>) {
  return item;
}

export async function listQuotations(user: User, filters: { q?: string; internal?: string; customer?: string; ownerId?: string; from?: string; to?: string }) {
  await assertQuoteScope(user);
  const where: Prisma.QuotationWhereInput = hasCapability(user, "quotations.view")
    ? {}
    : { OR: [{ customer: { ownerId: user.id } }, { project: { ownerId: user.id } }, { versions: { some: { ownerId: user.id } } }] };
  const rows = await prisma.quotation.findMany({
    where,
    include: {
      customer: { select: { name: true } },
      project: { select: { name: true } },
      versions: { orderBy: { number: "desc" }, include: { items: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const q = filters.q?.trim().toLocaleLowerCase("vi") ?? "";
  const filtered = rows
    .map((row) => ({ ...row, current: row.versions[0] }))
    .filter((row) => row.current)
    .filter((row) => {
      const version = row.current;
      if (!version) return false;
      if (filters.internal && version.internalStatus !== filters.internal) return false;
      if (filters.customer && version.customerStatus !== filters.customer) return false;
      if (filters.ownerId && version.ownerId !== filters.ownerId) return false;
      if (filters.from && version.quoteDate < filters.from) return false;
      if (filters.to && version.quoteDate > filters.to) return false;
      if (!q) return true;
      return [row.code, row.customer.name, row.project.name].some((value) => value.toLocaleLowerCase("vi").includes(q));
    });
  return filtered.map((row) => ({
    id: row.id,
    code: row.code,
    customer: row.customer.name,
    project: row.project.name,
    versionId: row.current.id,
    versionNumber: row.current.number,
    quoteDate: row.current.quoteDate,
    validUntil: row.current.validUntil,
    internalStatus: row.current.internalStatus,
    customerStatus: row.current.customerStatus,
    ownerId: row.current.ownerId,
    posttax: applyTax(row.current.items.reduce((sum, item) => sum + item.pretax, 0), row.current.taxBps).posttax,
    updatedAt: row.current.updatedAt.toISOString(),
  }));
}

function assertQuoteScope(user: User) {
  assertAny(user, ["quotations.view", "quotations.view.assigned"]);
}

export async function getQuotation(user: User, id: string) {
  await assertQuote(user, id);
  const row = await prisma.quotation.findUniqueOrThrow({
    where: { id },
    include: {
      customer: true,
      project: true,
      versions: {
        orderBy: { number: "desc" },
        include: { items: { orderBy: { sortOrder: "asc" } }, approvals: { orderBy: { createdAt: "asc" } }, deliveries: { orderBy: { sentAt: "asc" } }, responses: { orderBy: { createdAt: "asc" } } },
      },
    },
  });
  const files = await prisma.attachment.findMany({ where: { entityType: "phien_ban", entityId: { in: row.versions.map((version) => version.id) } } });
  const staff = await prisma.staff.findMany();
  return {
    id: row.id,
    code: row.code,
    customerId: row.customerId,
    projectId: row.projectId,
    customer: { id: row.customer.id, name: row.customer.name, code: row.customer.code, phone: row.customer.phone, email: row.customer.email, address: row.customer.address },
    project: { id: row.project.id, name: row.project.name, code: row.project.code, location: row.project.location },
    staff: staff.map((item) => ({ id: item.id, name: item.name })),
    versions: row.versions.map((version) => {
      const items = version.items.map(presentItem);
      return {
        ...version,
        items,
        totals: applyTax(items.reduce((sum, item) => sum + item.pretax, 0), version.taxBps),
        createdAt: version.createdAt.toISOString(),
        updatedAt: version.updatedAt.toISOString(),
        approvals: version.approvals.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })),
        deliveries: version.deliveries.map((event) => ({ ...event, sentAt: event.sentAt.toISOString() })),
        responses: version.responses.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })),
        files: files.filter((file) => file.entityId === version.id).map((file) => ({ id: file.id, fileName: file.fileName, size: file.size, locked: file.locked })),
      };
    }),
  };
}

export async function deleteQuotation(user: User, id: string) {
  assertAny(user, ["quotations.update", "quotations.create"]);
  const quote = await assertQuote(user, id);
  const versions = await prisma.quotationVersion.findMany({ where: { quotationId: id }, select: { id: true } });
  const versionIds = versions.map((version) => version.id);
  const linked = versionIds.length
    ? await prisma.contract.count({ where: { quotationVersionId: { in: versionIds } } })
    : 0;
  if (linked > 0) throw new AppError("Báo giá đang gắn hợp đồng nên không xóa được.", 400);
  const files = versionIds.length
    ? await prisma.attachment.findMany({ where: { entityType: "phien_ban", entityId: { in: versionIds } } })
    : [];
  await prisma.$transaction(async (tx) => {
    if (files.length) await tx.attachment.deleteMany({ where: { id: { in: files.map((file) => file.id) } } });
    await tx.quotation.delete({ where: { id } });
    await writeAudit(tx, user.id, "xoa", "bao_gia", id, `Xóa ${quote.code}`);
  });
  for (const file of files) {
    await unlink(path.join(process.cwd(), "storage", file.storedName)).catch(() => undefined);
  }
}

export async function createQuotation(user: User, input: { customerId: string; projectId?: string; projectName?: string; location?: string; title?: string }, now = new Date()) {
  assertAny(user, ["quotations.create"]);
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId }, include: { contacts: { where: { isPrimary: true }, take: 1 } } });
  if (!customer || customer.status !== "dang_dung") throw new AppError("Chọn khách hàng đang sử dụng.", 400);
  if (!hasCapability(user, "customers.view") && customer.ownerId !== user.id && !hasCapability(user, "quotations.view")) {
    assertAny(user, ["quotations.view", "quotations.view.assigned"]);
    if (customer.ownerId !== user.id) throw new AppError("Bạn không phụ trách khách hàng này.", 403);
  }
  const profile = await company();
  const today = todayYmd(now);
  const contact = customer.contacts[0];
  return prisma.$transaction(async (tx) => {
    let projectId = input.projectId;
    if (!projectId) {
      const projectName = text(input.projectName);
      if (!projectName) throw new AppError("Nhập tên công trình hoặc chọn công trình có sẵn.", 400);
      assertAny(user, ["projects.create"]);
      const project = await tx.project.create({
        data: {
          code: await nextCode(tx, "CT", now),
          name: projectName,
          customerId: customer.id,
          location: text(input.location),
          ownerId: user.id,
          stage: "dang_bao_gia",
        },
      });
      projectId = project.id;
    }
    const project = await tx.project.findUnique({ where: { id: projectId } });
    if (!project || project.customerId !== customer.id) throw new AppError("Công trình không thuộc khách hàng này.", 400);
    const quotation = await tx.quotation.create({
      data: { code: await nextCode(tx, "BG", now), customerId: customer.id, projectId: project.id },
    });
    const version = await tx.quotationVersion.create({
      data: {
        quotationId: quotation.id,
        number: 1,
        title: text(input.title) || `Báo giá ${project.name}`,
        quoteDate: today,
        validUntil: addDays(today, 15),
        authorId: user.id,
        ownerId: user.id,
        receiverName: contact?.name ?? "",
        receiverTitle: contact?.role ?? "",
        receiverPhone: contact?.phone || customer.phone,
        receiverEmail: contact?.email || customer.email,
        taxBps: profile.defaultTaxBps,
        ...snapshot(customer, project, profile),
      },
    });
    await writeAudit(tx, user.id, "tao", "bao_gia", quotation.id, `Tạo ${quotation.code} phiên bản 1`);
    return { id: quotation.id, versionId: version.id };
  });
}

function pricedLines(items: LineInput[]) {
  return items.map((item, index) => {
    const priced = priceItem(item);
    return {
      sortOrder: index,
      sourceItemId: item.sourceItemId || null,
      groupKey: item.groupKey,
      positionCode: text(item.positionCode),
      name: item.name.trim(),
      spec: text(item.spec),
      unit: (() => {
        const unit = canonMeasureUnit(text(item.unit) || "bộ");
        if (!unit) throw new AppError("Đơn vị tính không có trong danh mục.", 400);
        return unit;
      })(),
      calcMethod: priced.calcMethod,
      widthMm: item.widthMm || null,
      heightMm: item.heightMm || null,
      lengthMm: null,
      quantity: item.quantity,
      mainUnitPrice: item.mainUnitPrice,
      accessorySeparate: true,
      accessoryUnitPrice: item.accessoryUnitPrice,
      discountMode: "khong",
      discountBps: 0,
      discountAmount: 0,
      taxMode: "khong_ap_dung",
      taxBps: 0,
      mainAmount: priced.mainAmount,
      accessoryAmount: priced.accessoryAmount,
      discountValue: 0,
      pretax: priced.pretax,
      taxAmount: null,
      posttax: priced.pretax,
      note: text(item.note),
    };
  });
}

export async function saveDraft(user: User, quotationId: string, versionId: string, input: DraftInput) {
  assertAny(user, ["quotations.update", "quotations.create"]);
  await assertQuote(user, quotationId);
  if (!isYmd(input.quoteDate) || !isYmd(input.validUntil) || input.validUntil < input.quoteDate) {
    throw new AppError("Ngày hiệu lực phải từ ngày báo giá trở đi.", 400);
  }
  const kept = input.items.filter((item) => item.name.trim());
  await assertQuoteCategories(kept.map((item) => item.groupKey));
  const lines = pricedLines(kept);
  const taxBps = taxRateBps(input.taxPercent);
  const warrantyMonths = countField(input.warrantyMonths, "Số tháng bảo hành");
  const advanceAmount = countField(input.advanceAmount, "Tiền tạm ứng");
  const advanceDays = countField(input.advanceDays, "Số ngày tạm ứng");
  const paymentDays = countField(input.paymentDays, "Số ngày thanh toán");
  const version = await prisma.$transaction(async (tx) => {
    const current = await tx.quotationVersion.findFirst({ where: { id: versionId, quotationId } });
    if (!current) throw new AppError("Không tìm thấy phiên bản.", 404);
    if (!editable.has(current.internalStatus)) throw new AppError("Phiên bản này đã khóa, không sửa trực tiếp.", 400);
    if (current.revision !== input.revision) throw new AppError("Phiên bản vừa được người khác cập nhật. Hãy tải lại.", 409);
    const staff = await tx.staff.findFirst({ where: { id: input.ownerId, active: true } });
    if (!staff) throw new AppError("Người phụ trách không còn hoạt động.", 400);
    const saved = await tx.quotationVersion.updateMany({
      where: { id: versionId, revision: input.revision },
      data: {
        title: text(input.title),
        quoteDate: input.quoteDate,
        validUntil: input.validUntil,
        ownerId: input.ownerId,
        receiverName: text(input.receiverName),
        receiverTitle: text(input.receiverTitle),
        receiverPhone: text(input.receiverPhone),
        receiverEmail: text(input.receiverEmail),
        scheduleText: text(input.scheduleText),
        paymentTerms: text(input.paymentTerms),
        deliveryTerms: text(input.deliveryTerms),
        warrantyTerms: text(input.warrantyTerms),
        taxBps,
        warrantyMonths,
        advanceAmount,
        advanceDays,
        paymentDays,
        includedScope: text(input.includedScope),
        excludedScope: text(input.excludedScope),
        note: text(input.note),
        revision: { increment: 1 },
      },
    });
    if (saved.count === 0) throw new AppError("Phiên bản vừa được người khác cập nhật. Hãy tải lại.", 409);
    await tx.quotationItem.deleteMany({ where: { versionId } });
    if (lines.length > 0) await tx.quotationItem.createMany({ data: lines.map((line) => ({ ...line, versionId })) });
    await writeAudit(tx, user.id, "sua", "bao_gia", quotationId, "Lưu nháp báo giá");
    return tx.quotationVersion.findUniqueOrThrow({ where: { id: versionId } });
  });
  return { revision: version.revision };
}

export async function refreshSnapshot(user: User, quotationId: string, versionId: string, revision: number) {
  assertAny(user, ["quotations.update", "quotations.create"]);
  const quote = await assertQuote(user, quotationId);
  const profile = await company();
  const updated = await prisma.quotationVersion.updateMany({
    where: { id: versionId, quotationId, revision, internalStatus: { in: ["nhap", "yeu_cau_chinh"] } },
    data: { ...snapshot(quote.customer, quote.project, profile), revision: { increment: 1 } },
  });
  if (updated.count === 0) throw new AppError("Chỉ cập nhật thông tin khi bản vẫn đang soạn.", 400);
}

async function move(user: User, quotationId: string, versionId: string, revision: number, from: string[], to: string, action: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.quotationVersion.findFirst({ where: { id: versionId, quotationId } });
    if (!current || !from.includes(current.internalStatus)) throw new AppError("Trạng thái hiện tại không cho phép thao tác này.", 400);
    if (current.revision !== revision) throw new AppError("Phiên bản vừa được người khác cập nhật. Hãy tải lại.", 409);
    const saved = await tx.quotationVersion.updateMany({
      where: { id: versionId, revision },
      data: { internalStatus: to, revision: { increment: 1 } },
    });
    if (saved.count === 0) throw new AppError("Phiên bản vừa được người khác cập nhật. Hãy tải lại.", 409);
    await tx.quotationApproval.create({ data: { versionId, action, actorId: user.id, reason } });
    await writeAudit(tx, user.id, action, "bao_gia", quotationId, reason || action);
  });
}

export async function submitVersion(user: User, quotationId: string, versionId: string, revision: number) {
  assertAny(user, ["quotations.submit", "quotations.create"]);
  const quote = await assertQuote(user, quotationId);
  const version = await prisma.quotationVersion.findFirst({ where: { id: versionId, quotationId }, include: { items: true } });
  if (!version || !editable.has(version.internalStatus)) throw new AppError("Chỉ gửi duyệt bản nháp hoặc bản cần chỉnh.", 400);
  if (version.items.length === 0) throw new AppError("Cần ít nhất một hạng mục trước khi gửi duyệt.", 400);
  const profile = await company();
  await prisma.$transaction(async (tx) => {
    const saved = await tx.quotationVersion.updateMany({
      where: { id: versionId, revision, internalStatus: { in: ["nhap", "yeu_cau_chinh"] } },
      data: { ...snapshot(quote.customer, quote.project, profile), internalStatus: "cho_duyet", revision: { increment: 1 } },
    });
    if (saved.count === 0) throw new AppError("Phiên bản vừa được người khác cập nhật. Hãy tải lại.", 409);
    await tx.quotationApproval.create({ data: { versionId, action: "gui_duyet", actorId: user.id, reason: "" } });
    await tx.project.update({ where: { id: quote.projectId }, data: { stage: "dang_bao_gia" } });
    await writeAudit(tx, user.id, "gui_duyet", "bao_gia", quotationId, "Gửi duyệt");
  });
}

export async function withdrawVersion(user: User, quotationId: string, versionId: string, revision: number) {
  assertAny(user, ["quotations.withdraw", "quotations.submit"]);
  await assertQuote(user, quotationId);
  await move(user, quotationId, versionId, revision, ["cho_duyet"], "nhap", "rut_duyet", "Rút yêu cầu duyệt");
}

export async function approveVersion(user: User, quotationId: string, versionId: string, revision: number) {
  assertAny(user, ["quotations.approve"]);
  await assertQuote(user, quotationId);
  const version = await prisma.quotationVersion.findFirst({ where: { id: versionId, quotationId } });
  if (!version) throw new AppError("Không tìm thấy phiên bản.", 404);
  if (version.authorId === user.id) throw new AppError("Người lập không tự duyệt phiên bản của mình.", 400);
  await move(user, quotationId, versionId, revision, ["cho_duyet"], "da_duyet", "duyet", "Đã duyệt nội bộ");
  await prisma.attachment.updateMany({ where: { entityType: "phien_ban", entityId: versionId }, data: { locked: true } });
}

export async function requestChange(user: User, quotationId: string, versionId: string, revision: number, reason: string) {
  assertAny(user, ["quotations.request_change", "quotations.approve"]);
  await assertQuote(user, quotationId);
  if (reason.trim().length < 3) throw new AppError("Cần ghi lý do yêu cầu chỉnh sửa.", 400);
  await move(user, quotationId, versionId, revision, ["cho_duyet"], "yeu_cau_chinh", "yeu_cau_sua", reason.trim());
}

export async function createNextVersion(user: User, quotationId: string, versionId: string, reason: string, now = new Date()) {
  assertAny(user, ["quotations.version", "quotations.create"]);
  await assertQuote(user, quotationId);
  if (reason.trim().length < 3) throw new AppError("Cần ghi lý do điều chỉnh.", 400);
  const source = await prisma.quotationVersion.findFirst({ where: { id: versionId, quotationId }, include: { items: { orderBy: { sortOrder: "asc" } } } });
  if (!source) throw new AppError("Không tìm thấy phiên bản nguồn.", 404);
  return prisma.$transaction(async (tx) => {
    const max = await tx.quotationVersion.aggregate({ where: { quotationId }, _max: { number: true } });
    const created = await tx.quotationVersion.create({
      data: {
        quotationId,
        number: (max._max.number ?? 0) + 1,
        sourceVersionId: source.id,
        changeReason: reason.trim(),
        title: source.title,
        quoteDate: todayYmd(now),
        validUntil: source.validUntil < todayYmd(now) ? addDays(todayYmd(now), 15) : source.validUntil,
        authorId: user.id,
        ownerId: user.id,
        receiverName: source.receiverName,
        receiverTitle: source.receiverTitle,
        receiverPhone: source.receiverPhone,
        receiverEmail: source.receiverEmail,
        scheduleText: source.scheduleText,
        paymentTerms: source.paymentTerms,
        deliveryTerms: source.deliveryTerms,
        warrantyTerms: source.warrantyTerms,
        includedScope: source.includedScope,
        excludedScope: source.excludedScope,
        note: source.note,
        customerName: source.customerName,
        customerTaxCode: source.customerTaxCode,
        customerAddress: source.customerAddress,
        customerPhone: source.customerPhone,
        customerEmail: source.customerEmail,
        projectName: source.projectName,
        projectLocation: source.projectLocation,
        companyName: source.companyName,
        companyTaxCode: source.companyTaxCode,
        companyAddress: source.companyAddress,
        companyPhone: source.companyPhone,
        companyEmail: source.companyEmail,
        representativeName: source.representativeName,
        taxBps: source.taxBps,
        warrantyMonths: source.warrantyMonths,
        advanceAmount: source.advanceAmount,
        advanceDays: source.advanceDays,
        paymentDays: source.paymentDays,
        internalStatus: "nhap",
        customerStatus: "chua_gui",
      },
    });
    if (source.items.length > 0) {
      await tx.quotationItem.createMany({
        data: source.items.map((item) => ({
          versionId: created.id,
          sourceItemId: item.id,
          sortOrder: item.sortOrder,
          groupKey: item.groupKey,
          positionCode: item.positionCode,
          name: item.name,
          spec: item.spec,
          unit: item.unit,
          calcMethod: item.calcMethod,
          widthMm: item.widthMm,
          heightMm: item.heightMm,
          lengthMm: item.lengthMm,
          quantity: item.quantity,
          mainUnitPrice: item.mainUnitPrice,
          accessorySeparate: item.accessorySeparate,
          accessoryUnitPrice: item.accessoryUnitPrice,
          discountMode: item.discountMode,
          discountBps: item.discountBps,
          discountAmount: item.discountAmount,
          taxMode: item.taxMode,
          taxBps: item.taxBps,
          mainAmount: item.mainAmount,
          accessoryAmount: item.accessoryAmount,
          discountValue: item.discountValue,
          pretax: item.pretax,
          taxAmount: item.taxAmount,
          posttax: item.posttax,
          note: item.note,
        })),
      });
    }
    await writeAudit(tx, user.id, "phien_ban", "bao_gia", quotationId, `Tạo phiên bản ${created.number}: ${reason.trim()}`);
    return { versionId: created.id, number: created.number };
  });
}

export async function copyQuotation(user: User, quotationId: string, versionId: string, target: { customerId: string; projectId: string }, now = new Date()) {
  assertAny(user, ["quotations.copy", "quotations.create"]);
  await assertQuote(user, quotationId);
  const source = await prisma.quotationVersion.findFirst({ where: { id: versionId, quotationId }, include: { items: true } });
  if (!source) throw new AppError("Không tìm thấy phiên bản nguồn.", 404);
  const project = await prisma.project.findUnique({ where: { id: target.projectId }, include: { customer: true } });
  if (!project || project.customerId !== target.customerId || project.customer.status !== "dang_dung") {
    throw new AppError("Chọn khách hàng và công trình đích đang sử dụng.", 400);
  }
  const profile = await company();
  return prisma.$transaction(async (tx) => {
    const quotation = await tx.quotation.create({
      data: { code: await nextCode(tx, "BG", now), customerId: project.customerId, projectId: project.id },
    });
    const version = await tx.quotationVersion.create({
      data: {
        quotationId: quotation.id,
        number: 1,
        copiedFromVersionId: source.id,
        title: source.title,
        quoteDate: todayYmd(now),
        validUntil: addDays(todayYmd(now), 15),
        authorId: user.id,
        ownerId: user.id,
        receiverName: source.receiverName,
        receiverTitle: source.receiverTitle,
        receiverPhone: source.receiverPhone,
        receiverEmail: source.receiverEmail,
        scheduleText: source.scheduleText,
        paymentTerms: source.paymentTerms,
        deliveryTerms: source.deliveryTerms,
        warrantyTerms: source.warrantyTerms,
        includedScope: source.includedScope,
        excludedScope: source.excludedScope,
        note: source.note,
        taxBps: source.taxBps,
        warrantyMonths: source.warrantyMonths,
        advanceAmount: source.advanceAmount,
        advanceDays: source.advanceDays,
        paymentDays: source.paymentDays,
        ...snapshot(project.customer, project, profile),
      },
    });
    if (source.items.length > 0) {
      await tx.quotationItem.createMany({
        data: source.items.map((item) => ({
          versionId: version.id,
          sortOrder: item.sortOrder,
          groupKey: item.groupKey,
          positionCode: item.positionCode,
          name: item.name,
          spec: item.spec,
          unit: item.unit,
          calcMethod: item.calcMethod,
          widthMm: item.widthMm,
          heightMm: item.heightMm,
          lengthMm: item.lengthMm,
          quantity: item.quantity,
          mainUnitPrice: item.mainUnitPrice,
          accessorySeparate: item.accessorySeparate,
          accessoryUnitPrice: item.accessoryUnitPrice,
          discountMode: item.discountMode,
          discountBps: item.discountBps,
          discountAmount: item.discountAmount,
          taxMode: item.taxMode,
          taxBps: item.taxBps,
          mainAmount: item.mainAmount,
          accessoryAmount: item.accessoryAmount,
          discountValue: item.discountValue,
          pretax: item.pretax,
          taxAmount: item.taxAmount,
          posttax: item.posttax,
          note: item.note,
        })),
      });
    }
    await writeAudit(tx, user.id, "sao_chep", "bao_gia", quotation.id, `Sao chép từ phiên bản ${source.number}`);
    return { id: quotation.id };
  });
}

export async function compareVersions(user: User, quotationId: string, leftId: string, rightId: string) {
  await assertQuote(user, quotationId);
  const versions = await prisma.quotationVersion.findMany({
    where: { quotationId, id: { in: [leftId, rightId] } },
    include: { items: true },
  });
  const left = versions.find((version) => version.id === leftId);
  const right = versions.find((version) => version.id === rightId);
  if (!left || !right) throw new AppError("Chọn hai phiên bản trong cùng báo giá.", 400);
  const leftById = new Map(left.items.map((item) => [item.id, item]));
  const matched = new Set<string>();
  const changed: string[] = [];
  const added: string[] = [];
  for (const item of right.items) {
    const source = item.sourceItemId ? leftById.get(item.sourceItemId) : undefined;
    if (!source) {
      added.push(item.name);
      continue;
    }
    matched.add(source.id);
    const fields = [
      ["Tên", source.name, item.name],
      ["Đơn vị", source.unit, item.unit],
      ["Rộng", source.widthMm, item.widthMm],
      ["Cao", source.heightMm, item.heightMm],
      ["Số lượng", source.quantity, item.quantity],
      ["Đơn giá cửa", source.mainUnitPrice, item.mainUnitPrice],
      ["Đơn giá phụ kiện", source.accessoryUnitPrice, item.accessoryUnitPrice],
      ["Ghi chú", source.note, item.note],
    ].filter(([, before, after]) => before !== after);
    if (fields.length > 0) changed.push(`${item.name}: ${fields.map(([label]) => label).join(", ")}`);
  }
  const removed = left.items.filter((item) => !matched.has(item.id)).map((item) => item.name);
  const terms = [
    ["Thuế suất", left.taxBps, right.taxBps],
    ["Thời gian thi công", left.scheduleText, right.scheduleText],
    ["Bảo hành", left.warrantyMonths, right.warrantyMonths],
    ["Tạm ứng", left.advanceAmount, right.advanceAmount],
    ["Ngày thanh toán", left.paymentDays, right.paymentDays],
  ].filter(([, before, after]) => before !== after).map(([label]) => String(label));
  const leftTotal = applyTax(left.items.reduce((sum, item) => sum + item.pretax, 0), left.taxBps).posttax;
  const rightTotal = applyTax(right.items.reduce((sum, item) => sum + item.pretax, 0), right.taxBps).posttax;
  return { added, removed, changed, terms, leftTotal, rightTotal, delta: rightTotal - leftTotal };
}

export async function recordDelivery(user: User, quotationId: string, versionId: string, input: { recipientName: string; channel: string; note?: string }) {
  assertAny(user, ["quotations.deliver", "quotations.create"]);
  await assertQuote(user, quotationId);
  const channels = ["email", "zalo", "giay", "khac"];
  if (!channels.includes(input.channel)) throw new AppError("Chọn kênh đã gửi.", 400);
  if (!text(input.recipientName)) throw new AppError("Cần tên người nhận.", 400);
  const version = await prisma.quotationVersion.findFirst({ where: { id: versionId, quotationId } });
  if (!version || version.internalStatus !== "da_duyet") throw new AppError("Chỉ ghi nhận gửi với phiên bản đã duyệt.", 400);
  await prisma.$transaction(async (tx) => {
    await tx.quotationDelivery.create({
      data: { versionId, actorId: user.id, recipientName: text(input.recipientName), channel: input.channel, note: text(input.note) },
    });
    if (version.customerStatus === "chua_gui") {
      await tx.quotationVersion.update({ where: { id: versionId }, data: { customerStatus: "da_gui", revision: { increment: 1 } } });
    }
    await writeAudit(tx, user.id, "gui_khach", "bao_gia", quotationId, `Ghi nhận đã gửi qua ${input.channel}`);
  });
}

export async function recordResponse(
  user: User,
  quotationId: string,
  versionId: string,
  input: { status: string; occurredOn: string; confirmerName?: string; note?: string; ngoaiLe?: boolean; thayThe?: boolean },
) {
  assertAny(user, ["quotations.respond", "quotations.create"]);
  await assertQuote(user, quotationId);
  if (!isYmd(input.occurredOn)) throw new AppError("Ngày phản hồi không hợp lệ.", 400);
  const allowed = ["dang_thuong_luong", "chap_thuan", "tu_choi"];
  if (!allowed.includes(input.status)) throw new AppError("Trạng thái phản hồi không hợp lệ.", 400);
  const version = await prisma.quotationVersion.findFirst({ where: { id: versionId, quotationId }, include: { deliveries: true } });
  if (!version || version.internalStatus !== "da_duyet") throw new AppError("Chỉ ghi phản hồi trên phiên bản đã duyệt.", 400);
  if (version.deliveries.length === 0) throw new AppError("Hãy ghi nhận đã gửi trước khi ghi phản hồi.", 400);
  if (input.status === "chap_thuan") {
    if (version.validUntil < input.occurredOn) {
      if (!(input.ngoaiLe && text(input.note).length >= 10 && hasCapability(user, "quotations.approve"))) {
        throw new AppError("Phiên bản đã hết hiệu lực. Hãy tạo phiên bản mới.", 400);
      }
    }
    const others = await prisma.quotationVersion.findMany({ where: { quotationId, customerStatus: "chap_thuan", id: { not: versionId } } });
    if (others.length > 0 && !input.thayThe) throw new AppError("Đã có phiên bản được chấp thuận. Dùng thao tác thay thế nếu cần đổi.", 400);
    if (others.length > 0 && input.thayThe) {
      if (text(input.note).length < 10) throw new AppError("Cần lý do thay bản khách đã chấp thuận.", 400);
    }
  }
  await prisma.$transaction(async (tx) => {
    if (input.status === "chap_thuan" && input.thayThe) {
      await tx.quotationVersion.updateMany({
        where: { quotationId, customerStatus: "chap_thuan", id: { not: versionId } },
        data: { customerStatus: "da_thay_the" },
      });
    }
    await tx.quotationResponse.create({
      data: {
        versionId,
        status: input.status,
        actorId: user.id,
        occurredOn: input.occurredOn,
        confirmerName: text(input.confirmerName),
        note: text(input.note),
      },
    });
    await tx.quotationVersion.update({
      where: { id: versionId },
      data: {
        customerStatus: input.status,
        acceptedOn: input.status === "chap_thuan" ? input.occurredOn : version.acceptedOn,
        revision: { increment: 1 },
      },
    });
    if (input.status === "chap_thuan") {
      await tx.project.update({ where: { id: (await tx.quotation.findUniqueOrThrow({ where: { id: quotationId } })).projectId }, data: { stage: "da_chot" } });
    }
    await writeAudit(tx, user.id, "phan_hoi", "bao_gia", quotationId, `Ghi phản hồi ${input.status} ngày ${input.occurredOn}`);
  });
}
