import { authenticateApiKey, isAuthError } from "@/lib/api/auth";
import { addClient, removeClient } from "@/lib/events/sse-manager";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ warehouseId: string }> },
) {
  const auth = await authenticateApiKey(request);
  if (isAuthError(auth)) return auth;

  const { warehouseId } = await params;

  const stream = new ReadableStream({
    start(controller) {
      addClient(warehouseId, controller);

      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ warehouseId })}\n\n`),
      );

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepAlive);
        }
      }, 30_000);

      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        removeClient(controller);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
