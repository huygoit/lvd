import { NextResponse } from "next/server";
import { seedDefaultAccounts } from "@/shared/auth/account-seed";
import { verifyPassword } from "@/shared/auth/password";
import { seal, sessionCookie } from "@/shared/auth/session";
import { prisma } from "@/shared/db";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { username?: unknown; password?: unknown } | null;
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!username || !password) {
    return NextResponse.json({ message: "Hãy nhập tên đăng nhập và mật khẩu." }, { status: 400 });
  }
  await seedDefaultAccounts(prisma);
  const account = await prisma.loginAccount.findUnique({ where: { username } });
  const matched = account?.active ? await verifyPassword(password, account.passwordHash) : false;
  if (!account || !matched) {
    return NextResponse.json({ message: "Tên đăng nhập hoặc mật khẩu không đúng." }, { status: 401 });
  }
  const token = seal(account.id, Date.now());
  if (!token) {
    return NextResponse.json({ message: "Chưa cấu hình khóa phiên." }, { status: 500 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set({ ...sessionCookie, value: token });
  return response;
}
