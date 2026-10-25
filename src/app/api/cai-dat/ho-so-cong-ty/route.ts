import { actor, readJson, run } from "@/shared/http";
import { readCompanyProfile, updateCompanyProfile } from "@/modules/settings/company-profile";

export async function GET() {
  return run(async () => readCompanyProfile(await actor()));
}

export async function PATCH(request: Request) {
  return run(async () => updateCompanyProfile(await actor(), await readJson(request)));
}
