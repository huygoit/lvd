import { actor, readJson, run } from "@/shared/http";
import { confirmProjectOrderVat } from "@/modules/projects/orders";

type Context = { params: Promise<{ id: string; orderId: string }> };

export async function PATCH(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id, orderId } = await context.params;
    const body = await readJson(request);
    return confirmProjectOrderVat(user, id, orderId, body as { gomVat?: unknown; vatPercent?: unknown });
  });
}
