import { actor, readJson, run } from "@/shared/http";
import { listPositions, updatePosition } from "@/modules/settings/positions";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    const updated = await updatePosition(user, id, {
      name: body.name === undefined ? undefined : String(body.name),
      active: typeof body.active === "boolean" ? body.active : undefined,
    });
    return { position: updated, positions: await listPositions() };
  });
}
