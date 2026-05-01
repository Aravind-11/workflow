import { prisma } from "@/server/db/prisma";
import { createHash } from "crypto";
import { NextResponse } from "next/server";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export interface ApiAuthContext {
  apiKeyId: string;
  warehouseId: string | null;
  permissions: string[];
}

export async function authenticateApiKey(
  request: Request,
): Promise<ApiAuthContext | NextResponse> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 },
    );
  }

  const token = auth.slice(7);
  const keyHash = hashKey(token);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
  });

  if (!apiKey) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return NextResponse.json({ error: "API key expired" }, { status: 401 });
  }

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    apiKeyId: apiKey.id,
    warehouseId: apiKey.warehouseId,
    permissions: apiKey.permissions,
  };
}

export function isAuthError(
  result: ApiAuthContext | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}

export function generateApiKey(): { key: string; keyHash: string; keyPrefix: string } {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const key = `nventr_${Buffer.from(bytes).toString("base64url")}`;
  const keyHash = hashKey(key);
  const keyPrefix = key.slice(0, 12);
  return { key, keyHash, keyPrefix };
}
