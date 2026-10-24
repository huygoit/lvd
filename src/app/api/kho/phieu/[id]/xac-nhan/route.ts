import { actor, readJson, run } from "@/shared/http";
import { confirmKgLine } from "@/modules/stock/service";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    await confirmKgLine(user, id, String(body.lineId ?? ""), {
      barCount: body.barCount,
      lengthM: body.lengthM,
      weighedKg: body.weighedKg,
    });
    return { ok: true };
  });
}
