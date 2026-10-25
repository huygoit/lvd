import { NextResponse } from "next/server";
import { actor, run } from "@/shared/http";
import { deleteCompanyFile, readCompanyFile } from "@/modules/settings/company-profile";
import { tieuDeTaiXuong } from "@/modules/projects/document-check";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const file = await readCompanyFile(await actor(), id);
    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": tieuDeTaiXuong(file.fileName),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return run(async () => { throw error; });
  }
}

export async function DELETE(_request: Request, context: Context) {
  return run(async () => {
    const { id } = await context.params;
    await deleteCompanyFile(await actor(), id);
    return { ok: true };
  });
}
