import { actor, run } from "@/shared/http";
import { compareVersions } from "@/modules/quotations/service";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const params = new URL(request.url).searchParams;
    return compareVersions(user, id, params.get("trai") ?? "", params.get("phai") ?? "");
  });
}
