import { NextResponse } from "next/server";
import { actor, run } from "@/shared/http";
import { readOrderFile } from "@/modules/projects/orders";
import { tieuDeTaiXuong } from "@/modules/projects/document-check";

// Tải đúng tệp PDF đã đọc thành đơn. Trình duyệt lưu file, không mở như trang.

type Context = { params: Promise<{ id: string; orderId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await actor();
    const { id, orderId } = await context.params;
    const file = await readOrderFile(user, id, orderId);
    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": "application/pdf",
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
