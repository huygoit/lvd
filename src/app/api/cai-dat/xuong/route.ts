import { actor, readJson, run } from "@/shared/http";
import { listWorkshopContacts, saveWorkshopContact } from "@/modules/settings/workshops";

export async function GET() {
  return run(async () => listWorkshopContacts(await actor()));
}

export async function PUT(request: Request) {
  return run(async () => saveWorkshopContact(await actor(), await readJson(request)));
}
