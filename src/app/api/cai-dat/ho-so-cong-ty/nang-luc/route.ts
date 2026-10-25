import { actor, run } from "@/shared/http";
import { AppError } from "@/shared/errors";
import { saveCompanyFile } from "@/modules/settings/company-profile";

export async function POST(request: Request) {
  return run(async () => {
    const form = await request.formData();
    const file = form.get("tep");
    if (!(file instanceof File)) throw new AppError("Chưa chọn file.", 400);
    return saveCompanyFile(await actor(), file);
  });
}
