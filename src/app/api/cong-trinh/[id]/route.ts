import { actor, readJson, run } from "@/shared/http";
import { deleteProject, getProject, updateProject } from "@/modules/projects/service";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const row = await getProject(user, id);
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      customerId: row.customerId,
      customerCode: row.customer.code,
      customerName: row.customer.name,
      location: row.location,
      venture: row.venture,
      bidPackage: row.bidPackage,
      startedOn: row.startedOn,
      endedOn: row.endedOn,
      vatPercent: row.vatPercent,
      ownerId: row.ownerId,
      note: row.note,
      stage: row.stage,
      revision: row.revision,
    };
  });
}

export async function PATCH(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    const project = await updateProject(user, id, {
      name: String(body.name ?? ""),
      customerId: String(body.customerId ?? ""),
      location: String(body.location ?? ""),
      venture: String(body.venture ?? ""),
      bidPackage: String(body.bidPackage ?? ""),
      startedOn: String(body.startedOn ?? ""),
      endedOn: String(body.endedOn ?? ""),
      vatPercent: body.vatPercent == null ? "" : String(body.vatPercent),
      ownerId: String(body.ownerId ?? ""),
      note: String(body.note ?? ""),
      stage: String(body.stage ?? ""),
      revision: Number(body.revision),
    });
    return { id: project.id, revision: project.revision };
  });
}

export async function DELETE(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    await deleteProject(user, id);
    return { ok: true };
  });
}
