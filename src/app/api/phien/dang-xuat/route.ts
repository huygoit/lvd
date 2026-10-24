import { NextResponse } from "next/server";
import { sessionCookie } from "@/shared/auth/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({ ...sessionCookie, value: "", maxAge: 0 });
  return response;
}
