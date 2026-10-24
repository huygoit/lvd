import { actor, readJson, run } from "@/shared/http";
import { deletePartner, getPartner, updatePartner } from "@/modules/partners/service";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const row = await getPartner(user, id);
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      shortName: row.shortName,
      taxCode: row.taxCode,
      phone: row.phone,
      email: row.email,
      website: row.website,
      bankName: row.bankName,
      accountNumber: row.accountNumber,
      address: row.address,
      representativeName: row.representativeName,
      representativeTitle: row.representativeTitle,
      note: row.note,
      roles: row.roles,
      revision: row.revision,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      contacts: row.contacts.map((item) => ({
        id: item.id,
        name: item.name,
        title: item.title,
        phone: item.phone,
        email: item.email,
        isPrimary: item.isPrimary,
      })),
    };
  });
}

export async function DELETE(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    await deletePartner(user, id);
    return { ok: true };
  });
}

export async function PATCH(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    return updatePartner(user, id, {
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
      revision: Number(body.revision),
    });
  });
}
