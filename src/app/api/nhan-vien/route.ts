import { actor, readJson, run } from "@/shared/http";
import { createEmployee } from "@/modules/employees/service";

export async function POST(request: Request) {
  return run(async () => {
    const user = await actor();
    const body = await readJson(request);
    const employee = await createEmployee(user, {
      name: String(body.name ?? ""),
      phone: String(body.phone ?? ""),
      email: String(body.email ?? ""),
      note: String(body.note ?? ""),
      departmentId: String(body.departmentId ?? ""),
      positionId: String(body.positionId ?? ""),
    });
    return { employee };
  });
}
