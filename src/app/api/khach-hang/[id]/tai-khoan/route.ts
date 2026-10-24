import { actor, readJson, run } from "@/shared/http";
import { replaceBankAccounts, saveBankAccount } from "@/modules/customers/service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    await saveBankAccount(user, id, {
      bankName: String(body.bankName ?? ""),
      accountNumber: String(body.accountNumber ?? ""),
      isPrimary: Boolean(body.isPrimary),
    });
    return { ok: true };
  });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    const accounts = Array.isArray(body.accounts) ? body.accounts : [];
    await replaceBankAccounts(user, id, accounts);
    return { ok: true };
  });
}
