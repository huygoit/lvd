import { actor, run } from "@/shared/http";
import { listStaff } from "@/modules/customers/service";

export async function GET(request: Request) {
  void request;
  return run(async () => {
    await actor();
    const rows = await listStaff();
    return { rows: rows.map((item) => ({ id: item.id, name: item.name })) };
  });
}
