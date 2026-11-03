/**
 * Nạp chức danh mặc định nếu chưa có (dùng trên VPS khi danh mục trống).
 *   npx tsx scripts/nap-chuc-danh.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const MAC_DINH = ["Giám đốc", "Phó giám đốc", "Trưởng phòng", "Kế toán", "Nhân viên"];

async function main() {
  let them = 0;
  for (const [index, name] of MAC_DINH.entries()) {
    const co = await prisma.jobTitle.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (co) {
      console.log(`  đã có: ${name}`);
      continue;
    }
    await prisma.jobTitle.create({ data: { name, sortOrder: index + 1, active: true } });
    console.log(`  thêm: ${name}`);
    them += 1;
  }
  const tong = await prisma.jobTitle.count();
  console.log(`Xong. Thêm mới ${them}. Tổng danh mục: ${tong}.`);
}

main()
  .catch((loi) => {
    console.error(loi instanceof Error ? loi.message : loi);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
