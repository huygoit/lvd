import { actor, readJson, run } from "@/shared/http";
import { createProjectItem, listProjectItems } from "@/modules/projects/items";

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
