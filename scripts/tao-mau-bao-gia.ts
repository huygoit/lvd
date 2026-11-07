import ExcelJS from "exceljs";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const src = path.join(process.cwd(), "templates", "bao-gia", "hang-muc-mau.xlsx");
const out = path.join(process.cwd(), "templates", "bao-gia", "mau-bao-gia.xlsx");
const storedRel = "bieu-mau/bao-gia/mau-bao-gia.xlsx";
const storedAbs = path.join(process.cwd(), "storage", storedRel);

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(src);

  const keep = wb.getWorksheet("2212") ?? wb.worksheets[0];
  if (!keep) throw new Error("Không tìm thấy sheet 2212");
  for (const ws of [...wb.worksheets]) {
    if (ws.id !== keep.id) wb.removeWorksheet(ws.id);
  }
  keep.name = "2212";

  function setText(addr: string, value: string) {
    keep.getCell(addr).value = value;
  }

  // Biến đơn — token để nhìn thấy khi mở Excel; engine đổ theo địa chỉ ô.
  setText("C3", "{{ben_a.ten}}");
  setText("F3", "{{ben_a.dai_dien}}");
  setText("C4", "{{ben_b.ten}}");
  setText("F4", "{{ben_b.dai_dien}}");
  setText("C5", "{{cong_trinh.ten}}");
  setText("C6", "{{hang_muc.ten}}");
  setText("K6", "{{ngay_lap_chuoi}}");
  setText("C7", "{{dia_diem}}");

  let tongRow = 0;
  let ghiChuRow = 0;
  keep.eachRow((row, number) => {
    if (number < 11) return;
    const a = String(row.getCell(1).value ?? "");
    const c = String(row.getCell(3).value ?? "");
    if (c.includes("TỔNG CỘNG")) tongRow = number;
    if (a.includes("Ghi chú")) ghiChuRow = number;
  });
  if (!tongRow) tongRow = 34;
  if (!ghiChuRow) ghiChuRow = tongRow + 1;

  for (let r = 11; r < tongRow; r += 1) {
    for (let c = 1; c <= 12; c += 1) {
      keep.getCell(r, c).value = null;
    }
  }

  // 1 dòng nhóm + 2 dòng chi tiết mẫu (engine sẽ chèn/xóa theo dong[]).
  keep.getCell(11, 3).value = "{{dong.nhom.ten}}";
  keep.getCell(11, 9).value = 0;
  keep.getCell(11, 11).value = 0;

  keep.getCell(12, 1).value = 1;
  keep.getCell(12, 2).value = "D1";
  keep.getCell(12, 3).value = "{{dong.chi_tiet.chung_loai}}";
  keep.getCell(12, 5).value = "m2";
  keep.getCell(12, 6).value = 0;
  keep.getCell(12, 7).value = 0;
  keep.getCell(12, 8).value = 1;
  keep.getCell(12, 9).value = 0;
  keep.getCell(12, 10).value = 0;
  keep.getCell(12, 11).value = 0;

  keep.getCell(13, 3).value = "{{dong.chi_tiet.chung_loai}}";
  keep.getCell(13, 5).value = "m2";
  keep.getCell(13, 6).value = 0;
  keep.getCell(13, 7).value = 0;
  keep.getCell(13, 8).value = 1;
  keep.getCell(13, 9).value = 0;
  keep.getCell(13, 10).value = 0;
  keep.getCell(13, 11).value = 0;

  keep.getCell(tongRow, 3).value = "TỔNG CỘNG (TRƯỚC THUẾ)";
  keep.getCell(tongRow, 9).value = 0;
  keep.getCell(tongRow, 11).value = 0;

  keep.getCell(ghiChuRow, 1).value = "Ghi chú: ";
  keep.getCell(ghiChuRow, 3).value = "{{ghi_chu}}";

  await wb.xlsx.writeFile(out);
  await mkdir(path.dirname(storedAbs), { recursive: true });
  await copyFile(out, storedAbs);

  const prisma = new PrismaClient();
  try {
    await prisma.quoteTemplate.updateMany({ data: { active: false } });
    await prisma.quoteTemplate.upsert({
      where: { id: "mau-bao-gia-mac-dinh" },
      update: {
        name: "Báo giá hạng mục (Excel LVD)",
        fileName: "mau-bao-gia.xlsx",
        storedName: storedRel,
        sheetName: "2212",
        active: true,
        note: "Mẫu tạo từ hang-muc-mau.xlsx. Token {{bien}} để nhận diện; engine đổ theo ô/cột.",
      },
      create: {
        id: "mau-bao-gia-mac-dinh",
        name: "Báo giá hạng mục (Excel LVD)",
        fileName: "mau-bao-gia.xlsx",
        storedName: storedRel,
        sheetName: "2212",
        active: true,
        note: "Mẫu tạo từ hang-muc-mau.xlsx. Token {{bien}} để nhận diện; engine đổ theo ô/cột.",
      },
    });
  } finally {
    await prisma.$disconnect();
  }

  console.log("Đã tạo:", out);
  console.log("Đã copy storage:", storedAbs);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
