import { actor, readJson, run } from "@/shared/http";
import { deleteQuotation, getQuotation, saveDraft, type LineInput } from "@/modules/quotations/service";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    return getQuotation(user, id);
  });
}

export async function PUT(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    const items = Array.isArray(body.items) ? (body.items as LineInput[]) : [];
    const paymentMilestones = Array.isArray(body.paymentMilestones) ? body.paymentMilestones : [];
    return saveDraft(user, id, String(body.versionId ?? ""), {
      revision: Number(body.revision),
      validityDays: Number(body.validityDays ?? 0),
      quoteNote: String(body.quoteNote ?? ""),
      taxPercent: Number(body.taxPercent ?? 10),
      warrantyMonths: Number(body.warrantyMonths ?? 0),
      paymentMilestones,
      items,
    });
  });
}

export async function DELETE(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    await deleteQuotation(user, id);
    return { ok: true };
  });
}
