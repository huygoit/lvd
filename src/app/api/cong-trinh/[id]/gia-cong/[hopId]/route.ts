import { actor, readJson, run } from "@/shared/http";
import { deleteFabricationContract, getFabricationContract, updateFabricationContract } from "@/modules/fabrication/service";

export async function GET(_: Request, context: { params: Promise<{ id: string; hopId: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id, hopId } = await context.params;
    return getFabricationContract(user, id, hopId);
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string; hopId: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id, hopId } = await context.params;
    const body = await readJson(request);
    return updateFabricationContract(user, id, hopId, body);
  });
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string; hopId: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id, hopId } = await context.params;
    await deleteFabricationContract(user, id, hopId);
  });
}
