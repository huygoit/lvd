import { NextResponse } from "next/server";
import { readUser } from "@/shared/auth/session";
import { loadDashboard } from "@/modules/dashboard/services/load";

export async function GET(request: Request) {
  const user = await readUser();
  if (!user) {
    return NextResponse.json({ message: "Phiên đăng nhập không còn hiệu lực." }, { status: 401 });
  }
  const view = await loadDashboard(user, new URL(request.url).searchParams);
  return NextResponse.json(view, { headers: { "Cache-Control": "private, no-store" } });
}
