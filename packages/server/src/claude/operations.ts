import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { MessageCreateParams } from "@anthropic-ai/sdk/resources/messages";
import { RewriteResultSchema, type RewriteRequest, type RewriteResult } from "@resume/shared";
import { MODEL } from "../config.js";
import { anthropic } from "./client.js";
import { CRAFT, REWRITE } from "./prompts.js";

/**
 * Every model call in the app.
 *
 * All operations run on the same model; cost and latency are tuned with
 * `output_config.effort` rather than by switching models. Thinking is on by default
 * on this model, so the `thinking` parameter is deliberately absent.
 */

type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/**
 * System prompt as two blocks with the cache breakpoint after the shared half, so
 * every operation reads the same cached prefix instead of each caching its own copy.
 */
function system(operationPrompt: string): MessageCreateParams["system"] {
  return [
    { type: "text", text: CRAFT, cache_control: { type: "ephemeral" } },
    { type: "text", text: operationPrompt },
  ];
}

/** Wraps text in a tag so the model can tell inputs apart from instructions. */
function tag(name: string, content: string): string {
  return `<${name}>\n${content}\n</${name}>`;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  model: string;
}

export interface Completed<T> {
  data: T;
  usage: Usage;
}

function usageOf(response: {
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
  };
}): Usage {
  return {
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
    cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
  };
}

/** Raised when the model declined the request rather than answering it. */
export class ModelRefusalError extends Error {
  constructor(readonly category: string | null) {
    super("The model declined to work on this content.");
    this.name = "ModelRefusalError";
  }
}

/** Raised when the response was cut off before the structured output was complete. */
export class TruncatedResponseError extends Error {
  constructor() {
    super("The response was cut off before it was complete.");
    this.name = "TruncatedResponseError";
  }
}

/**
 * Checks the outcome of a structured-output call before its content is trusted.
 * `stop_reason` has to be read first: a refusal returns HTTP 200 with empty content,
 * so code that reaches straight for the parsed output breaks on it.
 */
function assertUsable(response: {
  stop_reason: string | null;
  stop_details?: { category?: string | null } | null;
}): void {
  if (response.stop_reason === "refusal") {
    throw new ModelRefusalError(response.stop_details?.category ?? null);
  }
  if (response.stop_reason === "max_tokens") {
    throw new TruncatedResponseError();
  }
}

// --- Section rewrite ----------------------------------------------------------

const REWRITE_GUIDANCE: Record<RewriteRequest["kind"], string> = {
  highlight: "This is an achievement bullet. Keep each variant to one line, under 20 words.",
  summary:
    "This is the resume summary. Keep each variant to two or three sentences, third person, no pronouns.",
  "project-description":
    "This is a project description. Keep each variant to one or two sentences.",
};

export async function rewriteSection(
  request: RewriteRequest,
): Promise<Completed<RewriteResult>> {
  const parts = [
    REWRITE_GUIDANCE[request.kind],
    tag("original", request.text),
    request.context.trim() ? tag("context", request.context) : "",
    request.instruction.trim()
      ? tag("requested_change", request.instruction)
      : "",
  ].filter(Boolean);

  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 2000,
    system: system(REWRITE),
    output_config: {
      format: zodOutputFormat(RewriteResultSchema),
      // Three rewrites of one line is not a reasoning problem, and this button is
      // pressed constantly — latency matters more than depth here.
      effort: "low" satisfies Effort,
    },
    messages: [{ role: "user", content: parts.join("\n\n") }],
  });

  assertUsable(response);

  const parsed = response.parsed_output;
  if (!parsed) throw new Error("The model returned no usable output.");

  return { data: parsed, usage: usageOf(response) };
}
