import type { User } from "@/shared/auth/types";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { assertAny } from "@/modules/system/access";
import { writeAudit } from "@/modules/system/audit";
import { kiemMotTep, loaiNoiDung, nhanLoai } from "@/modules/projects/document-check";
import { docTep, ghiTep, khoaCongTy, nhanNoiLuu, noiLuuHienTai, xoaTep, type NoiLuu } from "@/modules/projects/document-store";

// Hồ sơ công ty dùng chung cho báo giá, hóa đơn và hợp đồng.
// Không điền sẵn số tài khoản. Người quản trị tự ghi.

const HO_SO = "mac-dinh";
const TOI_DA_NGAN_HANG = 6;
const TOI_DA_NANG_LUC = 12;
const LOGO_TOI_DA = 2 * 1024 * 1024;

export type TaiKhoanNganHang = {
  id: string;
  bankName: string;
  branch: string;
  accountNumber: string;
  accountName: string;
};

export type TepNangLuc = {
  id: string;
  fileName: string;
  kind: string;
  nhan: string;
  size: number;
};

export type HoSoCongTy = {
  name: string;
  taxCode: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  officePhone: string;
  contactAddress: string;
  representativeName: string;
  representativeTitle: string;
  fieldLine: string;
  about: string;
  taxPercent: string;
  incomeTaxPercent: string;
  latitude: string;
  longitude: string;
  mapEmbed: string;
  hasLogo: boolean;
  banks: TaiKhoanNganHang[];
  files: TepNangLuc[];
  noiLuu: string;
};

function batBuoc(user: User) {
  assertAny(user, ["settings.manage"]);
}

function chuoi(value: unknown, dai: number) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, dai);
}

function doan(value: unknown, dai: number) {
  return String(value ?? "").trim().slice(0, dai);
}

function emailHopLe(value: string) {
  if (!value) return;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new AppError("Email chưa đúng định dạng.", 400);
}

function nhungBanDo(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const cat = raw.startsWith("<") ? (/src=["']([^"']+)["']/i.exec(raw)?.[1] ?? "") : raw;
  let url: URL;
  try {
    url = new URL(cat);
  } catch {
    throw new AppError("Đường nhúng bản đồ không đọc được. Hãy dán iframe từ Google Maps.", 400);
  }
  if (url.protocol !== "https:" || url.hostname !== "www.google.com" || url.pathname !== "/maps/embed") {
    throw new AppError("Chỉ nhận iframe nhúng từ Google Maps.", 400);
  }
  if (url.toString().length > 2000) throw new AppError("Đường nhúng bản đồ quá dài.", 400);
  return url.toString();
}

function webHopLe(value: string) {
  if (!value) return "";
  const coGiaoThuc = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(coGiaoThuc);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("sai");
    return url.toString();
  } catch {
    throw new AppError("Website cần là địa chỉ http hoặc https.", 400);
  }
}

function thueNguyen(value: unknown, ten: string) {
  const raw = String(value ?? "").trim();
  if (!/^[1-9]\d{0,2}$/.test(raw)) throw new AppError(`${ten} chỉ nhận số nguyên dương.`, 400);
  const so = Number(raw);
  if (so < 1 || so > 100) throw new AppError(`${ten} từ 1 đến 100.`, 400);
  return so * 100;
}

function thueTuyChon(value: unknown) {
  if (!String(value ?? "").trim()) return null;
  return thueNguyen(value, "Thuế thu nhập doanh nghiệp");
}

function chiSo(value: string) {
  return value.replace(/\D/g, "");
}

function soDinhDanh(value: unknown, ten: string, batBuoc: boolean, dai: number) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    if (batBuoc) throw new AppError(`${ten} cần nhập số.`, 400);
    return "";
  }
  if (!/^\d+$/.test(raw) || /^0+$/.test(raw)) throw new AppError(`${ten} chỉ nhận số nguyên dương.`, 400);
  if (raw.length > dai) throw new AppError(`${ten} quá dài.`, 400);
  return raw;
}

function hienThue(bps: number) {
  const tram = bps / 100;
  return Number.isInteger(tram) ? String(tram) : tram.toFixed(2).replace(/0$/, "").replace(".", ",");
}

function toaDo(value: unknown, ten: string, am: number, duong: number) {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) return "";
  if (!/^-?\d{1,3}(\.\d{1,7})?$/.test(raw)) throw new AppError(`${ten} chưa đúng định dạng.`, 400);
  const so = Number(raw);
  if (so < am || so > duong) throw new AppError(`${ten} nằm ngoài phạm vi.`, 400);
  return raw;
}

function nganHang(value: unknown) {
  if (!Array.isArray(value)) throw new AppError("Danh sách tài khoản không đọc được.", 400);
  if (value.length > TOI_DA_NGAN_HANG) throw new AppError(`Tối đa ${TOI_DA_NGAN_HANG} tài khoản.`, 400);
  return value.map((item, index) => {
    const dong = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const bankName = chuoi(dong.bankName, 80);
    const branch = chuoi(dong.branch, 80);
    const accountNumber = chuoi(dong.accountNumber, 30);
    const accountName = chuoi(dong.accountName, 120);
    if (!bankName && !branch && !accountNumber && !accountName) return null;
    if (bankName.length < 2) throw new AppError("Tên ngân hàng cần ít nhất 2 ký tự.", 400);
    if (!/^[\d\s.-]{4,30}$/.test(accountNumber)) throw new AppError("Số tài khoản chỉ gồm chữ số.", 400);
    return { bankName, branch, accountNumber, accountName, sortOrder: index };
  }).filter((item): item is NonNullable<typeof item> => item !== null);
}

async function lay() {
  const row = await prisma.companyProfile.findUnique({
    where: { id: HO_SO },
    include: {
      banks: { orderBy: { sortOrder: "asc" } },
      files: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!row) throw new AppError("Chưa có hồ sơ công ty.", 500);
  return row;
}

function hien(row: Awaited<ReturnType<typeof lay>>): HoSoCongTy {
  return {
    name: row.name,
    taxCode: chiSo(row.taxCode),
    address: row.address,
    phone: chiSo(row.phone),
    email: row.email,
    website: row.website,
    officePhone: chiSo(row.officePhone),
    contactAddress: row.contactAddress,
    representativeName: row.representativeName,
    representativeTitle: row.representativeTitle,
    fieldLine: row.fieldLine,
    about: row.about,
    taxPercent: hienThue(row.defaultTaxBps),
    incomeTaxPercent: row.incomeTaxBps === null ? "" : hienThue(row.incomeTaxBps),
    latitude: row.latitude,
    longitude: row.longitude,
    mapEmbed: row.mapEmbed,
    hasLogo: Boolean(row.logoKey),
    banks: row.banks.map((item) => ({
      id: item.id,
      bankName: item.bankName,
      branch: item.branch,
      accountNumber: item.accountNumber,
      accountName: item.accountName,
    })),
    files: row.files.map((item) => ({
      id: item.id,
      fileName: item.fileName,
      kind: item.kind,
      nhan: nhanLoai(item.kind),
      size: item.size,
    })),
    noiLuu: nhanNoiLuu(noiLuuHienTai()),
  };
}

export async function readCompanyProfile(user: User) {
  batBuoc(user);
  return hien(await lay());
}

export async function updateCompanyProfile(user: User, input: Record<string, unknown>) {
  batBuoc(user);
  const name = chuoi(input.name, 160);
  if (name.length < 2) throw new AppError("Tên công ty cần ít nhất 2 ký tự.", 400);
  const email = chuoi(input.email, 120);
  emailHopLe(email);
  const latitude = toaDo(input.latitude, "Vĩ độ", -90, 90);
  const longitude = toaDo(input.longitude, "Kinh độ", -180, 180);
  if (Boolean(latitude) !== Boolean(longitude)) throw new AppError("Vĩ độ và kinh độ phải nhập đủ cặp.", 400);
  const banks = nganHang(input.banks);
  const data = {
    name,
    taxCode: soDinhDanh(input.taxCode, "Mã số thuế", true, 20),
    address: chuoi(input.address, 240),
    phone: soDinhDanh(input.phone, "Điện thoại liên lạc", true, 40),
    email,
    website: webHopLe(chuoi(input.website, 180)),
    officePhone: soDinhDanh(input.officePhone, "Điện thoại khác", false, 40),
    contactAddress: chuoi(input.contactAddress, 240),
    representativeName: chuoi(input.representativeName, 120),
    representativeTitle: chuoi(input.representativeTitle, 80),
    fieldLine: chuoi(input.fieldLine, 240),
    about: doan(input.about, 2000),
    defaultTaxBps: thueNguyen(input.taxPercent, "Thuế GTGT mặc định"),
    incomeTaxBps: thueTuyChon(input.incomeTaxPercent),
    latitude,
    longitude,
    mapEmbed: nhungBanDo(input.mapEmbed),
  };
  return prisma.$transaction(async (tx) => {
    await tx.companyProfile.update({ where: { id: HO_SO }, data });
    await tx.companyBankAccount.deleteMany({ where: { profileId: HO_SO } });
    if (banks.length) {
      await tx.companyBankAccount.createMany({
        data: banks.map((item) => ({ ...item, profileId: HO_SO })),
      });
    }
    await writeAudit(tx, user.id, "sua", "ho_so_cong_ty", HO_SO, "Cập nhật hồ sơ công ty");
    const row = await tx.companyProfile.findUniqueOrThrow({
      where: { id: HO_SO },
      include: {
        banks: { orderBy: { sortOrder: "asc" } },
        files: { orderBy: { createdAt: "desc" } },
      },
    });
    return hien(row);
  });
}

function duoiAnh(kind: string) {
  if (kind === "png") return ".png" as const;
  if (kind === "webp") return ".webp" as const;
  if (kind === "jpg" || kind === "jpeg") return ".jpg" as const;
  return null;
}

export async function saveCompanyLogo(user: User, file: File) {
  batBuoc(user);
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length > LOGO_TOI_DA) throw new AppError("Logo lớn hơn 2 MB.", 400);
  const checked = kiemMotTep(file.name || "logo", bytes.length, bytes);
  const duoi = duoiAnh(checked.kind);
  if (!duoi) throw new AppError("Logo chỉ nhận ảnh JPG, PNG hoặc WebP.", 400);
  const noi = noiLuuHienTai();
  const khoa = khoaCongTy(noi, duoi);
  const cu = await prisma.companyProfile.findUnique({ where: { id: HO_SO }, select: { logoStore: true, logoKey: true } });
  await ghiTep(noi, khoa, bytes, loaiNoiDung(checked.kind));
  await prisma.$transaction(async (tx) => {
    await tx.companyProfile.update({
      where: { id: HO_SO },
      data: { logoName: checked.fileName, logoStore: noi, logoKey: khoa },
    });
    await writeAudit(tx, user.id, "sua", "ho_so_cong_ty", HO_SO, "Đổi logo công ty");
  });
  if (cu?.logoKey && cu.logoKey !== khoa) {
    await xoaTep(cu.logoStore === "s3" ? "s3" : "may_chu", cu.logoKey).catch(() => undefined);
  }
  return { hasLogo: true };
}

export async function readCompanyLogo(user: User) {
  batBuoc(user);
  const row = await prisma.companyProfile.findUnique({
    where: { id: HO_SO },
    select: { logoName: true, logoStore: true, logoKey: true },
  });
  if (!row?.logoKey) throw new AppError("Chưa có logo.", 404);
  const bytes = await docTep(row.logoStore === "s3" ? "s3" : "may_chu", row.logoKey);
  const kind = row.logoKey.endsWith(".png") ? "png" : row.logoKey.endsWith(".webp") ? "webp" : "jpg";
  return { bytes, contentType: loaiNoiDung(kind), fileName: row.logoName || "logo" };
}

export async function deleteCompanyLogo(user: User) {
  batBuoc(user);
  const row = await prisma.companyProfile.findUnique({ where: { id: HO_SO }, select: { logoStore: true, logoKey: true } });
  if (!row?.logoKey) return;
  await prisma.$transaction(async (tx) => {
    await tx.companyProfile.update({ where: { id: HO_SO }, data: { logoName: "", logoStore: "", logoKey: "" } });
    await writeAudit(tx, user.id, "xoa", "ho_so_cong_ty", HO_SO, "Gỡ logo công ty");
  });
  await xoaTep(row.logoStore === "s3" ? "s3" : "may_chu", row.logoKey).catch(() => undefined);
}

export async function saveCompanyFile(user: User, file: File) {
  batBuoc(user);
  const dangCo = await prisma.companyProfileFile.count({ where: { profileId: HO_SO } });
  if (dangCo >= TOI_DA_NANG_LUC) throw new AppError(`Hồ sơ năng lực tối đa ${TOI_DA_NANG_LUC} file.`, 400);
  const bytes = Buffer.from(await file.arrayBuffer());
  const checked = kiemMotTep(file.name || "ho-so", bytes.length, bytes);
  const anh = duoiAnh(checked.kind);
  const duoi = checked.kind === "pdf" ? ".pdf" as const : anh;
  if (!duoi) throw new AppError("Hồ sơ năng lực chỉ nhận PDF, JPG, PNG hoặc WebP.", 400);
  const noi: NoiLuu = noiLuuHienTai();
  const khoa = khoaCongTy(noi, duoi);
  await ghiTep(noi, khoa, bytes, loaiNoiDung(checked.kind));
  try {
    return await prisma.$transaction(async (tx) => {
      const row = await tx.companyProfileFile.create({
        data: {
          profileId: HO_SO,
          fileName: checked.fileName,
          kind: checked.kind,
          size: checked.size,
          store: noi,
          storageKey: khoa,
        },
      });
      await writeAudit(tx, user.id, "tao", "ho_so_cong_ty", row.id, `Thêm hồ sơ năng lực ${checked.fileName}`);
      return { id: row.id, fileName: row.fileName, kind: row.kind, nhan: nhanLoai(row.kind), size: row.size };
    });
  } catch (error) {
    await xoaTep(noi, khoa).catch(() => undefined);
    throw error;
  }
}

export async function readCompanyFile(user: User, id: string) {
  batBuoc(user);
  const row = await prisma.companyProfileFile.findFirst({ where: { id, profileId: HO_SO } });
  if (!row) throw new AppError("Không tìm thấy file.", 404);
  const bytes = await docTep(row.store === "s3" ? "s3" : "may_chu", row.storageKey);
  return { bytes, contentType: loaiNoiDung(row.kind), fileName: row.fileName };
}

export async function deleteCompanyFile(user: User, id: string) {
  batBuoc(user);
  const row = await prisma.companyProfileFile.findFirst({ where: { id, profileId: HO_SO } });
  if (!row) throw new AppError("Không tìm thấy file.", 404);
  await prisma.$transaction(async (tx) => {
    await writeAudit(tx, user.id, "xoa", "ho_so_cong_ty", id, `Xóa hồ sơ năng lực ${row.fileName}`);
    await tx.companyProfileFile.delete({ where: { id } });
  });
  await xoaTep(row.store === "s3" ? "s3" : "may_chu", row.storageKey).catch(() => undefined);
}

export type DiemBanDo = { lat: string; lon: string; nhan: string };

export async function timViTri(user: User, query: string) {
  batBuoc(user);
  const q = query.trim().replace(/\s+/g, " ");
  if (q.length < 3) throw new AppError("Nhập địa chỉ dài hơn để tìm trên bản đồ.", 400);
  if (q.length > 180) throw new AppError("Địa chỉ tìm kiếm quá dài.", 400);
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "vn");
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": "LienVietDoor/ho-so (noi bo)",
        "Accept-Language": "vi",
      },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new AppError("Không kết nối được bản đồ OpenStreetMap.", 502);
  }
  if (!response.ok) throw new AppError("OpenStreetMap chưa trả được vị trí.", 502);
  const data = await response.json() as { lat?: string; lon?: string; display_name?: string }[];
  if (!Array.isArray(data) || data.length === 0) throw new AppError("Không thấy địa chỉ này trên bản đồ.", 404);
  return data.slice(0, 5).map((item) => ({
    lat: String(item.lat ?? ""),
    lon: String(item.lon ?? ""),
    nhan: String(item.display_name ?? ""),
  })).filter((item) => item.lat && item.lon);
}
