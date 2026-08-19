import type { ChangeNote, Resume } from "@resume/shared";

/**
 * Applies a chosen subset of a tailoring result.
 *
 * Each change note carries a `path` into the resume object, so applying a subset is
 * a copy of the tailored value at each accepted path onto a clone of the original.
 * That is exact, and it handles reordering, additions and removals — none of which
 * could be expressed by matching the display `before` text.
 *
 * Accepting everything short-circuits to the tailored resume, so a malformed path
 * from the model can never silently drop an edit from an accept-all.
 */
export interface ApplyResult {
  resume: Resume;
  /** Paths that did not resolve. Surfaced rather than swallowed. */
  skipped: string[];
}

export function applyChanges(
  original: Resume,
  tailored: Resume,
  changes: ChangeNote[],
  accepted: ReadonlySet<number>,
): ApplyResult {
  if (accepted.size === 0) return { resume: original, skipped: [] };
  if (accepted.size === changes.length) return { resume: tailored, skipped: [] };

  const result = structuredClone(original);
  const skipped: string[] = [];

  for (const [index, change] of changes.entries()) {
    if (!accepted.has(index)) continue;
    const value = readPath(tailored, change.path);
    if (value === undefined || !writePath(result, change.path, value)) {
      skipped.push(change.path);
    }
  }

  return { resume: result, skipped };
}

function segments(path: string): string[] {
  return path.split(".").filter((segment) => segment.length > 0);
}

/** Reads a dotted path. Returns undefined if any segment is missing. */
export function readPath(source: unknown, path: string): unknown {
  let current: unknown = source;
  for (const segment of segments(path)) {
    if (current === null || typeof current !== "object") return undefined;
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) return undefined;
      current = current[index];
    } else {
      if (!(segment in current)) return undefined;
      current = (current as Record<string, unknown>)[segment];
    }
  }
  return current;
}

/**
 * Writes a dotted path, returning false rather than throwing if it does not
 * resolve. Deliberately refuses to create missing keys or grow arrays: a path the
 * original resume does not have means the model produced something we can't place,
 * and inventing structure to hold it would corrupt the document.
 */
export function writePath(target: unknown, path: string, value: unknown): boolean {
  const parts = segments(path);
  const lastPart = parts.pop();
  if (lastPart === undefined) return false;

  let current: unknown = target;
  for (const segment of parts) {
    if (current === null || typeof current !== "object") return false;
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) return false;
      current = current[index];
    } else {
      if (!(segment in current)) return false;
      current = (current as Record<string, unknown>)[segment];
    }
  }

  if (current === null || typeof current !== "object") return false;

  if (Array.isArray(current)) {
    const index = Number(lastPart);
    if (!Number.isInteger(index) || index < 0 || index >= current.length) return false;
    current[index] = value;
    return true;
  }

  if (!(lastPart in current)) return false;
  (current as Record<string, unknown>)[lastPart] = value;
  return true;
}
