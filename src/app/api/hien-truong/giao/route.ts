import { actor, run } from "@/shared/http";
import { listDeliveries } from "@/modules/deliveries/service";

export async function GET(request: Request) {
  return run(async () => {
    const user = await actor();
    const noi = new URL(request.url).searchParams.get("noi");
    const cho = noi === "kho" || noi === "xuong" ? noi : "cong_trinh";
    return listDeliveries(user, cho);
  });
}
