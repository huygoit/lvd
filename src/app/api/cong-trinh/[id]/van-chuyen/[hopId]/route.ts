import { actor, readJson, run } from "@/shared/http";
import { deleteTransportContract, getTransportContract, updateTransportContract } from "@/modules/transport/service";

export async function GET(_: Request, context: { params: Promise<{ id: string; hopId: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id, hopId } = await context.params;
    return getTransportContract(user, id, hopId);
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string; hopId: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id, hopId } = await context.params;
    const body = await readJson(request);
    return updateTransportContract(user, id, hopId, body);
  });
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string; hopId: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id, hopId } = await context.params;
    await deleteTransportContract(user, id, hopId);
  });
}
