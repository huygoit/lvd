import { actor, readJson, run } from "@/shared/http";
import { createQuotation, listQuotations } from "@/modules/quotations/service";

export async function GET(request: Request) {
  return run(async () => {
    const user = await actor();
    const params = new URL(request.url).searchParams;
    return {
      rows: await listQuotations(user, {
        q: params.get("q") ?? undefined,
        internal: params.get("noi-bo") ?? undefined,
        customer: params.get("khach") ?? undefined,
        ownerId: params.get("phu-trach") ?? undefined,
        from: params.get("tu") ?? undefined,
        to: params.get("den") ?? undefined,
      }),
    };
  });
}

export async function POST(request: Request) {
  return run(async () => {
    const user = await actor();
    const body = await readJson(request);
    return createQuotation(user, {
      customerId: String(body.customerId ?? ""),
      projectId: typeof body.projectId === "string" && body.projectId ? body.projectId : undefined,
      projectName: String(body.projectName ?? ""),
      location: String(body.location ?? ""),
      title: String(body.title ?? ""),
    });
  });
}
