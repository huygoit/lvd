import { NextResponse } from "next/server";
import { actor, readJson, run } from "@/shared/http";
import { doiTenTaiLieu, moTaiLieu, xoaTaiLieu } from "@/modules/projects/documents";
import { tieuDeTaiXuong } from "@/modules/projects/document-check";

// Tải xuống và xóa một tài liệu. Trình duyệt phải lưu file, không mở như trang web.

type Context = { params: Promise<{ id: string; tepId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await actor();
    const { id, tepId } = await context.params;
    const file = await moTaiLieu(user, id, tepId);
    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.mime,
        "Content-Disposition": tieuDeTaiXuong(file.fileName),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return run(async () => {
      throw error;
    });
  }
}

export async function PATCH(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id, tepId } = await context.params;
    return doiTenTaiLieu(user, id, tepId, await readJson(request));
  });
}

export async function DELETE(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id, tepId } = await context.params;
    return xoaTaiLieu(user, id, tepId);
  });
}
