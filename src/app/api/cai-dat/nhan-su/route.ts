import { actor, readJson, run } from "@/shared/http";
import { assignStaffOrg } from "@/modules/settings/staff-org";

export async function PATCH(request: Request) {
  return run(async () => {
    const user = await actor();
    const body = await readJson(request);
    const staff = await assignStaffOrg(user, String(body.staffId ?? ""), {
      departmentId: body.departmentId === undefined ? undefined : String(body.departmentId),
      positionId: body.positionId === undefined ? undefined : String(body.positionId),
    });
    return { staff };
  });
}
