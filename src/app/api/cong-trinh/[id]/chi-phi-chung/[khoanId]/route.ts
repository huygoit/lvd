import { actor, readJson, run } from "@/shared/http";
import { deleteProjectSharedCost, updateProjectSharedCost } from "@/modules/projects/shared-costs";

type Context = { params: Promise<{ id: string; khoanId: string }> };

export async function PATCH(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id, khoanId } = await context.params;
    const body = await readJson(request);
    return updateProjectSharedCost(user, id, khoanId, body);
  });
}

export async function DELETE(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id, khoanId } = await context.params;
    await deleteProjectSharedCost(user, id, khoanId);
    return { ok: true };
  });
}
