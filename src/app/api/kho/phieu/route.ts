import { actor, readJson, run } from "@/shared/http";
import { createSlip, listSlips } from "@/modules/stock/service";
import { isStockSlipKind } from "@/shared/catalog/stock";

export async function GET(request: Request) {
  return run(async () => {
    const user = await actor();
    const params = new URL(request.url).searchParams;
    const kind = params.get("loai") ?? "";
    return listSlips(user, {
      q: params.get("q") ?? undefined,
      kind: isStockSlipKind(kind) ? kind : undefined,
      page: Number(params.get("trang") || 1),
    });
  });
}

export async function POST(request: Request) {
  return run(async () => {
    const user = await actor();
    const body = await readJson(request);
    return createSlip(user, {
      kind: String(body.kind ?? ""),
      partnerId: String(body.partnerId ?? ""),
      projectId: String(body.projectId ?? ""),
      fromKind: String(body.fromKind ?? ""),
      fromRef: String(body.fromRef ?? ""),
      toKind: String(body.toKind ?? ""),
      toRef: String(body.toRef ?? ""),
      slipNo: String(body.slipNo ?? ""),
      reason: String(body.reason ?? ""),
      note: String(body.note ?? ""),
      lines: Array.isArray(body.lines) ? body.lines : [],
    });
  });
}
