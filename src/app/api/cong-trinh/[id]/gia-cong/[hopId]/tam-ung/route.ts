import { actor, readJson, run } from "@/shared/http";
import { addFabricationAdvance } from "@/modules/fabrication/service";

export async function POST(request: Request, context: { params: Promise<{ id: string; hopId: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id, hopId } = await context.params;
    const body = await readJson(request);
    return addFabricationAdvance(user, id, hopId, body);
  });
}
