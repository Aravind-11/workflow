import { prisma } from "@/server/db/prisma";
import { createHmac } from "crypto";

function signPayload(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

async function deliverWebhook(
  endpoint: { id: string; url: string; secret: string },
  event: string,
  payload: Record<string, unknown>,
  attempt = 1,
): Promise<boolean> {
  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
  const signature = signPayload(endpoint.secret, body);

  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": event,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (res.ok) return true;

    console.error(
      `[Webhook] ${endpoint.url} returned ${res.status} for event "${event}" (attempt ${attempt})`,
    );
  } catch (err) {
    console.error(
      `[Webhook] Failed to deliver to ${endpoint.url} (attempt ${attempt}):`,
      err,
    );
  }

  if (attempt < 3) {
    const delayMs = Math.pow(2, attempt) * 1000;
    await new Promise((r) => setTimeout(r, delayMs));
    return deliverWebhook(endpoint, event, payload, attempt + 1);
  }

  return false;
}

export async function dispatchWebhook(
  warehouseId: string,
  event: string,
  payload: Record<string, unknown>,
) {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      warehouseId,
      isActive: true,
      events: { has: event },
    },
  });

  const results = await Promise.allSettled(
    endpoints.map((ep) => deliverWebhook(ep, event, payload)),
  );

  const successes = results.filter(
    (r) => r.status === "fulfilled" && r.value,
  ).length;

  if (endpoints.length > 0) {
    console.log(
      `[Webhook] Dispatched "${event}" to ${endpoints.length} endpoints, ${successes} succeeded`,
    );
  }
}
