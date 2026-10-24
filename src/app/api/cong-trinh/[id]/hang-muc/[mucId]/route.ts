import { actor, readJson, run } from "@/shared/http";
import { deleteProjectItem, updateProjectItem } from "@/modules/projects/items";

type Context = { params: Promise<{ id: string; mucId: string }> };

export async function PATCH(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id, mucId } = await context.params;
    const body = await readJson(request);
    return updateProjectItem(user, id, mucId, body);
  });
}

export async function DELETE(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id, mucId } = await context.params;
    await deleteProjectItem(user, id, mucId);
    return { ok: true };
  });
}
