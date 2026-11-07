import { actor, run } from "@/shared/http";
import { AppError } from "@/shared/errors";
import { getQuoteTemplateBundle, uploadQuoteTemplate } from "@/modules/settings/quote-templates";
import { assertAny } from "@/modules/system/access";

export async function GET() {
  return run(async () => {
    const user = await actor();
    assertAny(user, ["settings.manage"]);
    return getQuoteTemplateBundle();
  });
}

export async function POST(request: Request) {
  return run(async () => {
    const user = await actor();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("Chọn file Excel .xlsx.", 400);
    const name = form.get("name");
    return uploadQuoteTemplate(user, file, typeof name === "string" ? name : undefined);
  });
}
