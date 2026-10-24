import { AppError } from "@/shared/errors";
import { actor, run } from "@/shared/http";
import { saveFile } from "@/modules/files/service";

export async function POST(request: Request) {
  return run(async () => {
    const user = await actor();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("Chọn một tệp.", 400);
    const saved = await saveFile(user, String(form.get("entityType") ?? ""), String(form.get("entityId") ?? ""), file);
    return { id: saved.id, fileName: saved.fileName, size: saved.size, locked: saved.locked };
  });
}
