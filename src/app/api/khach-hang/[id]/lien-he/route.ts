import { actor, readJson, run } from "@/shared/http";
import { saveContact } from "@/modules/customers/service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    await saveContact(user, id, {
      id: typeof body.id === "string" ? body.id : undefined,
      name: String(body.name ?? ""),
      role: String(body.role ?? ""),
      phone: String(body.phone ?? ""),
      email: String(body.email ?? ""),
      note: String(body.note ?? ""),
      isPrimary: Boolean(body.isPrimary),
    });
    return { ok: true };
  });
}
