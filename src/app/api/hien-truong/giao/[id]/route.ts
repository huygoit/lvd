import { actor, run } from "@/shared/http";
import { getDelivery } from "@/modules/deliveries/service";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    return getDelivery(user, id);
  });
}
