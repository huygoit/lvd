import { actor, readJson, run } from "@/shared/http";
import { createQuoteCategory, listQuoteCategories, reorderQuoteCategories } from "@/modules/settings/categories";
import { assertAny } from "@/modules/system/access";

export async function GET() {
  return run(async () => {
    const user = await actor();
    assertAny(user, ["settings.manage"]);
    return { categories: await listQuoteCategories() };
  });
}

export async function PATCH(request: Request) {
  return run(async () => {
    const user = await actor();
    const body = await readJson(request);
    const order = Array.isArray(body.order) ? body.order.map((id) => String(id)) : [];
    await reorderQuoteCategories(user, order);
    return { categories: await listQuoteCategories() };
  });
}

export async function POST(request: Request) {
  return run(async () => {
    const user = await actor();
    const body = await readJson(request);
    const created = await createQuoteCategory(user, String(body.name ?? ""), String(body.unit ?? "bộ"));
    return { category: created, categories: await listQuoteCategories() };
  });
}
