import { actor, readJson, run } from "@/shared/http";
import { createTransportContract, listProjectTransport, listTransportPartners } from "@/modules/transport/service";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const [rows, carriers] = await Promise.all([listProjectTransport(user, id), listTransportPartners(user)]);
    return { rows, carriers };
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    return createTransportContract(user, id, body);
  });
}
