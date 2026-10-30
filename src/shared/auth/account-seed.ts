import type { Prisma, PrismaClient } from "@prisma/client";
import { users } from "@/shared/auth/users";
import { hashPassword } from "@/shared/auth/password";

type Db = PrismaClient | Prisma.TransactionClient;

// Mật khẩu tạm cho ba tài khoản sẵn có. Đổi trong màn Người dùng sau khi vào.
export const initialPassword = "LienViet@2026";

export async function seedDefaultAccounts(db: Db) {
  const count = await db.loginAccount.count();
  if (count > 0) return;
  const passwordHash = await hashPassword(initialPassword);
  for (const account of users) {
    // Tài khoản đăng nhập dùng chính id nhân viên làm khóa ngoại.
    await db.staff.upsert({
      where: { id: account.id },
      update: { name: account.name, active: true },
      create: { id: account.id, name: account.name, active: true },
    });
    await db.loginAccount.create({
      data: {
        id: account.id,
        username: account.id,
        name: account.name,
        passwordHash,
        active: true,
      },
    });
  }
}
