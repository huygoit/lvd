import { PrismaClient } from "@prisma/client";
import { nextCode } from "../src/modules/system/codes";

/** Nạp nhanh 2 khách + 2 công trình để test form (owner = minh). */
const prisma = new PrismaClient();

async function main() {
  const ownerId = "minh";
  const staff = await prisma.staff.findUnique({ where: { id: ownerId }, select: { id: true } });
  if (!staff) throw new Error("Chưa có nhân viên minh — chạy db:seed trước.");

  const mau = [
    {
      customer: {
        type: "doanh_nghiep",
        name: "CÔNG TY TNHH XÂY DỰNG AN PHÚ",
        shortName: "An Phú",
        taxCode: "0401234567",
        phone: "0903123456",
        altPhone: "02363771234",
        email: "lienhe@anphu.vn",
        address: "12 Nguyễn Văn Linh, Hải Châu, Đà Nẵng",
        invoiceAddress: "12 Nguyễn Văn Linh, Hải Châu, Đà Nẵng",
        invoiceTaxCode: "0401234567",
        representativeName: "Nguyễn Văn An",
        representativeTitle: "Giám đốc",
        executorName: "Trần Thị Bình",
        executorTitle: "Trưởng phòng dự án",
      },
      project: {
        name: "Cung cấp lắp đặt cửa nhôm kính — nhà phố An Phú",
        location: "Hải Châu, Đà Nẵng",
        stage: "dang_bao_gia",
      },
    },
    {
      customer: {
        type: "doanh_nghiep",
        name: "CÔNG TY CỔ PHẦN ĐẦU TƯ MINH ĐỨC",
        shortName: "Minh Đức",
        taxCode: "0109876543",
        phone: "0912345678",
        altPhone: "",
        email: "info@minhduc.vn",
        address: "88 Lê Duẩn, Thanh Khê, Đà Nẵng",
        invoiceAddress: "88 Lê Duẩn, Thanh Khê, Đà Nẵng",
        invoiceTaxCode: "0109876543",
        representativeName: "Lê Minh Đức",
        representativeTitle: "Chủ tịch HĐQT",
        executorName: "Phạm Quốc Huy",
        executorTitle: "Giám đốc thi công",
      },
      project: {
        name: "Vách kính + lan can — cao ốc Minh Đức",
        location: "Thanh Khê, Đà Nẵng",
        stage: "dang_bao_gia",
      },
    },
  ] as const;

  const ketQua: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const item of mau) {
      const coSan = await tx.customer.findFirst({
        where: { name: item.customer.name },
        select: { id: true, code: true },
      });
      let customerId = coSan?.id;
      let customerCode = coSan?.code;
      if (!customerId) {
        customerCode = await nextCode(tx, "KH");
        const created = await tx.customer.create({
          data: {
            ...item.customer,
            code: customerCode,
            ownerId,
            status: "dang_dung",
          },
        });
        customerId = created.id;
        ketQua.push(`+ Khách ${customerCode} · ${item.customer.name}`);
      } else {
        ketQua.push(`= Khách đã có ${customerCode} · ${item.customer.name}`);
      }

      const ctCo = await tx.project.findFirst({
        where: { customerId, name: item.project.name },
        select: { id: true, code: true },
      });
      if (!ctCo) {
        const projectCode = await nextCode(tx, "CT");
        await tx.project.create({
          data: {
            code: projectCode,
            name: item.project.name,
            customerId,
            location: item.project.location,
            ownerId,
            stage: item.project.stage,
          },
        });
        ketQua.push(`  + Công trình ${projectCode} · ${item.project.name}`);
      } else {
        ketQua.push(`  = Công trình đã có ${ctCo.code}`);
      }
    }
  });

  for (const line of ketQua) console.log(line);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
