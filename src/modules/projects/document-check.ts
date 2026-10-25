import { AppError } from "@/shared/errors";

// Kiểm tra đuôi và mã đầu của file. Không tin loại nội dung do trình duyệt gửi.

export const gioiHanByte = 20 * 1024 * 1024;
export const toiDaMoiLan = 10;

const duoiChoPhep = new Set(["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx", "xls", "xlsx", "csv", "txt"]);

const loiTheoDuoi: Record<string, string> = {
  svg: "Không nhận file SVG vì file này có thể chứa mã độc.",
  html: "Không nhận file trang web.",
  htm: "Không nhận file trang web.",
  js: "Không nhận file chương trình.",
  mjs: "Không nhận file chương trình.",
  cjs: "Không nhận file chương trình.",
  exe: "Không nhận file chương trình.",
  dll: "Không nhận file chương trình.",
  bat: "Không nhận file lệnh.",
  cmd: "Không nhận file lệnh.",
  com: "Không nhận file chương trình.",
  zip: "Không nhận file nén ZIP. Hãy gửi từng file PDF, Word hoặc Excel.",
  rar: "Không nhận file nén RAR.",
  "7z": "Không nhận file nén.",
};

const loiChung = "Chỉ nhận PDF, ảnh JPG, PNG, WebP, Word, Excel, CSV và văn bản TXT.";

const ole = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

export function tenGoc(name: string) {
  const base = name.split(/[/\\]/).pop() ?? "";
  const clean = base.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 180);
  return clean || "tep";
}

function duoiFile(name: string) {
  const clean = tenGoc(name).toLowerCase();
  const dot = clean.lastIndexOf(".");
  if (dot <= 0 || dot === clean.length - 1) return "";
  return clean.slice(dot + 1);
}

function batDau(buffer: Buffer, bytes: number[]) {
  if (buffer.length < bytes.length) return false;
  return bytes.every((byte, index) => buffer[index] === byte);
}

function coChuoi(buffer: Buffer, text: string) {
  return buffer.includes(Buffer.from(text, "latin1"));
}

function coUtf16(buffer: Buffer, text: string) {
  return buffer.includes(Buffer.from(text, "utf16le"));
}

function laVanBan(buffer: Buffer) {
  if (buffer.includes(0)) return false;
  const mau = buffer.subarray(0, Math.min(buffer.length, 64 * 1024));
  for (const byte of mau) {
    if (byte < 9 || (byte > 13 && byte < 32)) return false;
  }
  const dau = mau.toString("latin1").replace(/^\uFEFF/, "").trimStart().slice(0, 800).toLowerCase();
  if (/^(<!doctype|<html|<svg|<\?xml|<script|<iframe|<head|<body)/.test(dau)) return false;
  if (dau.includes("<script") || dau.includes("javascript:") || dau.includes("<svg") || dau.includes("<html")) return false;
  return true;
}

function laGoiOffice(buffer: Buffer, thuMuc: string) {
  const pk = batDau(buffer, [0x50, 0x4b, 0x03, 0x04]) || batDau(buffer, [0x50, 0x4b, 0x05, 0x06]) || batDau(buffer, [0x50, 0x4b, 0x07, 0x08]);
  if (!pk) return false;
  if (coChuoi(buffer, "vbaProject.bin")) return false;
  return coChuoi(buffer, "[Content_Types].xml") && coChuoi(buffer, thuMuc);
}

function khopNoiDung(kind: string, buffer: Buffer) {
  if (kind === "pdf") return batDau(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  if (kind === "jpg" || kind === "jpeg") return batDau(buffer, [0xff, 0xd8, 0xff]);
  if (kind === "png") return batDau(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (kind === "webp") return batDau(buffer, [0x52, 0x49, 0x46, 0x46]) && buffer.length >= 12 && buffer.subarray(8, 12).toString("latin1") === "WEBP";
  if (kind === "doc") return batDau(buffer, ole) && coUtf16(buffer, "WordDocument");
  if (kind === "xls") return batDau(buffer, ole) && (coUtf16(buffer, "Workbook") || coUtf16(buffer, "Book"));
  if (kind === "docx") return laGoiOffice(buffer, "word/");
  if (kind === "xlsx") return laGoiOffice(buffer, "xl/");
  if (kind === "csv" || kind === "txt") return laVanBan(buffer);
  return false;
}

export function kiemMotTep(fileName: string, size: number, bytes: Buffer) {
  const name = tenGoc(fileName);
  const kind = duoiFile(name);
  if (!kind) throw new AppError(`Không nhận "${name}" vì file không có đuôi. ${loiChung}`, 400);
  if (!duoiChoPhep.has(kind)) {
    const rieng = loiTheoDuoi[kind];
    throw new AppError(rieng ? `${rieng} (${name})` : `Không nhận "${name}". ${loiChung}`, 400);
  }
  if (size <= 0 || bytes.length === 0) throw new AppError(`File "${name}" đang trống.`, 400);
  if (size > gioiHanByte || bytes.length > gioiHanByte) throw new AppError(`File "${name}" lớn hơn 20 MB.`, 400);
  if (!khopNoiDung(kind, bytes)) {
    throw new AppError(`Nội dung file "${name}" không khớp đuôi .${kind}. Hãy gửi đúng file gốc, đừng chỉ đổi đuôi.`, 400);
  }
  return { fileName: name, kind, size: bytes.length };
}

export function loaiNoiDung(kind: string) {
  if (kind === "pdf") return "application/pdf";
  if (kind === "jpg" || kind === "jpeg") return "image/jpeg";
  if (kind === "png") return "image/png";
  if (kind === "webp") return "image/webp";
  if (kind === "doc") return "application/msword";
  if (kind === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (kind === "xls") return "application/vnd.ms-excel";
  if (kind === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (kind === "csv") return "text/csv; charset=utf-8";
  if (kind === "txt") return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

export function nhanLoai(kind: string) {
  if (kind === "pdf") return "PDF";
  if (kind === "jpg" || kind === "jpeg") return "Ảnh JPEG";
  if (kind === "png") return "Ảnh PNG";
  if (kind === "webp") return "Ảnh WebP";
  if (kind === "doc" || kind === "docx") return "Word";
  if (kind === "xls" || kind === "xlsx") return "Excel";
  if (kind === "csv") return "CSV";
  if (kind === "txt") return "Văn bản";
  return kind.toUpperCase();
}

export function tieuDeTaiXuong(fileName: string) {
  const sach = tenGoc(fileName).replace(/["\\]/g, "_");
  const ascii = sach.replace(/[^\x20-\x7E]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(sach)}`;
}
