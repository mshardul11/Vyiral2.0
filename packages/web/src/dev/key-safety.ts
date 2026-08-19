// Fails if anything that looks like an API key made it into the built bundle.
//
// The guard that matters is architectural — every model call goes through the
// server — but Vite inlines any VITE_-prefixed variable into the client bundle, so
// one mis-named env var would publish the key to anyone who opens devtools. This
// makes that mistake loud instead of silent.
//
// Usage: npm run build && npx tsx src/dev/key-safety.ts
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const DIST = process.argv[2] ?? "./dist";

const PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "Anthropic API key", pattern: /sk-ant-[A-Za-z0-9_-]{8,}/ },
  { name: "Anthropic OAuth token", pattern: /sk-ant-oat[A-Za-z0-9_-]{8,}/ },
  { name: "ANTHROPIC_API_KEY reference", pattern: /ANTHROPIC_API_KEY/ },
];

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : Promise.resolve([full]);
    }),
  );
  return files.flat();
}

let failures = 0;
let scanned = 0;

for (const file of await walk(DIST)) {
  if (!/\.(js|css|html|map|json)$/.test(file)) continue;
  scanned += 1;
  const contents = await readFile(file, "utf8");
  for (const { name, pattern } of PATTERNS) {
    if (pattern.test(contents)) {
      console.error(`FAIL ${file}: contains ${name}`);
      failures += 1;
    }
  }
}

console.log(`Scanned ${scanned} built file(s) in ${DIST}.`);
if (failures > 0) {
  console.error(`\n${failures} secret-shaped string(s) found in the client bundle.`);
  process.exit(1);
}
console.log("No secrets found in the client bundle.");
