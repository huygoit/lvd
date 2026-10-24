import { actor, run } from "@/shared/http";
import { deleteBankAccount } from "@/modules/customers/service";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    await deleteBankAccount(user, id);
    return { ok: true };
  });
}
