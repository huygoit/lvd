import { NextResponse } from "next/server";
import { deleteBackup, readBackupZip, restoreBackup } from "@/modules/system/backup";
import { isAppError } from "@/shared/errors";
import { actor, json, readJson, run } from "@/shared/http";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await actor();
    const { id } = await context.params;
    const file = await readBackupZip(user, id);
    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${file.fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (isAppError(error)) return json({ message: error.message }, error.status);
    console.error(error);
    return json({ message: "Không tải được bản sao lưu." }, 500);
  }
}


export async function POST(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    return restoreBackup(user, id, String(body.confirm ?? ""));
  });
}

export async function DELETE(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    return deleteBackup(user, id);
  });
}
