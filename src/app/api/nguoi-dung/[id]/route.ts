import { actor, readJson, run } from "@/shared/http";
import { updateLoginAccount } from "@/modules/access/accounts";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    return updateLoginAccount(user, id, {
      name: body.name === undefined ? undefined : String(body.name),
      username: body.username === undefined ? undefined : String(body.username),
      password: body.password === undefined ? undefined : String(body.password),
      active: typeof body.active === "boolean" ? body.active : undefined,
      roleIds: body.roleIds,
    });
  });
}
