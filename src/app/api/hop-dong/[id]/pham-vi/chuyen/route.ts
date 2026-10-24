import { actor, readJson, run } from "@/shared/http";
import { moveLine } from "@/modules/contracts/service";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    return moveLine(user, id, await readJson(request));
  });
}
