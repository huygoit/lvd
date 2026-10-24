import { actor, readJson, run } from "@/shared/http";
import { createProjectCost, listProjectCosts } from "@/modules/projects/costs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    return listProjectCosts(user, id);
  });
}

export async function POST(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    return createProjectCost(user, id, body);
  });
}
