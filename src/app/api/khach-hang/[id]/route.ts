import { actor, readJson, run } from "@/shared/http";
import { applyTax } from "@/modules/quotations/calc";
import { deleteCustomer, getCustomer, updateCustomer } from "@/modules/customers/service";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const row = await getCustomer(user, id);
    return {
      id: row.id,
      code: row.code,
      type: row.type,
      name: row.name,
      shortName: row.shortName,
      taxCode: row.taxCode,
      phone: row.phone,
      fax: row.fax,
      altPhone: row.altPhone,
      email: row.email,
      address: row.address,
      invoiceName: row.invoiceName,
      invoiceTaxCode: row.invoiceTaxCode,
      invoiceAddress: row.invoiceAddress,
      invoiceEmail: row.invoiceEmail,
      representativeName: row.representativeName,
      representativeTitle: row.representativeTitle,
      executorName: row.executorName,
      executorTitle: row.executorTitle,
      ownerId: row.ownerId,
      source: row.source,
      note: row.note,
      revision: row.revision,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      contacts: row.contacts.map((item) => ({
        id: item.id,
        name: item.name,
        role: item.role,
        phone: item.phone,
        email: item.email,
        isPrimary: item.isPrimary,
      })),
      bankAccounts: row.bankAccounts.map((item) => ({
        id: item.id,
        bankName: item.bankName,
        accountNumber: item.accountNumber,
        isPrimary: item.isPrimary,
      })),
      projects: row.projects.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        stage: item.stage,
      })),
      quotations: row.quotations.map((item) => {
        const version = item.versions[0];
        const pretax = version ? version.items.reduce((sum, line) => sum + line.pretax, 0) : 0;
        return {
          id: item.id,
          code: item.code,
          status: version?.internalStatus ?? "",
          total: version ? applyTax(pretax, version.taxBps).posttax : 0,
        };
      }),
    };
  });
}

export async function DELETE(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    await deleteCustomer(user, id);
    return { ok: true };
  });
}

export async function PATCH(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    return updateCustomer(user, id, {
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
      ownerId: String(body.ownerId ?? ""),
      source: String(body.source ?? ""),
      note: String(body.note ?? ""),
      revision: Number(body.revision),
      bankAccounts: Array.isArray(body.bankAccounts) ? body.bankAccounts : undefined,
    });
  });
}
