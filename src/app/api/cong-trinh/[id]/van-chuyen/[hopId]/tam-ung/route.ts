import { actor, readJson, run } from "@/shared/http";
import { addTransportAdvance } from "@/modules/transport/service";

export async function POST(request: Request, context: { params: Promise<{ id: string; hopId: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id, hopId } = await context.params;
    const body = await readJson(request);
    return addTransportAdvance(user, id, hopId, body);
  });
}
