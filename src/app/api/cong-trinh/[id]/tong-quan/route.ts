import { actor, run } from "@/shared/http";
import { readProjectOverview } from "@/modules/projects/overview";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    return readProjectOverview(user, id);
  });
}
