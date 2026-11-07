import { actor, readJson, run } from "@/shared/http";
import {
  createQuoteCategory,
  createQuoteCategoryGroup,
  listQuoteCategoryBundle,
  reorderQuoteCategories,
  reorderQuoteCategoryGroups,
} from "@/modules/settings/categories";
import { assertAny } from "@/modules/system/access";

export async function GET() {
  return run(async () => {
    const user = await actor();
    assertAny(user, ["settings.manage"]);
    return listQuoteCategoryBundle();
  });
}

export async function PATCH(request: Request) {
  return run(async () => {
    const user = await actor();
    const body = await readJson(request);
    const order = Array.isArray(body.order) ? body.order.map((id) => String(id)) : [];
    if (body.target === "group") {
      const parentId = body.parentId === null || body.parentId === undefined || body.parentId === "" ? null : String(body.parentId);
      await reorderQuoteCategoryGroups(user, parentId, order);
    } else {
      await reorderQuoteCategories(user, String(body.groupId ?? ""), order);
    }
    return listQuoteCategoryBundle();
  });
}

export async function POST(request: Request) {
  return run(async () => {
    const user = await actor();
    const body = await readJson(request);
    if (body.target === "group") {
      const group = await createQuoteCategoryGroup(user, {
        name: String(body.name ?? ""),
        parentId: body.parentId === null || body.parentId === undefined || body.parentId === "" ? null : String(body.parentId),
      });
      return { group, ...(await listQuoteCategoryBundle()) };
    }
    const category = await createQuoteCategory(user, {
      groupId: String(body.groupId ?? ""),
      name: String(body.name ?? ""),
      unit: String(body.unit ?? "bộ"),
      unitPrice: body.unitPrice as number | string | undefined,
    });
    return { category, ...(await listQuoteCategoryBundle()) };
  });
}
