import { actor, readJson, run } from "@/shared/http";
import { getContract, updateContract } from "@/modules/contracts/service";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    return getContract(user, id);
  });
}

export async function PATCH(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    return updateContract(user, id, await readJson(request));
  });
}
