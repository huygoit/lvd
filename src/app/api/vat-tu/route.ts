import { actor, readJson, run } from "@/shared/http";
import { createMaterial, listMaterials } from "@/modules/materials/service";
import { isMaterialPriceBasis } from "@/shared/catalog/materials";

export async function GET(request: Request) {
  return run(async () => {
    const user = await actor();
    const params = new URL(request.url).searchParams;
    const basis = params.get("tinh-tien") ?? "";
    return listMaterials(user, {
      q: params.get("q") ?? undefined,
      groupName: params.get("nhom") ?? undefined,
      priceBasis: isMaterialPriceBasis(basis) ? basis : undefined,
      page: Number(params.get("trang") || 1),
    });
  });
}

export async function POST(request: Request) {
  return run(async () => {
    const user = await actor();
    const body = await readJson(request);
    return createMaterial(user, {
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
    });
  });
}
