import { actor, run } from "@/shared/http";
import { searchFieldMaterials } from "@/modules/field/service";

export async function GET(request: Request) {
  return run(async () => {
    const user = await actor();
    const q = new URL(request.url).searchParams.get("q") ?? "";
    return { rows: await searchFieldMaterials(user, q) };
  });
}
