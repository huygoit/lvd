import { actor, run } from "@/shared/http";
import { listDeliveries } from "@/modules/deliveries/service";

export async function GET() {
  return run(async () => {
    const user = await actor();
    return listDeliveries(user);
  });
}
