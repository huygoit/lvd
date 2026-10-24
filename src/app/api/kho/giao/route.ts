import { actor, readJson, run } from "@/shared/http";
import { dispatchWarehouse } from "@/modules/deliveries/service";

export async function POST(request: Request) {
  return run(async () => {
    const user = await actor();
    return dispatchWarehouse(user, await readJson(request));
  });
}
