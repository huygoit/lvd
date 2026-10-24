import { actor, run } from "@/shared/http";
import { deleteContact } from "@/modules/customers/service";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    await deleteContact(user, id);
    return { ok: true };
  });
}
