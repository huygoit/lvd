import { actor, readJson, run } from "@/shared/http";
import { getEmployee, updateEmployee } from "@/modules/employees/service";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    return getEmployee(user, id);
  });
}

export async function PATCH(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    const employee = await updateEmployee(user, id, {
      name: body.name === undefined ? undefined : String(body.name),
      phone: body.phone === undefined ? undefined : String(body.phone),
      email: body.email === undefined ? undefined : String(body.email),
      note: body.note === undefined ? undefined : String(body.note),
      departmentId: body.departmentId === undefined ? undefined : String(body.departmentId),
      positionId: body.positionId === undefined ? undefined : String(body.positionId),
      active: typeof body.active === "boolean" ? body.active : undefined,
    });
    return { employee };
  });
}
