"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Search,
  Loader2,
  RotateCcw,
  ArrowUpRight,
  Package,
  Truck,
  BarChart3,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type MessagePart = {
  type: string;
  text?: string;
  toolInvocationId?: string;
  toolName?: string;
  state?: string;
};

function extractText(parts: MessagePart[] | undefined): string {
  if (!parts) return "";
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text!)
    .join("");
}

export function SearchBar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");
  const resultsRef = useRef<HTMLDivElement>(null);

  // AI SDK v6 / @ai-sdk/react v3 require an explicit transport — without it,
  // sendMessage silently no-ops and `/api/chat` is never hit. Memoize so the
  // hook doesn't reset on every render.
  const chatTransport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );

  const { messages, sendMessage, status, setMessages, error } = useChat({
    transport: chatTransport,
    onError: (err) => {
      console.error("[chat-panel] useChat error:", err);
    },
  });

  const isLoading = status === "streaming" || status === "submitted";
  const hasResults = messages.length > 0;
  const hasError = !!error;

  const doSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || isLoading) return;
    setMessages([]);
    sendMessage({ role: "user", parts: [{ type: "text" as const, text }] });
  }, [inputValue, isLoading, sendMessage, setMessages]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      doSend();
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (resultsRef.current) {
      resultsRef.current.scrollTop = resultsRef.current.scrollHeight;
    }
  }, [messages]);

  const assistantMessages = messages.filter((m) => m.role === "assistant");
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const userQuery = lastUserMessage ? extractText(lastUserMessage.parts as MessagePart[]) : "";

  return (
    <div className="w-full">
      {/* ─── Search input ──────────────────────────────────────────────── */}
      <div className="group/search">
        {/* Tight wrapper around just the bar so the halo's `-inset` is
            measured against the bar's box, not the bar + suggestions.
            `mx-1` pulls the bar in slightly from the page edge so the
            conic gradient halo has room to render without getting clipped
            by the parent container's padding. */}
        <div className="relative mx-1">
          {/* Conic gradient halo — sits just behind the bar (~3px larger
              on each side so all four corners get full coverage). The bar
              is opaque, so this only shows as a thin colored rim around
              the perimeter. Light blur softens the rim without letting it
              bloom out into big blobs.

              All five hues we've used (amber, orange, coral, blue, violet)
              are stitched into one continuous conic gradient with closely
              spaced stops, so transitions look smooth rather than banded. */}
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute -inset-[3px] rounded-[19px] opacity-0 blur-[1px] transition-opacity duration-300",
              "group-focus-within/search:opacity-70",
              "bg-[conic-gradient(from_0deg_at_50%_50%,#3b82f6_0deg,#fbbf24_180deg,#3b82f6_360deg)]",
            )}
          />
          <div
            className={cn(
              "relative flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-2.5 transition-[border-color,box-shadow] duration-200",
            "bg-white/95 backdrop-blur-xl",
            // Real 1px border (not box-shadow). Borders follow the
            // element's border-radius perfectly — no corner gaps.
            "border border-slate-900/10 dark:border-white/[0.08]",
            // On focus, hide the solid border entirely so the conic
            // gradient halo behind the bar is the single, uniform visible
            // edge. (A flat amber line here was fighting with the cool
            // segments of the gradient and making the ring look patchy.)
            "group-focus-within/search:border-transparent",
            // Idle outer drop-shadow only — focus colors come from the
            // conic gradient halos above, so the box-shadow stays neutral
            // (just a slightly deeper ambient drop) to avoid competing.
            "shadow-[0_1px_2px_rgb(15_23_42_/_0.04),0_12px_40px_-12px_rgb(15_23_42_/_0.12)]",
            "group-focus-within/search:shadow-[0_1px_2px_rgb(15_23_42_/_0.04),0_16px_48px_-12px_rgb(15_23_42_/_0.22)]",
            "dark:bg-[rgb(12_16_24_/_0.9)]",
            "dark:shadow-[0_10px_40px_-10px_rgb(0_0_0_/_0.6)]",
            "dark:group-focus-within/search:shadow-[0_14px_50px_-10px_rgb(0_0_0_/_0.8)]",
          )}
        >
          {/* Search icon — swaps to spinner while loading */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center text-slate-700 dark:text-slate-200">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-amber-500 dark:text-amber-400" />
            ) : (
              <Search className="h-4 w-4 drop-shadow-[0_0_8px_rgb(251_191_36_/_0.25)]" strokeWidth={2.25} />
            )}
          </div>

          {/* Input. Explicit `box-shadow: none` on focus overrides the
              global `*:focus-visible` amber ring in globals.css — the whole
              search bar is the focus target, not the bare input. */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask anything — track a box, check inventory, design a workflow…"
            style={{ boxShadow: "none" }}
            className={cn(
              "min-w-0 flex-1 bg-transparent text-[15px] text-slate-900 outline-none focus:outline-none focus-visible:outline-none",
              "placeholder:text-slate-600 dark:text-gray-50 dark:placeholder:text-slate-300",
            )}
          />

          </div>
        </div>

        {/* Quick suggestions when empty */}
        {!hasResults && !isLoading && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
              Try
            </span>
            {/*
              The AI assistant is decoupled from these chips. Each chip is a
              direct deep-link to the matching page so users get something
              useful with one click even when the LLM backend isn't reachable.
              Free-form questions still go through /api/chat.
            */}
            {[
              { label: "Track a barcode", Icon: Package, href: "/tracking" },
              { label: "Show shipped orders", Icon: Truck, href: "/shipping" },
              { label: "Check inventory for SKU", Icon: BarChart3, href: "/inventory" },
              { label: "Create a workflow", Icon: Zap, href: "/workflow" },
            ].map(({ label, Icon, href }) => (
              <Link
                key={label}
                href={href}
                className={cn(
                  // Real `border` (instead of `shadow-[inset_0_0_0_1px]`)
                  // is required so we can swap it for a gradient on hover
                  // via the `background-clip: padding-box, border-box`
                  // trick below — which is the only clean way to get a
                  // true gradient border on a rounded element.
                  "group/chip inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] transition-all duration-150",
                  // Light mode
                  "border-slate-900/[0.08] bg-white text-slate-600 hover:-translate-y-px hover:text-slate-900",
                  "hover:border-transparent hover:[background:linear-gradient(white,white)_padding-box,linear-gradient(135deg,#3b82f6,#fbbf24)_border-box] hover:shadow-[0_4px_14px_-4px_rgb(59_130_246_/_0.25),0_4px_14px_-4px_rgb(251_191_36_/_0.2)]",
                  // Dark mode
                  "dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-slate-400 dark:hover:text-gray-100",
                  "dark:hover:border-transparent dark:hover:[background:linear-gradient(rgb(11_15_22),rgb(11_15_22))_padding-box,linear-gradient(135deg,#3b82f6,#fbbf24)_border-box] dark:hover:shadow-[0_6px_18px_-4px_rgb(59_130_246_/_0.3),0_6px_18px_-4px_rgb(251_191_36_/_0.25)]",
                )}
              >
                <Icon className="h-3 w-3 opacity-60 transition-opacity group-hover/chip:opacity-100" />
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Results area */}
      {hasResults && (
        <div className="mt-5">
          {/* Query echo */}
          {userQuery && (
            <div className="mb-3 flex items-center justify-between gap-2 px-1">
              <p className="truncate font-mono text-[10.5px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                <span className="text-slate-400 dark:text-slate-600">Query ·</span> {userQuery}
              </p>
              <button
                onClick={() => {
                  setMessages([]);
                  setInputValue("");
                  inputRef.current?.focus();
                }}
                className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-gray-100"
              >
                <RotateCcw className="h-3 w-3" />
                Clear
              </button>
            </div>
          )}

          {/* Response cards */}
          <div ref={resultsRef} className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {assistantMessages.map((m) => {
              const text = extractText(m.parts as MessagePart[]);
              const toolParts = (m.parts as MessagePart[] | undefined)?.filter(
                (p) => p.type === "tool-invocation",
              );
              const hasTools = toolParts && toolParts.length > 0;

              return (
                <div key={m.id} className="surface-elevated p-5">
                  {hasTools && (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {toolParts.map((t) => (
                        <span
                          key={t.toolInvocationId ?? t.toolName}
                          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100/80 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-slate-600 ring-1 ring-inset ring-slate-200/60 dark:bg-white/[0.04] dark:text-slate-400 dark:ring-white/10"
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              t.state === "result" ? "bg-emerald-500" : "animate-pulse bg-amber-500",
                            )}
                          />
                          {(t.toolName ?? "tool").replace(/([A-Z])/g, " $1").trim()}
                        </span>
                      ))}
                    </div>
                  )}
                  {text && (
                    <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-slate-800 dark:text-gray-200">
                      {text}
                    </div>
                  )}
                  {text && /\/warehouses\/[^/]+\/workflow/i.test(text) && (() => {
                    const linkMatch = text.match(/\/warehouses\/[^\s)"\]]+\/workflow[^\s)"\]]*/);
                    return linkMatch ? (
                      <Link
                        href={linkMatch[0]}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-b from-slate-900 to-slate-950 px-3.5 py-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-white shadow-[0_0_0_1px_rgb(15_23_42_/_0.9),0_1px_2px_rgb(15_23_42_/_0.3),inset_0_1px_0_rgb(255_255_255_/_0.08)] transition-all hover:brightness-125 dark:bg-gradient-to-br dark:from-amber-300 dark:to-amber-500 dark:text-slate-950"
                      >
                        <ArrowUpRight className="h-3 w-3" />
                        Open in workflow designer
                      </Link>
                    ) : null;
                  })()}
                </div>
              );
            })}

            {isLoading && assistantMessages.length === 0 && (
              <div className="surface flex items-center gap-3 p-5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500 dark:text-amber-400" />
                <span className="font-mono text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Thinking…
                </span>
              </div>
            )}

            {hasError && (
              <div className="surface relative overflow-hidden p-4">
                <span
                  aria-hidden
                  className="absolute left-0 top-0 h-full w-[3px] bg-amber-500"
                />
                <p className="pl-2 font-mono text-[10px] font-medium uppercase tracking-widest text-amber-700 dark:text-amber-400">
                  AI assistant offline
                </p>
                <p className="mt-1 pl-2 text-xs text-slate-700 dark:text-slate-300">
                  Free-form questions are paused while the AI backend is being configured. Use the suggestion chips above for direct navigation, or browse the modules from the sidebar.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
