import { actor, run } from "@/shared/http";
import { AppError } from "@/shared/errors";
import { danhSachTaiLieu, taiLenTaiLieu } from "@/modules/projects/documents";

// Danh sách và tải lên tài liệu của một công trình.

type Context = { params: Promise<{ id: string }> };

const tongToiDa = 10 * 20 * 1024 * 1024 + 2 * 1024 * 1024;

export async function GET(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    return danhSachTaiLieu(user, id);
  });
}

export async function POST(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const length = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(length) && length > tongToiDa) throw new AppError("Tổng dung lượng một lần tải lên quá lớn.", 413);
    const form = await request.formData();
    const files = form.getAll("tep").filter((item): item is File => item instanceof File);
    return taiLenTaiLieu(user, id, files);
  });
}
