import {
  streamText,
  convertToModelMessages,
  createUIMessageStreamResponse,
  createUIMessageStream,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { getAuthContext } from "@/lib/auth/session";
import { buildSystemPrompt } from "@/lib/assistant/system-prompt";
import { createTools } from "@/lib/assistant/tools";
import { retrieveContext } from "@/lib/assistant/context-retriever";
import { tryCreateWorkflow } from "@/lib/assistant/workflow-builder";
import { prisma } from "@/server/db/prisma";

export const maxDuration = 120;

const useOpenAI = Boolean(process.env.OPENAI_API_KEY);
// Only treat Ollama as configured if someone explicitly set OLLAMA_BASE_URL.
// In production we don't ship an Ollama sidecar, so without this guard the
// route would hang trying to reach http://localhost:11434/v1 and the user
// would see an empty / spinning chat panel instead of a clean "offline" UI.
const useOllama = Boolean(process.env.OLLAMA_BASE_URL);

const llmProvider = useOpenAI
  ? createOpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  : useOllama
    ? createOpenAI({
        baseURL: process.env.OLLAMA_BASE_URL!,
        apiKey: "ollama",
      })
    : null;

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages } = await req.json();

    const warehouseId = ctx.warehouseIds[0];
    let warehouseCode: string | undefined;
    let warehouseName: string | undefined;

    if (warehouseId) {
      const wh = await prisma.warehouse.findUnique({
        where: { id: warehouseId },
        select: { code: true, name: true },
      });
      warehouseCode = wh?.code;
      warehouseName = wh?.name;
    }

    const lastUserText = messages
      .filter((m: { role: string }) => m.role === "user")
      .pop()
      ?.parts?.filter((p: { type: string }) => p.type === "text")
      .map((p: { text: string }) => p.text)
      .join("") ?? "";

    // --- Workflow creation: bypass LLM, return direct response ---
    const workflowResult = await tryCreateWorkflow(lastUserText, warehouseId);

    if (workflowResult) {
      const stageList = workflowResult.stages.map((s) => s.label).join(" → ");
      const responseText =
        `✅ Workflow "${workflowResult.name}" created with ${workflowResult.stageCount} stages:\n\n` +
        `${stageList}\n\n` +
        `Open in the Workflow Designer to view and edit the stages, ports, and connections:\n` +
        `${workflowResult.designerUrl}`;

      const partId = Math.random().toString(36).slice(2, 10);
      const stream = createUIMessageStream({
        execute: ({ writer }) => {
          writer.write({ type: "text-start", id: partId });
          writer.write({ type: "text-delta", delta: responseText, id: partId });
          writer.write({ type: "text-end", id: partId });
          writer.write({ type: "finish" });
        },
      });

      return createUIMessageStreamResponse({ stream });
    }

    // No AI backend configured — return a clean error so the client shows the
    // "AI assistant offline" panel instead of hanging on a 120s timeout.
    if (!llmProvider) {
      return Response.json(
        {
          error:
            "AI assistant is not configured for this environment. Set OPENAI_API_KEY (or OLLAMA_BASE_URL) on the wms task definition to enable free-form queries.",
        },
        { status: 503 },
      );
    }

    // --- Normal query: fetch DB context, run through LLM ---
    const modelMessages = await convertToModelMessages(messages);
    const modelId = useOpenAI
      ? (process.env.OPENAI_MODEL ?? "gpt-4o-mini")
      : (process.env.OLLAMA_MODEL ?? "tinyllama");
    const useTools = useOpenAI || process.env.OLLAMA_TOOLS === "true";

    const dbContext = await retrieveContext(lastUserText, warehouseId);

    const systemPrompt = buildSystemPrompt({
      warehouseCode,
      warehouseName,
      userName: ctx.fullName,
    }) + dbContext;

    const result = streamText({
      model: llmProvider(modelId),
      system: systemPrompt,
      messages: modelMessages,
      ...(useTools ? { tools: createTools(warehouseId) } : {}),
    });

    return createUIMessageStreamResponse({ stream: result.toUIMessageStream() });
  } catch (err) {
    console.error("[chat] error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
