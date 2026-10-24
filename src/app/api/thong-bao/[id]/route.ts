import { actor, run } from "@/shared/http";
import { markNoticeRead } from "@/modules/deliveries/service";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    return markNoticeRead(user, id);
  });
}
