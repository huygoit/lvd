import { actor, readJson, run } from "@/shared/http";
import { createDepartment, listDepartments, reorderDepartments } from "@/modules/settings/departments";
import { assertAny } from "@/modules/system/access";

export async function GET() {
  return run(async () => {
    const user = await actor();
    assertAny(user, ["settings.manage"]);
    return { departments: await listDepartments() };
  });
}

export async function PATCH(request: Request) {
  return run(async () => {
    const user = await actor();
    const body = await readJson(request);
    const order = Array.isArray(body.order) ? body.order.map((id) => String(id)) : [];
    await reorderDepartments(user, order);
    return { departments: await listDepartments() };
  });
}

export async function POST(request: Request) {
  return run(async () => {
    const user = await actor();
    const body = await readJson(request);
    const created = await createDepartment(user, String(body.name ?? ""));
    return { department: created, departments: await listDepartments() };
  });
}
