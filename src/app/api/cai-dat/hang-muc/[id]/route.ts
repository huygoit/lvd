import { actor, readJson, run } from "@/shared/http";
import { listQuoteCategories, updateQuoteCategory } from "@/modules/settings/categories";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    const move = body.move === "len" || body.move === "xuong" ? body.move : undefined;
    const updated = await updateQuoteCategory(user, id, {
      name: body.name === undefined ? undefined : String(body.name),
      unit: body.unit === undefined ? undefined : String(body.unit),
      active: typeof body.active === "boolean" ? body.active : undefined,
      move,
    });
    return { category: updated, categories: await listQuoteCategories() };
  });
}
