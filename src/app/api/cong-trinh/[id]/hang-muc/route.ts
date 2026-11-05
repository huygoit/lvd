import { actor, readJson, run } from "@/shared/http";
import { AppError } from "@/shared/errors";
import { appendProjectItems, createProjectItem, listProjectItems, replaceProjectItems } from "@/modules/projects/items";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    return listProjectItems(user, id);
  });
}

export async function POST(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    return createProjectItem(user, id, body);
  });
}

/** Thay toàn bộ hoặc nối phụ lục hạng mục từ file Excel. */
export async function PUT(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    const items = Array.isArray(body?.items) ? body.items : Array.isArray(body) ? body : null;
    if (!items) throw new AppError("Cần gửi danh sách hạng mục.", 400);
    if (body?.append === true || body?.cheDo === "phu_luc") {
      return appendProjectItems(user, id, items);
    }
    return replaceProjectItems(user, id, items);
  });
}
