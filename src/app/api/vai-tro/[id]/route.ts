import { actor, readJson, run } from "@/shared/http";
import { getRole, updateRole } from "@/modules/access/roles";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    return getRole(user, id);
  });
}

export async function PATCH(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    const role = await updateRole(user, id, {
      name: body.name === undefined ? undefined : String(body.name),
      description: body.description === undefined ? undefined : String(body.description),
      active: typeof body.active === "boolean" ? body.active : undefined,
      capabilities: body.capabilities,
      userIds: body.userIds,
    });
    return { role };
  });
}
