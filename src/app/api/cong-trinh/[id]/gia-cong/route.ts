import { actor, readJson, run } from "@/shared/http";
import { createFabricationContract, listProjectFabrication, listWorkshopPartners } from "@/modules/fabrication/service";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const [rows, workshops] = await Promise.all([listProjectFabrication(user, id), listWorkshopPartners(user)]);
    return { rows, workshops };
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    return createFabricationContract(user, id, body);
  });
}
