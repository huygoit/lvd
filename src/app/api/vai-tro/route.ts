import { actor, readJson, run } from "@/shared/http";
import { createRole } from "@/modules/access/roles";

export async function POST(request: Request) {
  return run(async () => {
    const user = await actor();
    const body = await readJson(request);
    const role = await createRole(user, {
      name: String(body.name ?? ""),
      description: String(body.description ?? ""),
      capabilities: body.capabilities,
      userIds: body.userIds,
    });
    return { role };
  });
}
