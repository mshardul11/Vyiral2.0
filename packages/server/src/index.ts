import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { config } from "./config.js";
import { resumeRoutes } from "./routes/resume.js";
import { shareRoutes } from "./routes/share.js";
import { sweepExpiredShares } from "./store/shares.js";
import { rateLimit } from "./routes/rateLimit.js";

const app = new Hono();

app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: config.webOrigins,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

app.get("/health", (c) =>
  c.json({
    ok: true,
    anthropicConfigured: config.hasAnthropicApiKey,
  }),
);

// The AI routes spend money on every call, so they are limited more tightly than
// publishing a share, which only writes a small file.
app.use("/api/resume/*", rateLimit({ perMinute: 20, burst: 8 }));
app.use("/api/share", rateLimit({ perMinute: 30, burst: 10 }));

app.route("/api/resume", resumeRoutes);
app.route("/api/share", shareRoutes);

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "Something went wrong on our end. Try again." }, 500);
});

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`API listening on http://localhost:${info.port}`);

  // Published resumes should not sit on disk forever. Sweeping at startup is
  // enough for a store this size and needs no scheduler.
  void sweepExpiredShares()
    .then((removed) => {
      if (removed > 0) console.log(`Removed ${removed} expired share(s).`);
    })
    .catch((error: unknown) => console.error("Share sweep failed:", error));

  if (!config.hasAnthropicApiKey) {
    console.warn(
      "ANTHROPIC_API_KEY is not set — the AI routes will return 503 until it is configured.",
    );
  }
});

export type AppType = typeof app;
