import { useState } from "react";
import type { Resume, TailorResult } from "@resume/shared";
import { ApiCallError, tailorResume } from "../api/client";
import { applyChanges } from "../resume/applyChanges";
import { Modal } from "./Modal";
import { Button, TextArea } from "./ui";

/**
 * Tailor the resume against a job posting.
 *
 * The result is never applied on arrival. Every edit is listed with what it was,
 * what it became, and why — and each one can be turned off. Applying a subset is
 * exact rather than approximate: each change carries a path into the resume, so
 * accepting one is a copy of the tailored value at that path.
 */
export function TailorDialog({
  resume,
  onApply,
  onClose,
}: {
  resume: Resume;
  onApply: (resume: Resume) => void;
  onClose: () => void;
}) {
  const [jobDescription, setJobDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TailorResult | null>(null);
  const [accepted, setAccepted] = useState<Set<number>>(new Set());

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const tailored = await tailorResume(resume, jobDescription);
      setResult(tailored);
      // Everything is on by default — the user turns off what they disagree with,
      // which is the common shape of this review.
      setAccepted(new Set(tailored.changes.map((_, index) => index)));
    } catch (caught) {
      setError(
        caught instanceof ApiCallError ? caught.message : "The resume could not be tailored.",
      );
    } finally {
      setBusy(false);
    }
  }

  function toggle(index: number) {
    setAccepted((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function apply() {
    if (!result) return;
    const { resume: next, skipped } = applyChanges(
      resume,
      result.resume,
      result.changes,
      accepted,
    );
    if (skipped.length > 0) {
      // Surfaced rather than swallowed: the user should know an edit they kept
      // could not be placed.
      setError(
        `${skipped.length} change${skipped.length === 1 ? "" : "s"} could not be applied and ` +
          "will be left out. The rest are ready.",
      );
      onApply(next);
      return;
    }
    onApply(next);
  }

  if (!result) {
    return (
      <Modal
        wide
        title="Tailor to a job posting"
        onClose={onClose}
        footer={
          <>
            <span className="modal__note">
              Your resume and the posting are sent to the server. Nothing is stored.
            </span>
            <Button onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void run()}
              disabled={busy || jobDescription.trim().length < 40}
            >
              {busy ? "Reading the posting…" : "Tailor"}
            </Button>
          </>
        }
      >
        <TextArea
          rows={14}
          value={jobDescription}
          onChange={setJobDescription}
          placeholder="Paste the full job posting here — responsibilities, requirements, the lot."
        />
        <p className="modal__prose">
          Wording and emphasis change; your history does not. Where the posting asks for
          something your resume does not show, the gap is left rather than filled in.
        </p>
        {error ? (
          <p className="modal__error" role="alert">
            {error}
          </p>
        ) : null}
      </Modal>
    );
  }

  return (
    <Modal
      wide
      title={`Review ${result.changes.length} change${result.changes.length === 1 ? "" : "s"}`}
      onClose={onClose}
      footer={
        <>
          <span className="modal__note">
            {accepted.size} of {result.changes.length} selected
          </span>
          <Button onClick={() => setAccepted(new Set())}>Select none</Button>
          <Button
            onClick={() => setAccepted(new Set(result.changes.map((_, index) => index)))}
          >
            Select all
          </Button>
          <Button variant="primary" onClick={apply} disabled={accepted.size === 0}>
            Apply {accepted.size === result.changes.length ? "all" : accepted.size}
          </Button>
        </>
      }
    >
      {result.changes.length === 0 ? (
        <p className="modal__prose">
          Nothing worth changing — your resume already lines up with this posting.
        </p>
      ) : null}

      <ul className="changes">
        {result.changes.map((change, index) => (
          <li key={index} className={accepted.has(index) ? "change" : "change change--off"}>
            <label className="change__head">
              <input
                type="checkbox"
                checked={accepted.has(index)}
                onChange={() => toggle(index)}
              />
              <span className="change__section">{change.section}</span>
            </label>
            <div className="change__body">
              {change.before ? (
                <p className="change__before">{change.before}</p>
              ) : (
                <p className="change__before change__before--empty">Added</p>
              )}
              {change.after ? (
                <p className="change__after">{change.after}</p>
              ) : (
                <p className="change__after change__after--empty">Removed</p>
              )}
              <p className="change__why">{change.rationale}</p>
            </div>
          </li>
        ))}
      </ul>

      {error ? (
        <p className="modal__error" role="alert">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
