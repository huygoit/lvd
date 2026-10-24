import { actor, run } from "@/shared/http";
import { archiveCustomer } from "@/modules/customers/service";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    await archiveCustomer(user, id);
    return { ok: true };
  });
}
