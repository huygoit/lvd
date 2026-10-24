import { spawn } from "node:child_process";
import { access, cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { User } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { assertAny } from "@/modules/system/access";
import { writeAudit } from "@/modules/system/audit";
import { restorePhrase } from "@/modules/system/backup-phrase";

const storageRoot = path.join(process.cwd(), "storage");
const backupRoot = path.join(storageRoot, "sao-luu");
const dumpFile = "database.dump";
const filesDir = "tep";
let busy = false;

export type BackupCard = {
  id: string;
  createdAt: string;
  createdBy: string;
  dumpBytes: number;
  fileCount: number;
  fileBytes: number;
};

type Manifest = BackupCard;

function gate(user: User) {
  assertAny(user, ["settings.manage"]);
}

function databaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new AppError("Máy chủ chưa có chuỗi kết nối PostgreSQL.", 500);
  return url;
}

async function postgresBin(tool: "pg_dump" | "pg_restore" | "psql") {
  const file = process.platform === "win32" ? `${tool}.exe` : tool;
  const roots = [
    process.env.POSTGRES_BIN ?? "",
    "C:\\Program Files\\PostgreSQL\\18\\bin",
    "C:\\Program Files\\PostgreSQL\\17\\bin",
    "C:\\Program Files\\PostgreSQL\\16\\bin",
  ].filter(Boolean);
  for (const root of roots) {
    const candidate = path.join(root, file);
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Thử thư mục kế tiếp.
    }
  }
  return file;
}

function runCommand(file: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(file, args, { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > 4000) stderr = stderr.slice(-4000);
    });
    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `Lệnh thoát mã ${code}`));
    });
  });
}

function hideSecret(error: unknown) {
  return String(error).replace(/postgres(?:ql)?:\/\/\S+/gi, "postgresql://***");
}

async function exclusive<T>(work: () => Promise<T>) {
  if (busy) throw new AppError("Đang có một lần sao lưu hoặc khôi phục. Hãy đợi xong.", 409);
  busy = true;
  try {
    return await work();
  } finally {
    busy = false;
  }
}

function stamp(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `SL-${pick("year")}${pick("month")}${pick("day")}-${pick("hour")}${pick("minute")}${pick("second")}`;
}

function backupDir(id: string) {
  if (!/^SL-\d{8}-\d{6}(?:-\d+)?$/.test(id)) throw new AppError("Không tìm thấy bản sao lưu.", 404);
  const dir = path.resolve(backupRoot, id);
  const root = path.resolve(backupRoot);
  if (dir !== root && !dir.startsWith(root + path.sep)) throw new AppError("Không tìm thấy bản sao lưu.", 404);
  return dir;
}

async function measure(dir: string) {
  let count = 0;
  let bytes = 0;
  let entries: string[] = [];
  try {
    entries = await readdir(dir, { recursive: true });
  } catch {
    return { count, bytes };
  }
  for (const entry of entries) {
    const info = await stat(path.join(dir, entry));
    if (!info.isFile()) continue;
    count += 1;
    bytes += info.size;
  }
  return { count, bytes };
}

async function copyAttachments(target: string) {
  await mkdir(target, { recursive: true });
  const entries = await readdir(storageRoot, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (entry.name === "sao-luu") continue;
    await cp(path.join(storageRoot, entry.name), path.join(target, entry.name), { recursive: true });
  }
  return measure(target);
}

async function replaceAttachments(source: string) {
  const current = await readdir(storageRoot, { withFileTypes: true }).catch(() => []);
  for (const entry of current) {
    if (entry.name === "sao-luu") continue;
    await rm(path.join(storageRoot, entry.name), { recursive: true, force: true });
  }
  const saved = await readdir(source, { withFileTypes: true }).catch(() => []);
  for (const entry of saved) {
    await cp(path.join(source, entry.name), path.join(storageRoot, entry.name), { recursive: true });
  }
}

async function readManifest(dir: string): Promise<BackupCard | null> {
  try {
    const raw = JSON.parse(await readFile(path.join(dir, "manifest.json"), "utf8")) as Partial<Manifest>;
    if (!raw || typeof raw.id !== "string" || typeof raw.createdAt !== "string") return null;
    return {
      id: raw.id,
      createdAt: raw.createdAt,
      createdBy: typeof raw.createdBy === "string" ? raw.createdBy : "",
      dumpBytes: Number(raw.dumpBytes) || 0,
      fileCount: Number(raw.fileCount) || 0,
      fileBytes: Number(raw.fileBytes) || 0,
    };
  } catch {
    return null;
  }
}

export async function listBackups(user: User) {
  gate(user);
  await mkdir(backupRoot, { recursive: true });
  const entries = await readdir(backupRoot, { withFileTypes: true });
  const cards: BackupCard[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const card = await readManifest(path.join(backupRoot, entry.name));
    if (card && card.id === entry.name) cards.push(card);
  }
  cards.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return cards;
}

export async function createBackup(user: User, now = new Date()) {
  gate(user);
  return exclusive(async () => {
    await mkdir(backupRoot, { recursive: true });
    let id = stamp(now);
    let dir = path.join(backupRoot, id);
    for (let extra = 2; await stat(dir).then(() => true, () => false); extra += 1) {
      id = `${stamp(now)}-${extra}`;
      dir = path.join(backupRoot, id);
    }
    await mkdir(dir, { recursive: true });
    try {
      const files = await copyAttachments(path.join(dir, filesDir));
      const dumpPath = path.join(dir, dumpFile);
      await runCommand(await postgresBin("pg_dump"), [
        "--format=custom",
        "--no-owner",
        "--no-acl",
        `--file=${dumpPath}`,
        `--dbname=${databaseUrl()}`,
      ]);
      const dump = await stat(dumpPath);
      const card: BackupCard = {
        id,
        createdAt: now.toISOString(),
        createdBy: user.name,
        dumpBytes: dump.size,
        fileCount: files.count,
        fileBytes: files.bytes,
      };
      await writeFile(path.join(dir, "manifest.json"), JSON.stringify(card, null, 2));
      await prisma.$transaction(async (tx) => {
        await writeAudit(tx, user.id, "sao_luu", "he_thong", id, `Tạo bản sao lưu ${id}`);
      });
      return card;
    } catch (error) {
      await rm(dir, { recursive: true, force: true });
      console.error(hideSecret(error));
      if (error instanceof AppError) throw error;
      throw new AppError("Không tạo được bản sao lưu PostgreSQL.", 500);
    }
  });
}

export async function deleteBackup(user: User, id: string) {
  gate(user);
  return exclusive(async () => {
    const dir = backupDir(id);
    const card = await readManifest(dir);
    if (!card) throw new AppError("Không tìm thấy bản sao lưu.", 404);
    await rm(dir, { recursive: true, force: true });
    await prisma.$transaction(async (tx) => {
      await writeAudit(tx, user.id, "xoa", "sao_luu", id, `Xóa bản sao lưu ${id}`);
    });
    return { ok: true };
  });
}

export async function restoreBackup(user: User, id: string, confirm: string) {
  gate(user);
  if (confirm.trim() !== restorePhrase) throw new AppError("Gõ đúng KHÔI PHỤC để xác nhận.", 400);
  return exclusive(async () => {
    const dir = backupDir(id);
    const card = await readManifest(dir);
    if (!card) throw new AppError("Không tìm thấy bản sao lưu.", 404);
    const dumpPath = path.join(dir, dumpFile);
    try {
      await access(dumpPath);
    } catch {
      throw new AppError("Bản sao lưu thiếu file dump PostgreSQL.", 400);
    }
    try {
      await prisma.$disconnect();
      const url = databaseUrl();
      await runCommand(await postgresBin("psql"), [
        `--dbname=${url}`,
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();",
      ]);
      await runCommand(await postgresBin("pg_restore"), [
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-acl",
        "--single-transaction",
        `--dbname=${url}`,
        dumpPath,
      ]);
    } catch (error) {
      console.error(hideSecret(error));
      throw new AppError("Không khôi phục được dump PostgreSQL. Dữ liệu đang chạy được giữ nguyên.", 500);
    }
    try {
      await replaceAttachments(path.join(dir, filesDir));
    } catch (error) {
      console.error(hideSecret(error));
      throw new AppError("Dữ liệu đã khôi phục nhưng tệp đính kèm chưa ghi đủ. Hãy khôi phục lại bản này.", 500);
    }
    await prisma.$transaction(async (tx) => {
      await writeAudit(tx, user.id, "khoi_phuc", "he_thong", id, `Khôi phục bản sao lưu ${id}`);
    });
    return { ok: true, id };
  });
}

export async function readBackupZip(user: User, id: string) {
  gate(user);
  const dir = backupDir(id);
  const card = await readManifest(dir);
  if (!card) throw new AppError("Không tìm thấy bản sao lưu.", 404);
  const zipPath = path.join(os.tmpdir(), `${id}.zip`);
  await rm(zipPath, { force: true });
  try {
    await runCommand("tar", ["-a", "-cf", zipPath, "-C", dir, "."]);
    const bytes = await readFile(zipPath);
    return { fileName: `${id}.zip`, bytes };
  } catch (error) {
    console.error(hideSecret(error));
    throw new AppError("Không tải được bản sao lưu.", 500);
  } finally {
    await rm(zipPath, { force: true });
  }
}
