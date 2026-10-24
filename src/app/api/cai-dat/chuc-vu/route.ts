import { actor, readJson, run } from "@/shared/http";
import { createPosition, listPositions } from "@/modules/settings/positions";
import { assertAny } from "@/modules/system/access";

export async function GET() {
  return run(async () => {
    const user = await actor();
    assertAny(user, ["settings.manage"]);
    return { positions: await listPositions() };
  });
}

export async function POST(request: Request) {
  return run(async () => {
    const user = await actor();
    const body = await readJson(request);
    const created = await createPosition(user, String(body.name ?? ""));
    return { position: created, positions: await listPositions() };
  });
}
