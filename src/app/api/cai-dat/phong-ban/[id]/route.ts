import { actor, readJson, run } from "@/shared/http";
import { listDepartments, updateDepartment } from "@/modules/settings/departments";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    const updated = await updateDepartment(user, id, {
      name: body.name === undefined ? undefined : String(body.name),
      active: typeof body.active === "boolean" ? body.active : undefined,
    });
    return { department: updated, departments: await listDepartments() };
  });
}
