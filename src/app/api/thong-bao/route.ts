import { actor, run } from "@/shared/http";
import { listNotices } from "@/modules/deliveries/service";

export async function GET() {
  return run(async () => {
    const user = await actor();
    return listNotices(user);
  });
}
