import { actor, readJson, run } from "@/shared/http";
import { createSupplyRequest, listSupplyRequests, type SupplyLineInput } from "@/modules/field/service";

export async function GET() {
  return run(async () => {
    const user = await actor();
    return { requests: await listSupplyRequests(user) };
  });
}

export async function POST(request: Request) {
  return run(async () => {
    const user = await actor();
    const body = await readJson(request);
    const lines = Array.isArray(body.lines) ? (body.lines as SupplyLineInput[]) : [];
    const created = await createSupplyRequest(user, {
      projectId: String(body.projectId ?? ""),
      neededOn: String(body.neededOn ?? ""),
      note: String(body.note ?? ""),
      lines,
    });
    return created;
  });
}
