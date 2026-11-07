import { NextResponse } from "next/server";
import { isAppError } from "@/shared/errors";
import { actor, json, readJson, run } from "@/shared/http";
import {
  readQuoteTemplateBytes,
  setActiveQuoteTemplate,
  updateQuoteTemplateNote,
} from "@/modules/settings/quote-templates";
import { assertAny } from "@/modules/system/access";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await actor();
    assertAny(user, ["settings.manage"]);
    const { id } = await context.params;
    const { row, bytes } = await readQuoteTemplateBytes(id);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${row.fileName.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (isAppError(error)) return json({ message: error.message }, error.status);
    console.error(error);
    return json({ message: "Không tải được mẫu." }, 500);
  }
}

export async function PATCH(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const body = await readJson(request);
    if (body.active === true) return setActiveQuoteTemplate(user, id);
    return updateQuoteTemplateNote(
      user,
      id,
      body.note === undefined ? "" : String(body.note),
      body.sheetName === undefined ? undefined : String(body.sheetName),
    );
  });
}
