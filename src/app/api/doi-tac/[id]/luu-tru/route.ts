import { actor, run } from "@/shared/http";
import { archivePartner } from "@/modules/partners/service";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    await archivePartner(user, id);
    return { ok: true };
  });
}
