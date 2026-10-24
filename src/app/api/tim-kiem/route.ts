import { NextResponse } from "next/server";
import { readUser } from "@/shared/auth/session";
import { loadRuntime } from "@/modules/dashboard/services/load";
import { searchRecords } from "@/modules/dashboard/services/search";

export async function GET(request: Request) {
  const user = await readUser();
  if (!user) {
    return NextResponse.json({ message: "Phiên đăng nhập không còn hiệu lực." }, { status: 401 });
  }
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const runtime = await loadRuntime();
  if (runtime.mode === "none") {
    return NextResponse.json(
      { groups: [], message: "Chưa kết nối nguồn dữ liệu vận hành." },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }
  const groups = searchRecords(user, runtime.dataset, query, runtime.now);
  return NextResponse.json({ groups }, { headers: { "Cache-Control": "private, no-store" } });
}
