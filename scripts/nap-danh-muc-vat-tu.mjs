import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const items = JSON.parse(readFileSync(new URL("./dmvt.json", import.meta.url), "utf8"));

let count = 0;
for (const item of items) {
  await prisma.material.upsert({
    where: { code: item.code },
    update: item,
    create: item,
  });
  count += 1;
}

await prisma.$disconnect();
console.log(`Đã nạp ${count} mã vật tư.`);
