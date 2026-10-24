import { actor, readJson, run } from "@/shared/http";
import { createLoginAccount } from "@/modules/access/accounts";

export async function POST(request: Request) {
  return run(async () => {
    const user = await actor();
    const body = await readJson(request);
    const account = await createLoginAccount(user, {
      name: String(body.name ?? ""),
      username: String(body.username ?? ""),
      password: String(body.password ?? ""),
      roleIds: body.roleIds,
      staffId: String(body.staffId ?? ""),
    });
    return { account };
  });
}
