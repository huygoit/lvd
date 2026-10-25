import { actor, readJson, run } from "@/shared/http";
import { createProjectSharedCost, listProjectSharedCosts } from "@/modules/projects/shared-costs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    return listProjectSharedCosts(user, id);
  });
}

export async function POST(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    return createProjectSharedCost(user, id, body);
  });
}
