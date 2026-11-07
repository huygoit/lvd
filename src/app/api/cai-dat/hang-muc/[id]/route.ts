import { actor, readJson, run } from "@/shared/http";
import {
  deleteQuoteCategory,
  deleteQuoteCategoryGroup,
  listQuoteCategoryBundle,
  updateQuoteCategory,
  updateQuoteCategoryGroup,
} from "@/modules/settings/categories";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    if (body.target === "group") {
      const group = await updateQuoteCategoryGroup(user, id, {
        name: body.name === undefined ? undefined : String(body.name),
        active: typeof body.active === "boolean" ? body.active : undefined,
        parentId:
          body.parentId === undefined
            ? undefined
            : body.parentId === null || body.parentId === ""
              ? null
              : String(body.parentId),
      });
      return { group, ...(await listQuoteCategoryBundle()) };
    }
    const category = await updateQuoteCategory(user, id, {
      name: body.name === undefined ? undefined : String(body.name),
      groupId: body.groupId === undefined ? undefined : String(body.groupId),
      unit: body.unit === undefined ? undefined : String(body.unit),
      unitPrice: body.unitPrice as number | string | undefined,
      active: typeof body.active === "boolean" ? body.active : undefined,
    });
    return { category, ...(await listQuoteCategoryBundle()) };
  });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const url = new URL(request.url);
    const target = url.searchParams.get("target") === "group" ? "group" : "category";
    if (target === "group") {
      await deleteQuoteCategoryGroup(user, id);
    } else {
      await deleteQuoteCategory(user, id);
    }
    return listQuoteCategoryBundle();
  });
}
