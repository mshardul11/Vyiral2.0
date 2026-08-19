import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";

let client: Anthropic | null = null;

/**
 * The Anthropic client, created on first use.
 *
 * Lazy so the process can boot and serve the editor, exports, and share links
 * without a key configured — only the AI routes need one, and they surface a clear
 * 503 when it is missing rather than crashing the server at import time.
 */
export function anthropic(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: config.anthropicApiKey });
  }
  return client;
}

/** Thrown when a route needs the model but no key is configured. */
export class MissingApiKeyError extends Error {
  constructor() {
    super("The AI features need an ANTHROPIC_API_KEY on the server.");
    this.name = "MissingApiKeyError";
  }
}

export function requireApiKey(): void {
  if (!config.hasAnthropicApiKey) throw new MissingApiKeyError();
}
