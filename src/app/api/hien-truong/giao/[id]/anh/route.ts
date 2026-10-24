import { actor, run } from "@/shared/http";
import { AppError } from "@/shared/errors";
import { addDeliveryPhoto } from "@/modules/deliveries/service";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    const form = await request.formData();
    const file = form.get("tep");
    if (!(file instanceof File)) throw new AppError("Chọn một ảnh.", 400);
    return addDeliveryPhoto(user, id, file);
  });
}
