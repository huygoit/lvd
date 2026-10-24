import { AppError } from "@/shared/errors";
import { actor, readJson, run } from "@/shared/http";
import {
  approveVersion,
  copyQuotation,
  createNextVersion,
  recordDelivery,
  recordResponse,
  refreshSnapshot,
  requestChange,
  submitVersion,
  withdrawVersion,
} from "@/modules/quotations/service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    const versionId = String(body.versionId ?? "");
    const revision = Number(body.revision);
    const action = String(body.action ?? "");
    if (action === "gui-duyet") {
      await submitVersion(user, id, versionId, revision);
      return { ok: true };
    }
    if (action === "rut-duyet") {
      await withdrawVersion(user, id, versionId, revision);
      return { ok: true };
    }
    if (action === "duyet") {
      await approveVersion(user, id, versionId, revision);
      return { ok: true };
    }
    if (action === "yeu-cau-sua") {
      await requestChange(user, id, versionId, revision, String(body.reason ?? ""));
      return { ok: true };
    }
    if (action === "phien-ban-moi") return createNextVersion(user, id, versionId, String(body.reason ?? ""));
    if (action === "sao-chep") {
      return copyQuotation(user, id, versionId, {
        customerId: String(body.customerId ?? ""),
        projectId: String(body.projectId ?? ""),
      });
    }
    if (action === "cap-nhat-nguon") {
      await refreshSnapshot(user, id, versionId, revision);
      return { ok: true };
    }
    if (action === "gui-khach") {
      await recordDelivery(user, id, versionId, {
        recipientName: String(body.recipientName ?? ""),
        channel: String(body.channel ?? ""),
        note: String(body.note ?? ""),
      });
      return { ok: true };
    }
    if (action === "phan-hoi") {
      await recordResponse(user, id, versionId, {
        status: String(body.status ?? ""),
        occurredOn: String(body.occurredOn ?? ""),
        confirmerName: String(body.confirmerName ?? ""),
        note: String(body.note ?? ""),
        ngoaiLe: Boolean(body.ngoaiLe),
        thayThe: Boolean(body.thayThe),
      });
      return { ok: true };
    }
    throw new AppError("Thao tác không hợp lệ.", 400);
  });
}
