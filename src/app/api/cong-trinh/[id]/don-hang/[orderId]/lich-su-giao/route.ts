import { actor, run } from "@/shared/http";
import { listOrderDeliveryHistory } from "@/modules/deliveries/service";

type Context = { params: Promise<{ id: string; orderId: string }> };

export async function GET(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id, orderId } = await context.params;
    return listOrderDeliveryHistory(user, id, orderId);
  });
}
