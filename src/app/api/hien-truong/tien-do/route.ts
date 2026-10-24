import { actor, readJson, run } from "@/shared/http";
import { createProgressReport, listProgressItems, listProgressReports } from "@/modules/field/service";

export async function GET(request: Request) {
  return run(async () => {
    const user = await actor();
    const projectId = new URL(request.url).searchParams.get("cong-trinh") ?? "";
    if (projectId) return listProgressItems(user, projectId);
    return { reports: await listProgressReports(user) };
  });
}

export async function POST(request: Request) {
  return run(async () => {
    const user = await actor();
    const body = await readJson(request);
    const lines = Array.isArray(body.lines) ? body.lines as { itemId?: string; quantity?: string; note?: string }[] : [];
    return createProgressReport(user, {
      projectId: String(body.projectId ?? ""),
      reportedOn: String(body.reportedOn ?? ""),
      note: String(body.note ?? ""),
      lines,
    });
  });
}
