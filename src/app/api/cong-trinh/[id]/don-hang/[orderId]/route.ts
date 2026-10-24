import { actor, readJson, run } from "@/shared/http";
import { deleteProjectOrder, getProjectOrder, saveProjectOrder } from "@/modules/projects/orders";

type Context = { params: Promise<{ id: string; orderId: string }> };

export async function GET(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id, orderId } = await context.params;
    return getProjectOrder(user, id, orderId);
  });
}

export async function PATCH(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id, orderId } = await context.params;
    const body = await readJson(request);
    return saveProjectOrder(user, id, orderId, body);
  });
}

export async function DELETE(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id, orderId } = await context.params;
    await deleteProjectOrder(user, id, orderId);
    return { ok: true };
  });
}
