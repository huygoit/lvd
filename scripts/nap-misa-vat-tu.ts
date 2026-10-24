import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { isMaterialGroup, isMaterialNature } from "../src/shared/catalog/materials";
import { canonMeasureUnit } from "../src/shared/catalog/units";

const prisma = new PrismaClient();
const items = JSON.parse(readFileSync(new URL("./misa-vat-tu.json", import.meta.url), "utf8")) as {
  code: string;
  name: string;
  groupName: string;
  stockUnit: string;
  nature: string;
}[];

async function main() {
  const rows = [];
  const skipped: string[] = [];
  for (const item of items) {
    const stockUnit = canonMeasureUnit(item.stockUnit);
    const nature = item.nature || "vat_tu";
    if (!stockUnit || (item.groupName && !isMaterialGroup(item.groupName)) || !isMaterialNature(nature)) {
      skipped.push(`${item.code} · ${item.stockUnit} · ${item.groupName} · ${nature}`);
      continue;
    }
    rows.push({
      code: item.code,
      name: item.name,
      groupName: item.groupName,
      stockUnit,
      priceBasis: "sl",
      nature,
      taxBps: 0,
    });
  }

  let created = 0;
  for (let index = 0; index < rows.length; index += 400) {
    const chunk = rows.slice(index, index + 400);
    const result = await prisma.material.createMany({ data: chunk, skipDuplicates: true });
    created += result.count;
  }

  const current = await prisma.material.findMany({ select: { id: true, stockUnit: true } });
  let normalized = 0;
  for (const row of current) {
    const unit = canonMeasureUnit(row.stockUnit);
    if (unit && unit !== row.stockUnit) {
      await prisma.material.update({ where: { id: row.id }, data: { stockUnit: unit } });
      normalized += 1;
    }
  }

  await prisma.$disconnect();
  console.log(`Đã thêm ${created} mã. Chuẩn hóa ${normalized} đơn vị. Bỏ qua ${skipped.length}.`);
  if (skipped.length) console.log(skipped.join("\n"));
}

main();
