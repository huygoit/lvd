import { NextResponse } from "next/server";
import { actor, json, run } from "@/shared/http";
import { openFile, removeFile } from "@/modules/files/service";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await actor();
    const { id } = await context.params;
    const file = await openFile(user, id);
    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.mime,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return run(async () => {
      throw error;
    });
  }
}

export async function DELETE(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    await removeFile(user, id);
    return { ok: true };
  });
}

export function OPTIONS() {
  return json({ ok: true });
}
