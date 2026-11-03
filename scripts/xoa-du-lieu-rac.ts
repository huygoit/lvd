/**
 * Xóa dữ liệu rác trên VPS / local.
 *
 * XÓA: đơn đặt hàng, phiếu giao/kho (slip + ảnh + move), danh mục vật tư.
 * GIỮ: công trình, khách hàng, hạng mục, đối tác, HĐ gia công/vận chuyển,
 *      báo giá, chi phí, nhân sự, cấu hình…
 *
 * Cách chạy (thư mục gốc app, đã có .env / DATABASE_URL):
 *   npx tsx scripts/xoa-du-lieu-rac.ts           # chỉ xem số lượng
 *   npx tsx scripts/xoa-du-lieu-rac.ts --chay    # xóa thật (cần CONFIRM)
 *
 *   CONFIRM=XOA_RAC npx tsx scripts/xoa-du-lieu-rac.ts --chay
 */
import { rm } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const chayThat = process.argv.includes("--chay");
const xacNhan = process.env.CONFIRM === "XOA_RAC";

async function dem() {
  const [orders, slips, photos, slipLines, moves, materials, customers, projects, items, partners] =
    await Promise.all([
      prisma.projectOrder.count(),
      prisma.stockSlip.count(),
      prisma.stockSlipPhoto.count(),
      prisma.stockSlipLine.count(),
      prisma.stockMove.count(),
      prisma.material.count(),
      prisma.customer.count(),
      prisma.project.count(),
      prisma.projectItem.count(),
      prisma.partner.count(),
    ]);
  return { orders, slips, photos, slipLines, moves, materials, customers, projects, items, partners };
}

async function xoaTepLuuTru() {
  const goc = path.join(process.cwd(), "storage");
  // Ảnh nhận hàng + PDF đơn (máy chủ). Bỏ qua lỗi nếu thư mục không tồn tại.
  for (const thuMuc of ["giao-hang", "don-hang"]) {
    await rm(path.join(goc, thuMuc), { recursive: true, force: true }).catch(() => undefined);
  }
}

async function main() {
  const truoc = await dem();
  console.log("=== Sẽ xóa ===");
  console.log(`  Đơn đặt hàng          : ${truoc.orders}`);
  console.log(`  Phiếu kho/giao        : ${truoc.slips}`);
  console.log(`  Ảnh chứng từ phiếu    : ${truoc.photos}`);
  console.log(`  Dòng phiếu            : ${truoc.slipLines}`);
  console.log(`  Bút toán kho          : ${truoc.moves}`);
  console.log(`  Danh mục vật tư       : ${truoc.materials}`);
  console.log("=== Giữ nguyên ===");
  console.log(`  Khách hàng            : ${truoc.customers}`);
  console.log(`  Công trình            : ${truoc.projects}`);
  console.log(`  Hạng mục              : ${truoc.items}`);
  console.log(`  Đối tác               : ${truoc.partners}`);

  if (!chayThat) {
    console.log("\nChế độ xem. Để xóa thật:");
    console.log("  CONFIRM=XOA_RAC npx tsx scripts/xoa-du-lieu-rac.ts --chay");
    return;
  }
  if (!xacNhan) {
    console.error("\nThiếu CONFIRM=XOA_RAC — dừng, không xóa.");
    process.exitCode = 1;
    return;
  }

  console.log("\nĐang xóa…");
  await prisma.$transaction(async (tx) => {
    // Thứ tự FK: move/ảnh/dòng phiếu → phiếu → đơn → vật tư.
    const moves = await tx.stockMove.deleteMany({});
    const photos = await tx.stockSlipPhoto.deleteMany({});
    const slipLines = await tx.stockSlipLine.deleteMany({});
    const slips = await tx.stockSlip.deleteMany({});
    // Surcharge + line cascade theo ProjectOrder.
    const orders = await tx.projectOrder.deleteMany({});
    const materials = await tx.material.deleteMany({});
    // Reset bộ đếm mã đơn / phiếu giao năm hiện tại (và mọi năm còn lưu).
    const codes = await tx.codeSequence.deleteMany({ where: { key: { in: ["DH", "GH"] } } });
    console.log(`  StockMove           : ${moves.count}`);
    console.log(`  StockSlipPhoto      : ${photos.count}`);
    console.log(`  StockSlipLine       : ${slipLines.count}`);
    console.log(`  StockSlip           : ${slips.count}`);
    console.log(`  ProjectOrder        : ${orders.count}`);
    console.log(`  Material            : ${materials.count}`);
    console.log(`  CodeSequence DH/GH  : ${codes.count}`);
  });

  await xoaTepLuuTru();
  console.log("  Đã dọn storage/giao-hang và storage/don-hang (nếu có).");

  const sau = await dem();
  console.log("\n=== Sau khi xóa ===");
  console.log(`  Đơn / phiếu / vật tư  : ${sau.orders} / ${sau.slips} / ${sau.materials}`);
  console.log(`  KH / CT / hạng mục / ĐT: ${sau.customers} / ${sau.projects} / ${sau.items} / ${sau.partners}`);
  console.log("Xong.");
}

main()
  .catch((loi) => {
    console.error(loi instanceof Error ? loi.message : loi);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
