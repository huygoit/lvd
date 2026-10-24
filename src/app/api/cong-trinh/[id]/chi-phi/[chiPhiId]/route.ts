import { actor, readJson, run } from "@/shared/http";
import { deleteProjectCost, updateProjectCost } from "@/modules/projects/costs";

type Context = { params: Promise<{ id: string; chiPhiId: string }> };

export async function PATCH(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id, chiPhiId } = await context.params;
    const body = await readJson(request);
    return updateProjectCost(user, id, chiPhiId, body);
  });
}

export async function DELETE(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id, chiPhiId } = await context.params;
    await deleteProjectCost(user, id, chiPhiId);
    return { ok: true };
  });
}
