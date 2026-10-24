import { actor, readJson, run } from "@/shared/http";
import { createCustomer, listCustomers } from "@/modules/customers/service";

export async function GET(request: Request) {
  return run(async () => {
    const user = await actor();
    const params = new URL(request.url).searchParams;
    return listCustomers(user, {
      q: params.get("q") ?? undefined,
      type: params.get("loai") ?? undefined,
      ownerId: params.get("phu-trach") ?? undefined,
      status: params.get("trang-thai") ?? undefined,
      page: Number(params.get("trang") || 1),
    });
  });
}

export async function POST(request: Request) {
  return run(async () => {
    const user = await actor();
    const body = await readJson(request);
    return createCustomer(user, {
      type: String(body.type ?? ""),
      name: String(body.name ?? ""),
      shortName: String(body.shortName ?? ""),
      taxCode: String(body.taxCode ?? ""),
      phone: String(body.phone ?? ""),
      fax: String(body.fax ?? ""),
      altPhone: String(body.altPhone ?? ""),
      email: String(body.email ?? ""),
      address: String(body.address ?? ""),
      invoiceName: String(body.invoiceName ?? ""),
      invoiceTaxCode: String(body.invoiceTaxCode ?? ""),
      invoiceAddress: String(body.invoiceAddress ?? ""),
      invoiceEmail: String(body.invoiceEmail ?? ""),
      representativeName: String(body.representativeName ?? ""),
      representativeTitle: String(body.representativeTitle ?? ""),
      executorName: String(body.executorName ?? ""),
      executorTitle: String(body.executorTitle ?? ""),
      ownerId: String(body.ownerId ?? user.id),
      source: String(body.source ?? ""),
      note: String(body.note ?? ""),
      bankAccounts: Array.isArray(body.bankAccounts) ? body.bankAccounts : [],
    });
  });
}
