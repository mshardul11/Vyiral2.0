import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const envFile = path.resolve(process.cwd(), ".env");
if (existsSync(envFile)) {
  // Node 20.12+ / 22+ builtin — no dotenv dependency needed.
  process.loadEnvFile(envFile);
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy packages/server/.env.example to .env and fill it in.`,
    );
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 8787),
  dataDir: path.resolve(process.cwd(), process.env.DATA_DIR ?? "./data"),
  webOrigins: (process.env.WEB_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  /**
   * Read lazily rather than at import time so the process can boot (and serve
   * /health, and serve share links) without a key configured. Only the AI routes
   * actually need it, and they fail with a clear message when it is absent.
   */
  get anthropicApiKey(): string {
    return required("ANTHROPIC_API_KEY");
  },
  hasAnthropicApiKey: Boolean(process.env.ANTHROPIC_API_KEY),
};

/** Single source of truth for the model. Every operation runs on this. */
export const MODEL = "claude-opus-5";
