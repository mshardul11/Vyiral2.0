import { describe, expect, it } from "vitest";
import type { ChangeNote } from "@resume/shared";
import { applyChanges, readPath, writePath } from "./applyChanges";
import { fixtureResume } from "./fixture";

const original = fixtureResume;

function tailoredWith(mutate: (draft: typeof original) => void) {
  const clone = structuredClone(original);
  mutate(clone);
  return clone;
}

function note(path: string, extra: Partial<ChangeNote> = {}): ChangeNote {
  return {
    section: "Test",
    path,
    before: "before",
    after: "after",
    rationale: "because",
    ...extra,
  };
}

describe("readPath / writePath", () => {
  it("reads nested object and array values", () => {
    expect(readPath(original, "summary")).toBe(original.summary);
    expect(readPath(original, "basics.name")).toBe("Priya Raghunathan");
    expect(readPath(original, "experience.0.highlights.1")).toBe(
      original.experience[0]!.highlights[1],
    );
  });

  it("returns undefined for paths that do not resolve", () => {
    expect(readPath(original, "nope")).toBeUndefined();
    expect(readPath(original, "experience.99.role")).toBeUndefined();
    expect(readPath(original, "basics.name.deeper")).toBeUndefined();
    expect(readPath(original, "experience.notanumber")).toBeUndefined();
  });

  it("refuses to create keys or grow arrays", () => {
    const draft = structuredClone(original);
    expect(writePath(draft, "brandNew", "x")).toBe(false);
    expect(writePath(draft, "experience.99", "x")).toBe(false);
    expect(writePath(draft, "experience.0.highlights.99", "x")).toBe(false);
    expect(draft).toEqual(original);
  });
});

describe("applyChanges", () => {
  it("returns the original when nothing is accepted", () => {
    const tailored = tailoredWith((draft) => (draft.summary = "changed"));
    const result = applyChanges(original, tailored, [note("summary")], new Set());
    expect(result.resume).toBe(original);
    expect(result.skipped).toEqual([]);
  });

  it("returns the tailored resume when everything is accepted", () => {
    const tailored = tailoredWith((draft) => (draft.summary = "changed"));
    const changes = [note("summary"), note("basics.headline")];
    const result = applyChanges(original, tailored, changes, new Set([0, 1]));
    expect(result.resume).toBe(tailored);
  });

  it("applies only the accepted change", () => {
    const tailored = tailoredWith((draft) => {
      draft.summary = "new summary";
      draft.basics.headline = "new headline";
    });
    const changes = [note("summary"), note("basics.headline")];

    const result = applyChanges(original, tailored, changes, new Set([0]));
    expect(result.resume.summary).toBe("new summary");
    expect(result.resume.basics.headline).toBe(original.basics.headline);
    expect(result.skipped).toEqual([]);
  });

  it("applies a reordering expressed as an array path", () => {
    const tailored = tailoredWith((draft) => {
      draft.experience[0]!.highlights.reverse();
      draft.summary = "also changed";
    });
    const changes = [note("experience.0.highlights"), note("summary")];

    const result = applyChanges(original, tailored, changes, new Set([0]));
    expect(result.resume.experience[0]!.highlights).toEqual(
      [...original.experience[0]!.highlights].reverse(),
    );
    expect(result.resume.summary).toBe(original.summary);
  });

  it("applies an added array item via its parent path", () => {
    const tailored = tailoredWith((draft) => {
      draft.experience[0]!.highlights.push("A brand new bullet.");
      draft.summary = "also changed";
    });
    const changes = [note("experience.0.highlights"), note("summary")];

    const result = applyChanges(original, tailored, changes, new Set([0]));
    expect(result.resume.experience[0]!.highlights).toContain("A brand new bullet.");
    expect(result.resume.summary).toBe(original.summary);
  });

  it("ignores a bad path entirely when everything is accepted", () => {
    // Accept-all takes the tailored resume wholesale, so a path the model got wrong
    // cannot drop an edit. This is the property that makes the common case safe.
    const tailored = tailoredWith((draft) => (draft.summary = "new summary"));
    const changes = [note("summary"), note("experience.42.role")];

    const result = applyChanges(original, tailored, changes, new Set([0, 1]));
    expect(result.resume).toBe(tailored);
    expect(result.skipped).toEqual([]);
  });

  it("reports a bad path on a partial accept instead of throwing", () => {
    const tailored = tailoredWith((draft) => {
      draft.summary = "new summary";
      draft.basics.headline = "new headline";
    });
    const changes = [note("summary"), note("experience.42.role"), note("basics.headline")];

    const result = applyChanges(original, tailored, changes, new Set([0, 1]));
    expect(result.resume.summary).toBe("new summary");
    expect(result.resume.basics.headline).toBe(original.basics.headline);
    expect(result.skipped).toEqual(["experience.42.role"]);
  });

  it("does not mutate the inputs", () => {
    const snapshot = structuredClone(original);
    const tailored = tailoredWith((draft) => (draft.summary = "new"));
    applyChanges(original, tailored, [note("summary"), note("basics.name")], new Set([0]));
    expect(original).toEqual(snapshot);
  });
});
