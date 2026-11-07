import { randomUUID } from "node:crypto";
import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { User } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { writeAudit } from "@/modules/system/audit";
import { assertAny } from "@/modules/system/access";
import {
  quotePreviewSample,
  quoteScalarVars,
  quoteTableColumns,
  quoteTemplateLayout,
} from "@/modules/settings/quote-template-vars";

const storageRoot = path.join(process.cwd(), "storage");
const seedFile = path.join(process.cwd(), "templates", "bao-gia", "mau-bao-gia.xlsx");
const seedStored = "bieu-mau/bao-gia/mau-bao-gia.xlsx";

export type QuoteTemplateRow = {
  id: string;
  name: string;
  fileName: string;
  storedName: string;
  sheetName: string;
  active: boolean;
  note: string;
  createdAt: string;
  updatedAt: string;
  size: number | null;
};

function toRow(
  row: {
    id: string;
    name: string;
    fileName: string;
    storedName: string;
    sheetName: string;
    active: boolean;
    note: string;
    createdAt: Date;
    updatedAt: Date;
  },
  size: number | null,
): QuoteTemplateRow {
  return {
    id: row.id,
    name: row.name,
    fileName: row.fileName,
    storedName: row.storedName,
    sheetName: row.sheetName,
    active: row.active,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    size,
  };
}

async function fileSize(storedName: string) {
  try {
    const { stat } = await import("node:fs/promises");
    const info = await stat(path.join(storageRoot, storedName));
    return info.size;
  } catch {
    return null;
  }
}

/** Đảm bảo có ít nhất 1 mẫu mặc định từ file trong repo. */
export async function ensureDefaultQuoteTemplate() {
  const count = await prisma.quoteTemplate.count();
  if (count > 0) return;
  await access(seedFile).catch(() => {
    throw new AppError("Thiếu file mẫu templates/bao-gia/mau-bao-gia.xlsx trong mã nguồn.", 500);
  });
  const dest = path.join(storageRoot, seedStored);
  await mkdir(path.dirname(dest), { recursive: true });
  await copyFile(seedFile, dest);
  await prisma.quoteTemplate.create({
    data: {
      id: "mau-bao-gia-mac-dinh",
      name: "Báo giá hạng mục (Excel LVD)",
      fileName: "mau-bao-gia.xlsx",
      storedName: seedStored,
      sheetName: quoteTemplateLayout.defaultSheet,
      active: true,
      note: "Mẫu từ hang-muc-mau.xlsx. Token {{bien}} để nhận diện; engine đổ theo ô/cột.",
    },
  });
}

export async function listQuoteTemplates() {
  await ensureDefaultQuoteTemplate();
  const rows = await prisma.quoteTemplate.findMany({ orderBy: [{ active: "desc" }, { updatedAt: "desc" }] });
  const out: QuoteTemplateRow[] = [];
  for (const row of rows) {
    out.push(toRow(row, await fileSize(row.storedName)));
  }
  return out;
}

export async function getQuoteTemplateBundle() {
  const templates = await listQuoteTemplates();
  const active = templates.find((item) => item.active) ?? templates[0] ?? null;
  return {
    templates,
    active,
    layout: quoteTemplateLayout,
    scalarVars: quoteScalarVars,
    tableColumns: quoteTableColumns,
    preview: quotePreviewSample,
  };
}

export async function setActiveQuoteTemplate(user: User, id: string) {
  assertAny(user, ["settings.manage"]);
  const current = await prisma.quoteTemplate.findUnique({ where: { id } });
  if (!current) throw new AppError("Không tìm thấy mẫu.", 404);
  await prisma.$transaction(async (tx) => {
    await tx.quoteTemplate.updateMany({ data: { active: false } });
    await tx.quoteTemplate.update({ where: { id }, data: { active: true } });
    await writeAudit(tx, user.id, "sua", "bieu_mau_bao_gia", id, `Chọn mẫu đang dùng: ${current.name}`);
  });
  return getQuoteTemplateBundle();
}

export async function updateQuoteTemplateNote(user: User, id: string, note: string, sheetName?: string) {
  assertAny(user, ["settings.manage"]);
  const current = await prisma.quoteTemplate.findUnique({ where: { id } });
  if (!current) throw new AppError("Không tìm thấy mẫu.", 404);
  const sheet = sheetName === undefined ? current.sheetName : sheetName.trim() || current.sheetName;
  if (sheet.length > 80) throw new AppError("Tên sheet tối đa 80 ký tự.", 400);
  const text = note.trim();
  if (text.length > 500) throw new AppError("Ghi chú tối đa 500 ký tự.", 400);
  await prisma.$transaction(async (tx) => {
    await tx.quoteTemplate.update({ where: { id }, data: { note: text, sheetName: sheet } });
    await writeAudit(tx, user.id, "sua", "bieu_mau_bao_gia", id, `Cập nhật thông tin mẫu ${current.name}`);
  });
  return getQuoteTemplateBundle();
}

export async function uploadQuoteTemplate(user: User, file: File, name?: string) {
  assertAny(user, ["settings.manage"]);
  const label = (name ?? file.name.replace(/\.xlsx$/i, "")).trim() || "Mẫu báo giá";
  if (label.length < 2 || label.length > 120) throw new AppError("Tên mẫu 2–120 ký tự.", 400);
  if (!file.name.toLowerCase().endsWith(".xlsx")) throw new AppError("Chỉ nhận file .xlsx.", 400);
  if (file.size <= 0 || file.size > 8 * 1024 * 1024) throw new AppError("File mẫu tối đa 8 MB.", 400);
  const id = randomUUID();
  const storedName = `bieu-mau/bao-gia/${id}.xlsx`;
  const dest = path.join(storageRoot, storedName);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(await file.arrayBuffer()));
  await prisma.$transaction(async (tx) => {
    await tx.quoteTemplate.updateMany({ data: { active: false } });
    await tx.quoteTemplate.create({
      data: {
        id,
        name: label,
        fileName: file.name.slice(0, 180),
        storedName,
        sheetName: quoteTemplateLayout.defaultSheet,
        active: true,
        note: "Mẫu tải lên — kiểm tra sheet và biến trước khi phát hành.",
      },
    });
    await writeAudit(tx, user.id, "tao", "bieu_mau_bao_gia", id, `Tải mẫu báo giá ${label}`);
  });
  return getQuoteTemplateBundle();
}

export async function readQuoteTemplateBytes(id: string) {
  const row = await prisma.quoteTemplate.findUnique({ where: { id } });
  if (!row) throw new AppError("Không tìm thấy mẫu.", 404);
  try {
    const bytes = await readFile(path.join(storageRoot, row.storedName));
    return { row, bytes };
  } catch {
    throw new AppError("File mẫu không còn trên máy chủ.", 404);
  }
}
