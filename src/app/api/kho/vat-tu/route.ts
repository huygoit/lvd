import { actor, run } from "@/shared/http";
import { searchStockMaterials } from "@/modules/stock/service";

export async function GET(request: Request) {
  return run(async () => {
    const user = await actor();
    const q = new URL(request.url).searchParams.get("q") ?? "";
    const glassOnly = new URL(request.url).searchParams.get("kinh") === "1";
    return searchStockMaterials(user, q, glassOnly);
  });
}
