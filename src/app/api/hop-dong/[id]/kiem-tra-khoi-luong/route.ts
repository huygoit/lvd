import { actor, readJson, run } from "@/shared/http";
import { checkQuantity } from "@/modules/contracts/service";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    return checkQuantity(user, id, await readJson(request));
  });
}
