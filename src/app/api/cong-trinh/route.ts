import { actor, readJson, run } from "@/shared/http";
import { createProject, listProjects } from "@/modules/projects/service";

export async function GET(request: Request) {
  return run(async () => {
    const user = await actor();
    const params = new URL(request.url).searchParams;
    const rows = await listProjects(user, {
      q: params.get("q") ?? undefined,
      customerId: params.get("khach") ?? undefined,
      stage: params.get("giai-doan") ?? undefined,
    });
    return {
      rows: rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        location: row.location,
        venture: row.venture,
        bidPackage: row.bidPackage,
        startedOn: row.startedOn,
        endedOn: row.endedOn,
        vatPercent: row.vatPercent,
        stage: row.stage,
        customerId: row.customerId,
        customerName: row.customer.name,
      })),
    };
  });
}

export async function POST(request: Request) {
  return run(async () => {
    const user = await actor();
    const body = await readJson(request);
    const project = await createProject(user, {
      name: String(body.name ?? ""),
      customerId: String(body.customerId ?? ""),
      location: String(body.location ?? ""),
      venture: String(body.venture ?? ""),
      bidPackage: String(body.bidPackage ?? ""),
      startedOn: String(body.startedOn ?? ""),
      endedOn: String(body.endedOn ?? ""),
      vatPercent: body.vatPercent == null ? "" : String(body.vatPercent),
      ownerId: String(body.ownerId ?? user.id),
      note: String(body.note ?? ""),
    });
    return { id: project.id, code: project.code };
  });
}
