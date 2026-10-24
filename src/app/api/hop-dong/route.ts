import { actor, readJson, run } from "@/shared/http";
import { createContract, listContracts } from "@/modules/contracts/service";

export async function GET(request: Request) {
  return run(async () => {
    const user = await actor();
    const params = new URL(request.url).searchParams;
    const rows = await listContracts(user, { q: params.get("q") ?? undefined, projectId: params.get("cong-trinh") ?? undefined });
    return { rows };
  });
}

export async function POST(request: Request) {
  return run(async () => {
    const user = await actor();
    const body = await readJson(request);
    const contract = await createContract(user, {
      projectId: String(body.projectId ?? ""),
      customerId: typeof body.customerId === "string" ? body.customerId : undefined,
      kind: String(body.kind ?? ""),
      name: typeof body.name === "string" ? body.name : undefined,
      priceBasis: typeof body.priceBasis === "string" ? body.priceBasis : undefined,
      quotationVersionId: typeof body.quotationVersionId === "string" ? body.quotationVersionId : undefined,
    });
    return { id: contract.id, code: contract.code };
  });
}
