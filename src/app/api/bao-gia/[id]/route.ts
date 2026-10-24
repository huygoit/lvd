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
    return saveDraft(user, id, String(body.versionId ?? ""), {
      revision: Number(body.revision),
      title: String(body.title ?? ""),
      quoteDate: String(body.quoteDate ?? ""),
      validUntil: String(body.validUntil ?? ""),
      ownerId: String(body.ownerId ?? ""),
      receiverName: String(body.receiverName ?? ""),
      receiverTitle: String(body.receiverTitle ?? ""),
      receiverPhone: String(body.receiverPhone ?? ""),
      receiverEmail: String(body.receiverEmail ?? ""),
      scheduleText: String(body.scheduleText ?? ""),
      paymentTerms: String(body.paymentTerms ?? ""),
      deliveryTerms: String(body.deliveryTerms ?? ""),
      warrantyTerms: String(body.warrantyTerms ?? ""),
      includedScope: String(body.includedScope ?? ""),
      excludedScope: String(body.excludedScope ?? ""),
      note: String(body.note ?? ""),
      taxPercent: Number(body.taxPercent ?? 10),
      warrantyMonths: Number(body.warrantyMonths ?? 0),
      advanceAmount: Number(body.advanceAmount ?? 0),
      advanceDays: Number(body.advanceDays ?? 0),
      paymentDays: Number(body.paymentDays ?? 0),
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
