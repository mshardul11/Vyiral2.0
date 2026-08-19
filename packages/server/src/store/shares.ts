import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { ResumeSchema, type Resume } from "@resume/shared";
import { config } from "../config.js";

/**
 * Published resumes, one JSON file per share.
 *
 * A file per slug rather than one shared file or a database: there is no
 * concurrent-write hazard, no native dependency, and nothing to provision. The
 * whole surface is two functions, so swapping this for a real table when accounts
 * arrive touches nothing above it.
 *
 * Editing never comes through here. Only an explicit "Share" writes anything to
 * the server.
 */

const SHARES_DIR = () => path.join(config.dataDir, "shares");

/** Long enough that guessing a slug is not a realistic way to find someone's resume. */
const SLUG_LENGTH = 12;

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

interface StoredShare {
  resume: Resume;
  createdAt: string;
}

/** Slugs come from URLs, so never let one escape the shares directory. */
function isValidSlug(slug: string): boolean {
  return /^[A-Za-z0-9_-]{6,32}$/.test(slug);
}

function fileFor(slug: string): string {
  return path.join(SHARES_DIR(), `${slug}.json`);
}

export async function publishShare(resume: Resume): Promise<string> {
  await mkdir(SHARES_DIR(), { recursive: true });
  const slug = nanoid(SLUG_LENGTH);
  const record: StoredShare = { resume, createdAt: new Date().toISOString() };
  // `wx` fails rather than overwriting, on the vanishingly unlikely slug collision.
  await writeFile(fileFor(slug), JSON.stringify(record), { encoding: "utf8", flag: "wx" });
  return slug;
}

export async function readShare(slug: string): Promise<StoredShare | null> {
  if (!isValidSlug(slug)) return null;

  let record: StoredShare;
  try {
    record = JSON.parse(await readFile(fileFor(slug), "utf8")) as StoredShare;
  } catch {
    return null;
  }

  // A stored file could predate a schema change, so validate rather than trust it.
  const parsed = ResumeSchema.safeParse(record.resume);
  if (!parsed.success) return null;

  return { resume: parsed.data, createdAt: record.createdAt };
}

/**
 * Deletes shares older than the retention window. Run at startup — good enough for
 * a store this size, and it means a published resume does not sit on disk forever.
 */
export async function sweepExpiredShares(): Promise<number> {
  let names: string[];
  try {
    names = await readdir(SHARES_DIR());
  } catch {
    return 0;
  }

  const cutoff = Date.now() - NINETY_DAYS_MS;
  let removed = 0;

  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const file = path.join(SHARES_DIR(), name);
    try {
      const record = JSON.parse(await readFile(file, "utf8")) as StoredShare;
      if (new Date(record.createdAt).getTime() < cutoff) {
        await rm(file);
        removed += 1;
      }
    } catch {
      // Unreadable or malformed: drop it rather than leaving it to fail forever.
      await rm(file, { force: true });
      removed += 1;
    }
  }

  return removed;
}

export const RETENTION_DAYS = NINETY_DAYS_MS / (24 * 60 * 60 * 1000);
