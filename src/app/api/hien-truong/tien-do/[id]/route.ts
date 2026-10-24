import { actor, run } from "@/shared/http";
import { cancelProgressReport } from "@/modules/field/service";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    await cancelProgressReport(user, id);
    return { ok: true };
  });
}
