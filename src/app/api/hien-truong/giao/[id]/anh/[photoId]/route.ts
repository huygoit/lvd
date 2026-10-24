import { NextResponse } from "next/server";
import { actor, json } from "@/shared/http";
import { isAppError } from "@/shared/errors";
import { readDeliveryPhoto } from "@/modules/deliveries/service";

type Context = { params: Promise<{ id: string; photoId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await actor();
    const { id, photoId } = await context.params;
    const file = await readDeliveryPhoto(user, id, photoId);
    return new NextResponse(new Uint8Array(file.bytes), {
      headers: { "Content-Type": file.type, "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (isAppError(error)) return json({ message: error.message }, error.status);
    console.error(error);
    return json({ message: "Không xem được ảnh." }, 500);
  }
}
