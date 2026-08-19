import Anthropic from "@anthropic-ai/sdk";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { MissingApiKeyError } from "../claude/client.js";
import { ModelRefusalError, TruncatedResponseError } from "../claude/operations.js";

/**
 * Turns an exception into a response the UI can show the user directly.
 *
 * Messages are written for the person using the resume builder, not for a log —
 * they say what happened and what to do about it. The underlying error still goes
 * to the server log with its request id.
 */
export function respondWithError(c: Context, error: unknown): Response {
  const [status, message] = classify(error);

  // Anthropic errors carry a request id that support can trace; keep it in the log.
  const requestId = error instanceof Anthropic.APIError ? error.requestID : undefined;
  console.error("Request failed:", { status, requestId, error });

  return c.json({ error: message }, status);
}

function classify(error: unknown): [ContentfulStatusCode, string] {
  if (error instanceof MissingApiKeyError) {
    return [503, "AI features are not configured on this server yet."];
  }

  if (error instanceof ModelRefusalError) {
    return [
      422,
      "The model declined to work on this content. If this looks wrong, edit the text and try again.",
    ];
  }

  if (error instanceof TruncatedResponseError) {
    return [502, "The response was cut off. Try again, or shorten the input."];
  }

  if (error instanceof Anthropic.RateLimitError) {
    return [429, "The AI service is rate limited right now. Wait a moment and try again."];
  }

  if (error instanceof Anthropic.AuthenticationError) {
    return [503, "The server's AI credentials were rejected. Check the API key."];
  }

  if (error instanceof Anthropic.APIConnectionError) {
    return [504, "Could not reach the AI service. Check your connection and try again."];
  }

  if (error instanceof Anthropic.APIError) {
    // 5xx upstream is worth retrying; 4xx means the request itself was wrong.
    const upstream = error.status ?? 500;
    return upstream >= 500
      ? [502, "The AI service had a problem. Try again in a moment."]
      : [400, "The AI service rejected that request."];
  }

  return [500, "Something went wrong. Try again."];
}
