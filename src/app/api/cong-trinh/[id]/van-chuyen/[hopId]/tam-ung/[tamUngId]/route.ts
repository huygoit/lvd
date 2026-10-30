import { actor, run } from "@/shared/http";
import { deleteTransportAdvance } from "@/modules/transport/service";

export async function DELETE(_: Request, context: { params: Promise<{ id: string; hopId: string; tamUngId: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id, hopId, tamUngId } = await context.params;
    return deleteTransportAdvance(user, id, hopId, tamUngId);
  });
}