import { actor, run } from "@/shared/http";
import { AppError, isAppError } from "@/shared/errors";
import { createManualProjectOrder, importProjectOrder, listProjectOrders } from "@/modules/projects/orders";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  return run(async () => {
    const user = await actor();
    const { id } = await context.params;
    return listProjectOrders(user, id);
  });
}

export async function POST(request: Request, context: Context) {
  const contentType = request.headers.get("content-type") || "";
  // JSON: tạo đơn tay. FormData: nạp từ file PDF (SSE).
  if (contentType.includes("application/json")) {
    return run(async () => {
      const user = await actor();
      const { id } = await context.params;
      const body = (await request.json()) as { kind?: unknown };
      return createManualProjectOrder(user, id, body.kind);
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      try {
        const user = await actor();
        const { id } = await context.params;
        const form = await request.formData();
        const file = form.get("tep");
        if (!(file instanceof File)) throw new AppError("Chọn file PDF.", 400);
        send({ stage: "tai" });
        const order = await importProjectOrder(user, id, file, (stage) => send({ stage }));
        send({ stage: "xong", order });
      } catch (error) {
        const message = isAppError(error) ? error.message : "Không bóc tách được tệp.";
        send({ stage: "loi", message });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
    },
  });
}
