import { NextResponse } from "next/server";
import { actor, run } from "@/shared/http";
import { AppError } from "@/shared/errors";
import { deleteCompanyLogo, readCompanyLogo, saveCompanyLogo } from "@/modules/settings/company-profile";

export async function GET() {
  try {
    const file = await readCompanyLogo(await actor());
    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return run(async () => { throw error; });
  }
}

export async function POST(request: Request) {
  return run(async () => {
    const form = await request.formData();
    const file = form.get("tep");
    if (!(file instanceof File)) throw new AppError("Chưa chọn logo.", 400);
    return saveCompanyLogo(await actor(), file);
  });
}

export async function DELETE() {
  return run(async () => {
    await deleteCompanyLogo(await actor());
    return { hasLogo: false };
  });
}
