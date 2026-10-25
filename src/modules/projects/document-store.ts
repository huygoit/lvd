import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { AppError } from "@/shared/errors";

// Nơi lưu file: Amazon khi cờ bật và đủ cấu hình, không thì thư mục trên máy chủ.
// Dùng thư viện chính thức để ký yêu cầu. Tự ký tay dễ sai đường dẫn và ngày giờ.

export type NoiLuu = "s3" | "may_chu";

function giaTri(name: string) {
  return process.env[name]?.trim() ?? "";
}

function tienTo() {
  const raw = giaTri("S3_PREFIX").replace(/^\/+|\/+$/g, "");
  if (!raw) return "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(raw) || raw.includes("..")) {
    throw new AppError("Tiền tố lưu trữ không hợp lệ.", 500);
  }
  return raw;
}

export function noiLuuHienTai(): NoiLuu {
  if (giaTri("STORAGE_DRIVER").toLowerCase() !== "s3") return "may_chu";
  if (!giaTri("S3_BUCKET") || !giaTri("S3_REGION") || !giaTri("S3_ACCESS_KEY_ID") || !giaTri("S3_SECRET_ACCESS_KEY")) {
    return "may_chu";
  }
  return "s3";
}

export function nhanNoiLuu(noi: NoiLuu) {
  return noi === "s3" ? "Đang lưu Amazon S3" : "Đang lưu trên máy chủ";
}

function khoaHopLe(khoaLuu: string) {
  if (!khoaLuu || khoaLuu.length > 240 || khoaLuu.includes("..") || khoaLuu.startsWith("/") || !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(khoaLuu)) {
    throw new AppError("Đường lưu file không hợp lệ.", 400);
  }
  return khoaLuu;
}

export function khoaMoi(noi: NoiLuu) {
  return khoaTrong("tai-lieu", noi, "");
}

export function khoaDonHang(noi: NoiLuu) {
  return khoaTrong("don-hang", noi, ".pdf");
}

function khoaTrong(thu: "tai-lieu" | "don-hang", noi: NoiLuu, duoi: string) {
  const id = `${thu}/${randomUUID()}${duoi}`;
  if (noi !== "s3") return id;
  const prefix = tienTo();
  return prefix ? `${prefix}/${id}` : id;
}

function mayChu(khoaLuu: string) {
  const khop = /^(tai-lieu|don-hang)\/([0-9a-f-]{36})(\.pdf)?$/i.exec(khoaLuu);
  if (!khop) throw new AppError("Đường lưu file không hợp lệ.", 400);
  const day = path.resolve(process.cwd(), "storage", khop[1].toLowerCase());
  const file = path.resolve(day, path.basename(khoaLuu));
  const chuan = (value: string) => (process.platform === "win32" ? value.toLowerCase() : value);
  if (!chuan(file).startsWith(chuan(day + path.sep))) throw new AppError("Đường lưu file không hợp lệ.", 400);
  return file;
}

function mayS3() {
  const bucket = giaTri("S3_BUCKET");
  const region = giaTri("S3_REGION");
  const accessKeyId = giaTri("S3_ACCESS_KEY_ID");
  const secretAccessKey = giaTri("S3_SECRET_ACCESS_KEY");
  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    throw new AppError("Không kết nối được Amazon S3. Hãy kiểm tra cấu hình lưu trữ.", 500);
  }
  return {
    bucket,
    client: new S3Client({ region, credentials: { accessKeyId, secretAccessKey } }),
  };
}

function loiS3(error: unknown, message: string): never {
  const ten = error instanceof Error ? error.name : "loi";
  console.error(`${message} (${ten}).`);
  throw new AppError(message, 502);
}

export async function ghiTep(noi: NoiLuu, khoaLuu: string, bytes: Buffer, contentType: string) {
  const key = khoaHopLe(khoaLuu);
  if (noi === "s3") {
    const { bucket, client } = mayS3();
    try {
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: contentType }));
    } catch (error) {
      loiS3(error, "Không lưu được file lên Amazon S3.");
    }
    return;
  }
  const file = mayChu(key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes);
}

export async function docTep(noi: NoiLuu, khoaLuu: string) {
  const key = khoaHopLe(khoaLuu);
  if (noi === "s3") {
    const { bucket, client } = mayS3();
    try {
      const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const body = await response.Body?.transformToByteArray();
      if (!body) throw new AppError("Không đọc được file trên Amazon S3.", 502);
      return Buffer.from(body);
    } catch (error) {
      if (error instanceof AppError) throw error;
      loiS3(error, "Không đọc được file trên Amazon S3.");
    }
  }
  try {
    return await readFile(mayChu(key));
  } catch {
    throw new AppError("Không tìm thấy file trên máy chủ.", 404);
  }
}

export async function xoaTep(noi: NoiLuu, khoaLuu: string) {
  const key = khoaHopLe(khoaLuu);
  if (noi === "s3") {
    const { bucket, client } = mayS3();
    try {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    } catch (error) {
      loiS3(error, "Không xóa được file trên Amazon S3.");
    }
    return;
  }
  await rm(mayChu(key), { force: true });
}
