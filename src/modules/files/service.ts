import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { User } from "@/shared/auth/types";
import { hasAnyCapability } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { getCustomer } from "@/modules/customers/service";
import { getProject } from "@/modules/projects/service";
import { getQuotation } from "@/modules/quotations/service";
import { getSlip } from "@/modules/stock/service";

const root = path.join(process.cwd(), "storage");
const allowed = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const maxSize = 8 * 1024 * 1024;

async function assertWritable(user: User, entityType: string, entityId: string) {
  if (entityType === "phien_ban") {
    const version = await prisma.quotationVersion.findUnique({ where: { id: entityId } });
    if (!version) throw new AppError("Không tìm thấy phiên bản.", 404);
    await getQuotation(user, version.quotationId);
    if (!hasAnyCapability(user, ["quotations.update", "quotations.create", "quotations.deliver"])) {
      throw new AppError("Bạn không có quyền đính kèm tệp.", 403);
    }
    if (version.internalStatus === "cho_duyet") throw new AppError("Hãy rút duyệt nếu cần bổ sung tệp.", 400);
    return version.internalStatus === "da_duyet";
  }
  if (entityType === "khach_hang") {
    await getCustomer(user, entityId);
    if (!hasAnyCapability(user, ["customers.update", "customers.create"])) {
      throw new AppError("Bạn không có quyền đính kèm tệp.", 403);
    }
    return false;
  }
  if (entityType === "cong_trinh") {
    await getProject(user, entityId);
    if (!hasAnyCapability(user, ["projects.update", "projects.create"])) {
      throw new AppError("Bạn không có quyền đính kèm tệp.", 403);
    }
    return false;
  }
  if (entityType === "phieu_kho") {
    const slip = await getSlip(user, entityId);
    if (!hasAnyCapability(user, ["inventory.update", "inventory.create"])) {
      throw new AppError("Bạn không có quyền đính kèm tệp.", 403);
    }
    return slip.status === "da_ghi";
  }
  throw new AppError("Loại hồ sơ không hợp lệ.", 400);
}

export async function saveFile(user: User, entityType: string, entityId: string, file: File) {
  const locked = await assertWritable(user, entityType, entityId);
  if (!allowed.has(file.type)) throw new AppError("Chỉ nhận PDF, JPEG, PNG hoặc WebP.", 400);
  if (file.size <= 0 || file.size > maxSize) throw new AppError("Tệp cần nhỏ hơn 8 MB.", 400);
  const id = randomUUID();
  const safe = file.name.replace(/[^\w.\- \u00C0-\u024f\u1E00-\u1EFF]/g, "_").slice(0, 120) || "tep";
  const storedName = `${entityType}/${id}`;
  await mkdir(path.join(root, entityType), { recursive: true });
  await writeFile(path.join(root, storedName), Buffer.from(await file.arrayBuffer()));
  return prisma.attachment.create({
    data: { id, entityType, entityId, fileName: safe, storedName, mime: file.type, size: file.size, locked, createdById: user.id },
  });
}

async function loadVisible(user: User, id: string) {
  const file = await prisma.attachment.findUnique({ where: { id } });
  if (!file) throw new AppError("Không tìm thấy tệp.", 404);
  if (file.entityType === "phien_ban") {
    const version = await prisma.quotationVersion.findUnique({ where: { id: file.entityId } });
    if (!version) throw new AppError("Không tìm thấy phiên bản.", 404);
    await getQuotation(user, version.quotationId);
    if (!hasAnyCapability(user, ["quotations.update", "quotations.create"])) {
      throw new AppError("Bạn không có quyền xóa tệp.", 403);
    }
    if (version.internalStatus !== "nhap" && version.internalStatus !== "yeu_cau_chinh") {
      throw new AppError("Chỉ xóa tệp khi bản đang soạn.", 400);
    }
    return file;
  }
  await assertWritable(user, file.entityType, file.entityId);
  return file;
}

export async function openFile(user: User, id: string) {
  const file = await prisma.attachment.findUnique({ where: { id } });
  if (!file) throw new AppError("Không tìm thấy tệp.", 404);
  if (file.entityType === "phien_ban") {
    const version = await prisma.quotationVersion.findUnique({ where: { id: file.entityId } });
    if (!version) throw new AppError("Không tìm thấy phiên bản.", 404);
    await getQuotation(user, version.quotationId);
  } else if (file.entityType === "khach_hang") {
    await getCustomer(user, file.entityId);
  } else if (file.entityType === "cong_trinh") {
    await getProject(user, file.entityId);
  } else if (file.entityType === "phieu_kho") {
    await getSlip(user, file.entityId);
  } else {
    throw new AppError("Tệp không hợp lệ.", 400);
  }
  const bytes = await readFile(path.join(root, file.storedName));
  return { fileName: file.fileName, mime: file.mime, bytes };
}

export async function removeFile(user: User, id: string) {
  const file = await loadVisible(user, id);
  if (file.locked) throw new AppError("Tệp đã khóa vì phiên bản đã duyệt hoặc là bằng chứng gửi.", 400);
  await unlink(path.join(root, file.storedName)).catch(() => undefined);
  await prisma.attachment.delete({ where: { id } });
}
