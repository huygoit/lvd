import { actor, run } from "@/shared/http";
import { postSlip } from "@/modules/stock/service";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    await postSlip(user, id);
    return { ok: true };
  });
}
