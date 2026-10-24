import { actor, readJson, run } from "@/shared/http";
import { createPartner, listPartners } from "@/modules/partners/service";

export async function GET(request: Request) {
  return run(async () => {
    const user = await actor();
    const params = new URL(request.url).searchParams;
    return listPartners(user, {
      q: params.get("q") ?? undefined,
      role: params.get("vai-tro") ?? undefined,
      status: params.get("trang-thai") ?? undefined,
      page: Number(params.get("trang") || 1),
    });
  });
}

export async function POST(request: Request) {
  return run(async () => {
    const user = await actor();
    const body = await readJson(request);
    return createPartner(user, {
      code: String(body.code ?? ""),
      name: String(body.name ?? ""),
      shortName: String(body.shortName ?? ""),
      taxCode: String(body.taxCode ?? ""),
      phone: String(body.phone ?? ""),
      email: String(body.email ?? ""),
      website: String(body.website ?? ""),
      bankName: String(body.bankName ?? ""),
      accountNumber: String(body.accountNumber ?? ""),
      address: String(body.address ?? ""),
      representativeName: String(body.representativeName ?? ""),
      representativeTitle: String(body.representativeTitle ?? ""),
      note: String(body.note ?? ""),
      roles: body.roles,
    });
  });
}
