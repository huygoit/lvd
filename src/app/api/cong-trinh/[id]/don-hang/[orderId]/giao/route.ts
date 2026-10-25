import { actor, readJson, run } from "@/shared/http";
import { deliveryPlan, dispatchOrder } from "@/modules/deliveries/service";

type Context = { params: Promise<{ id: string; orderId: string }> };

export async function GET(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id, orderId } = await context.params;
    return deliveryPlan(user, id, orderId);
  });
}

export async function POST(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id, orderId } = await context.params;
    return dispatchOrder(user, id, orderId, await readJson(request));
  });
}
