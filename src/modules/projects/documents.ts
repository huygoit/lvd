import type { User } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { writeAudit } from "@/modules/system/audit";
import { assertAny } from "@/modules/system/access";
import { getProject } from "@/modules/projects/service";
import { kiemMotTep, loaiNoiDung, nhanLoai, toiDaMoiLan } from "@/modules/projects/document-check";
import { docTep, ghiTep, khoaMoi, nhanNoiLuu, noiLuuHienTai, xoaTep, type NoiLuu } from "@/modules/projects/document-store";

// Tài liệu của một công trình. Xem theo quyền xem. Tải lên và xóa theo quyền sửa.

function noiCuaBanGhi(storage: string): NoiLuu {
  return storage === "s3" ? "s3" : "may_chu";
}

async function tenNguoi(ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();
  const staff = await prisma.staff.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  return new Map(staff.map((item) => [item.id, item.name]));
}

export async function danhSachTaiLieu(user: User, projectId: string) {
  await getProject(user, projectId);
  const rows = await prisma.projectDocument.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } });
  const names = await tenNguoi([...new Set(rows.map((row) => row.uploadedById))]);
  const noi = noiLuuHienTai();
  return {
    noiLuu: noi,
    nhanNoiLuu: nhanNoiLuu(noi),
    tep: rows.map((row) => ({
      id: row.id,
      fileName: row.fileName,
      kind: row.kind,
      kindLabel: nhanLoai(row.kind),
      size: row.size,
      uploadedByName: names.get(row.uploadedById) ?? "—",
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function taiLenTaiLieu(user: User, projectId: string, files: File[]) {
  assertAny(user, ["projects.update", "projects.create"]);
  const project = await getProject(user, projectId);
  if (files.length === 0) throw new AppError("Chọn ít nhất một file.", 400);
  if (files.length > toiDaMoiLan) throw new AppError("Mỗi lần chỉ tải tối đa 10 file.", 400);
  const checked = [];
  for (const file of files) {
    const bytes = Buffer.from(await file.arrayBuffer());
    checked.push({ ...kiemMotTep(file.name, file.size, bytes), bytes });
  }
  const noi = noiLuuHienTai();
  const staged: { fileName: string; kind: string; size: number; storageKey: string }[] = [];
  try {
    for (const item of checked) {
      const storageKey = khoaMoi(noi);
      await ghiTep(noi, storageKey, item.bytes, loaiNoiDung(item.kind));
      staged.push({ fileName: item.fileName, kind: item.kind, size: item.size, storageKey });
    }
    await prisma.$transaction(async (tx) => {
      for (const item of staged) {
        await tx.projectDocument.create({
          data: {
            projectId: project.id,
            fileName: item.fileName,
            kind: item.kind,
            size: item.size,
            uploadedById: user.id,
            storage: noi,
            storageKey: item.storageKey,
          },
        });
      }
      await writeAudit(tx, user.id, "tai_len", "tai_lieu", project.id, `Tải ${staged.length} tài liệu cho ${project.code}`);
    });
  } catch (error) {
    await Promise.all(staged.map((item) => xoaTep(noi, item.storageKey).catch(() => undefined)));
    throw error;
  }
  return danhSachTaiLieu(user, projectId);
}

export async function moTaiLieu(user: User, projectId: string, id: string) {
  await getProject(user, projectId);
  const row = await prisma.projectDocument.findFirst({ where: { id, projectId } });
  if (!row) throw new AppError("Không tìm thấy tài liệu.", 404);
  const bytes = await docTep(noiCuaBanGhi(row.storage), row.storageKey);
  return { fileName: row.fileName, mime: loaiNoiDung(row.kind), bytes };
}

export async function xoaTaiLieu(user: User, projectId: string, id: string) {
  assertAny(user, ["projects.update", "projects.create"]);
  const project = await getProject(user, projectId);
  const row = await prisma.projectDocument.findFirst({ where: { id, projectId } });
  if (!row) throw new AppError("Không tìm thấy tài liệu.", 404);
  await xoaTep(noiCuaBanGhi(row.storage), row.storageKey);
  await prisma.$transaction(async (tx) => {
    await tx.projectDocument.delete({ where: { id: row.id } });
    await writeAudit(tx, user.id, "xoa", "tai_lieu", row.id, `Xóa tài liệu ${row.fileName} của ${project.code}`);
  });
  return { ok: true as const };
}
