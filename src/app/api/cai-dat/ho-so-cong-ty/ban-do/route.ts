import { actor, run } from "@/shared/http";
import { timViTri } from "@/modules/settings/company-profile";

export async function GET(request: Request) {
  return run(async () => {
    const q = new URL(request.url).searchParams.get("q") ?? "";
    return timViTri(await actor(), q);
  });
}
