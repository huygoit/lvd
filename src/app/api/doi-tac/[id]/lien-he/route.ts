import { actor, readJson, run } from "@/shared/http";
import { savePartnerContact } from "@/modules/partners/service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    await savePartnerContact(user, id, {
      name: String(body.name ?? ""),
      title: String(body.title ?? ""),
      phone: String(body.phone ?? ""),
      email: String(body.email ?? ""),
      note: String(body.note ?? ""),
      isPrimary: Boolean(body.isPrimary),
    });
    return { ok: true };
  });
}
