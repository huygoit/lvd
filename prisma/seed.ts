import { PrismaClient } from "@prisma/client";
import { seedDefaultAccounts } from "../src/shared/auth/account-seed";
import { seedDefaultRoles } from "../src/shared/auth/role-seed";

const prisma = new PrismaClient();

async function main() {
  await prisma.companyProfile.upsert({
    where: { id: "mac-dinh" },
    update: {
      name: "CÔNG TY TNHH LIÊN VIỆT DOOR",
      taxCode: "0401511308",
      address: "07 Phước Hòa 2, P. Cẩm Lệ, TP. Đà Nẵng",
      phone: "0945.698.468",
      email: "lienvietdoor.co@gmail.com",
      representativeName: "Ông Trần Quang Dũng",
      defaultTaxBps: 1000,
    },
    create: {
      id: "mac-dinh",
      name: "CÔNG TY TNHH LIÊN VIỆT DOOR",
      taxCode: "0401511308",
      address: "07 Phước Hòa 2, P. Cẩm Lệ, TP. Đà Nẵng",
      phone: "0945.698.468",
      email: "lienvietdoor.co@gmail.com",
      representativeName: "Ông Trần Quang Dũng",
      defaultTaxBps: 1000,
    },
  });
  const staff = [
    { id: "minh", name: "Trần Minh" },
    { id: "ha", name: "Lê Hà" },
    { id: "khoa", name: "Phạm Khoa" },
  ];
  for (const item of staff) {
    await prisma.staff.upsert({ where: { id: item.id }, update: { name: item.name, active: true }, create: item });
  }
  // Hạng mục và đơn vị lấy từ cột Nội dung, Đơn vị tính trên sheet Báo giá. Bỏ hậu tố "(Hạng mục n)" vì đó là số dòng của hồ sơ mẫu.
  await prisma.quoteCategory.deleteMany({
    where: { id: { in: ["cua_nhom_kinh", "vach_kinh", "lan_can_kinh", "cua_cuon", "cua_chong_chay", "cua_inox", "cua_nhua", "khac"] } },
  });
  const categories = [
    { id: "hm-cua-di-nhom", name: "Cửa đi 2 cánh mở quay, nhôm hệ 55, kính cường lực 8mm", unit: "bộ", sortOrder: 1 },
    { id: "hm-cua-so-nhom", name: "Cửa sổ 4 cánh mở trượt, nhôm hệ 55, kính cường lực 8mm", unit: "bộ", sortOrder: 2 },
    { id: "hm-vach-kinh", name: "Vách kính cố định, nhôm hệ 55, kính cường lực 10mm", unit: "bộ", sortOrder: 3 },
    { id: "hm-cua-cuon-mo-to", name: "Cửa cuốn nan nhôm có mô tơ", unit: "bộ", sortOrder: 4 },
    { id: "hm-cua-cuon-khe-thoang", name: "Cửa cuốn nan nhôm khe thoáng", unit: "bộ", sortOrder: 5 },
    { id: "hm-chong-chay-1", name: "Cửa thép chống cháy EI60, 1 cánh", unit: "bộ", sortOrder: 6 },
    { id: "hm-chong-chay-2", name: "Cửa thép chống cháy EI60, 2 cánh", unit: "bộ", sortOrder: 7 },
    { id: "hm-composite", name: "Cửa đi Composite 1 cánh, cánh dày 40 mm, phủ film PVC vân gỗ", unit: "bộ", sortOrder: 8 },
    { id: "hm-khuon-composite", name: "Khuôn cửa Composite đồng bộ, nẹp, gioăng, vật tư phụ", unit: "bộ", sortOrder: 9 },
    { id: "hm-lan-can-10ly", name: "Cung cấp lắp đặt lan can kính cường lực dày 10ly, phụ kiện Inox 304", unit: "m2", sortOrder: 10 },
    { id: "hm-vach-cua-kinh", name: "Cung cấp lắp đặt vách kính kết hợp cửa kính 10ly cường lực, phụ kiện Inox 304", unit: "bộ", sortOrder: 11 },
    { id: "hm-lan-can-ban-cong", name: "Cung cấp lắp đặt lan can kính ban công ngoài nhà, cao 950, hở chân 50, tay vịn Inox 304 50x50x1.4", unit: "m2", sortOrder: 12 },
  ];
  for (const item of categories) {
    await prisma.quoteCategory.upsert({
      where: { id: item.id },
      update: { unit: item.unit },
      create: { ...item, active: true },
    });
  }
  await seedDefaultRoles(prisma);
  await seedDefaultAccounts(prisma);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
