import { actor, readJson, run } from "@/shared/http";
import { deleteSlip, getSlip, updateSlip } from "@/modules/stock/service";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    return getSlip(user, id);
  });
}

export async function PATCH(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    return updateSlip(user, id, {
      kind: String(body.kind ?? ""),
      partnerId: String(body.partnerId ?? ""),
      projectId: String(body.projectId ?? ""),
      fromKind: String(body.fromKind ?? ""),
      fromRef: String(body.fromRef ?? ""),
      toKind: String(body.toKind ?? ""),
      toRef: String(body.toRef ?? ""),
      slipNo: String(body.slipNo ?? ""),
      reason: String(body.reason ?? ""),
      note: String(body.note ?? ""),
      revision: Number(body.revision ?? 0),
      lines: Array.isArray(body.lines) ? body.lines : [],
    });
  });
}

export async function DELETE(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    await deleteSlip(user, id);
    return { ok: true };
  });
}
