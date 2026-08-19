import type { Context, Next } from "hono";
import type { MiddlewareHandler } from "hono/types";

/**
 * Per-IP token bucket for the routes that cost money.
 *
 * In-memory on purpose: this is a single-process MVP, and the goal is to stop one
 * client hammering the AI routes, not to be a distributed quota system. Behind
 * multiple instances or a load balancer this becomes per-instance — swap in a
 * shared store at that point.
 */

interface Bucket {
  tokens: number;
  updatedAt: number;
}

export interface RateLimitOptions {
  /** Sustained rate, in requests per minute. */
  perMinute: number;
  /** How many requests can be made back to back before the rate applies. */
  burst: number;
}

const SWEEP_INTERVAL_MS = 10 * 60 * 1000;

export function rateLimit({ perMinute, burst }: RateLimitOptions): MiddlewareHandler {
  const buckets = new Map<string, Bucket>();
  const refillPerMs = perMinute / 60_000;

  // Without this, the map grows once per unique client forever.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now - bucket.updatedAt > SWEEP_INTERVAL_MS) buckets.delete(key);
    }
  }, SWEEP_INTERVAL_MS);
  sweep.unref?.();

  return async (c: Context, next: Next) => {
    const key = clientKey(c);
    const now = Date.now();
    const bucket = buckets.get(key) ?? { tokens: burst, updatedAt: now };

    bucket.tokens = Math.min(burst, bucket.tokens + (now - bucket.updatedAt) * refillPerMs);
    bucket.updatedAt = now;

    if (bucket.tokens < 1) {
      buckets.set(key, bucket);
      const waitSeconds = Math.ceil((1 - bucket.tokens) / refillPerMs / 1000);
      c.header("Retry-After", String(Math.max(1, waitSeconds)));
      return c.json(
        { error: "You're going a bit fast. Wait a few seconds and try again." },
        429,
      );
    }

    bucket.tokens -= 1;
    buckets.set(key, bucket);
    await next();
    return undefined;
  };
}

/**
 * Identifies the caller. Falls back to a single shared bucket when no address is
 * available, which is the safe direction: unknown callers share a limit rather than
 * each getting their own.
 */
function clientKey(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return c.req.header("x-real-ip") ?? "unknown";
}
