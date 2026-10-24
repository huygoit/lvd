import { actor, readJson, run } from "@/shared/http";
import { deleteMaterial, getMaterial, updateMaterial } from "@/modules/materials/service";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    return getMaterial(user, id);
  });
}

export async function PATCH(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    return updateMaterial(user, id, {
      code: String(body.code ?? ""),
      name: String(body.name ?? ""),
      groupName: String(body.groupName ?? ""),
      supplierCode: String(body.supplierCode ?? ""),
      supplierItemCode: String(body.supplierItemCode ?? ""),
      otherCode: String(body.otherCode ?? ""),
      spec: String(body.spec ?? ""),
      color: String(body.color ?? ""),
      stockUnit: String(body.stockUnit ?? ""),
      priceBasis: String(body.priceBasis ?? ""),
      barLengthM: body.barLengthM,
      kgPerM: body.kgPerM,
      kgPerBar: body.kgPerBar,
      taxPercent: body.taxPercent,
      referencePrice: body.referencePrice,
      invoiceName: String(body.invoiceName ?? ""),
      nature: String(body.nature ?? "vat_tu"),
      note: String(body.note ?? ""),
      revision: Number(body.revision),
    });
  });
}

export async function DELETE(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    await deleteMaterial(user, id);
    return { ok: true };
  });
}
