import { actor, readJson, run } from "@/shared/http";
import { actContract } from "@/modules/contracts/service";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    return actContract(user, id, String(body.action ?? ""), body);
  });
}
