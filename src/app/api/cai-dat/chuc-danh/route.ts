import { actor, readJson, run } from "@/shared/http";
import { createJobTitle, listJobTitles, reorderJobTitles } from "@/modules/settings/job-titles";
import { assertAny } from "@/modules/system/access";

export async function GET() {
  return run(async () => {
    const user = await actor();
    assertAny(user, ["settings.manage"]);
    return { titles: await listJobTitles() };
  });
}

export async function PATCH(request: Request) {
  return run(async () => {
    const user = await actor();
    const body = await readJson(request);
    const order = Array.isArray(body.order) ? body.order.map((id) => String(id)) : [];
    await reorderJobTitles(user, order);
    return { titles: await listJobTitles() };
  });
}

export async function POST(request: Request) {
  return run(async () => {
    const user = await actor();
    const body = await readJson(request);
    const created = await createJobTitle(user, String(body.name ?? ""));
    return { title: created, titles: await listJobTitles() };
  });
}
