/**
 * Smoke-tests the AI routes against a running server.
 *
 * This exists because the model calls cannot be verified without credentials — one
 * command exercises each route and prints what came back, so a real check is cheap
 * once an ANTHROPIC_API_KEY is in place.
 *
 * Usage:
 *   npm run dev -w @resume/server        # in one terminal
 *   npm run check:ai -w @resume/server   # in another
 *
 * Override the target with API_URL=http://host:port
 */
const BASE = process.env["API_URL"] ?? "http://localhost:8787";

let failures = 0;

async function check(name: string, path: string, body: unknown): Promise<void> {
  process.stdout.write(`\n── ${name} ${"─".repeat(Math.max(0, 60 - name.length))}\n`);
  const started = Date.now();

  let response: Response;
  try {
    response = await fetch(`${BASE}/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    failures += 1;
    console.error(`  could not reach ${BASE} — is the server running?`, error);
    return;
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    failures += 1;
    console.error(`  HTTP ${response.status} after ${elapsed}s`);
    console.error(" ", payload);
    return;
  }

  console.log(`  HTTP ${response.status} in ${elapsed}s`);
  console.dir(payload, { depth: null });
}

const health = await fetch(`${BASE}/health`)
  .then((r) => r.json() as Promise<{ anthropicConfigured?: boolean }>)
  .catch(() => null);

if (!health) {
  console.error(`Server not reachable at ${BASE}. Start it with: npm run dev -w @resume/server`);
  process.exit(1);
}
if (!health.anthropicConfigured) {
  console.error(
    "ANTHROPIC_API_KEY is not set on the server — every AI route will return 503.\n" +
      "Add it to packages/server/.env and restart.",
  );
  process.exit(1);
}

await check("rewrite — bullet", "/resume/rewrite", {
  text: "Responsible for the payments API and making sure it was reliable.",
  kind: "highlight",
  context: "Role: Senior Backend Engineer\nCompany: Northwind Payments",
  instruction: "",
});

await check("rewrite — summary", "/resume/rewrite", {
  text: "I am a backend engineer with a lot of experience in payments and I like building reliable systems.",
  kind: "summary",
  context: "Headline: Senior Backend Engineer",
  instruction: "",
});

console.log(
  `\n${failures === 0 ? "All checks passed." : `${failures} check(s) failed.`}` +
    "\nServer logs show token usage per call — watch cache_read_input_tokens on the second run.",
);
process.exit(failures === 0 ? 0 : 1);

export {};
