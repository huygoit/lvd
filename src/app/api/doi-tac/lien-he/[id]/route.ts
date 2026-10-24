import { actor, run } from "@/shared/http";
import { deletePartnerContact } from "@/modules/partners/service";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    await deletePartnerContact(user, id);
    return { ok: true };
  });
}
