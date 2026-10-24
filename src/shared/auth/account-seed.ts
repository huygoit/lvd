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
