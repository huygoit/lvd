import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const data = {
  name: "CÔNG TY TNHH LIÊN VIỆT DOOR",
  taxCode: "0401511308",
  address: "07 Phước Hòa 2, P. Cẩm Lệ, TP. Đà Nẵng",
  phone: "0945698468",
  officePhone: "0945698468",
  email: "lienvietdoor.co@gmail.com",
  website: "",
  contactAddress: "",
  fieldLine:
    "Cung cấp, thi công lắp đặt cửa nhôm kính, cửa cuốn, cửa chống cháy, cửa composite, lan can kính và các hạng mục liên quan.",
  defaultTaxBps: 1000,
  incomeTaxBps: null as number | null,
  representativeName: "Ông Trần Quang Dũng",
  representativeTitle: "Giám đốc",
};

async function main() {
  const row = await prisma.companyProfile.upsert({
    where: { id: "mac-dinh" },
    update: data,
    create: { id: "mac-dinh", ...data },
  });
  console.log("Đã cập nhật hồ sơ công ty:");
  console.log(`  ${row.name}`);
  console.log(`  MST ${row.taxCode} · ĐT ${row.phone} · ${row.email}`);
  console.log(`  ${row.address}`);
  console.log(`  Đại diện: ${row.representativeName} — ${row.representativeTitle}`);
  console.log(`  VAT mặc định: ${row.defaultTaxBps / 100}% · TNDN: chưa chốt`);
  console.log(`  Lĩnh vực: ${row.fieldLine}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
