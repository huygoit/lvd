import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { readUser } from "@/shared/auth/session";
import { AppError, isAppError } from "@/shared/errors";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function actor() {
  const user = await readUser();
  if (!user) throw new AppError("Phiên đăng nhập không còn hiệu lực.", 401);
  return user;
}

export async function readJson(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    throw new AppError("Dữ liệu gửi lên không đọc được.", 400);
  }
}

export async function run(action: () => Promise<unknown>) {
  try {
    const data = await action();
    return json(data ?? { ok: true });
  } catch (error) {
    if (isAppError(error)) return json({ message: error.message, details: error.details ?? null }, error.status);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return json({ message: "Dữ liệu vừa bị trùng. Hãy tải lại rồi thử lại." }, 409);
    }
    console.error(error);
    return json({ message: "Không xử lý được yêu cầu." }, 500);
  }
}
