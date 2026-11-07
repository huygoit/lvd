import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile("templates/bao-gia/mau-bao-gia.xlsx");
  const ws = wb.getWorksheet("2212");
  if (!ws) throw new Error("Thiếu sheet");
  for (const addr of ["C3", "F3", "C4", "K6", "C11", "C12", "C13"]) {
    console.log(addr, ws.getCell(addr).value);
  }
  const prisma = new PrismaClient();
  console.log(await prisma.quoteTemplate.findMany({ select: { id: true, fileName: true, active: true, storedName: true } }));
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
