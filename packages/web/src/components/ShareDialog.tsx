import { useEffect, useState } from "react";
import type { Resume } from "@resume/shared";
import { ApiCallError, publishShare } from "../api/client";
import { Modal } from "./Modal";
import { Button } from "./ui";

/**
 * Publishes the resume to a link.
 *
 * This is the one action that puts the document on the server, so it is opt-in and
 * says plainly what it means: the link is the only credential, so anyone holding it
 * can read the resume.
 */
export function ShareDialog({ resume, onClose }: { resume: Resume; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      const { slug } = await publishShare(resume);
      setUrl(`${window.location.origin}/r/${slug}`);
    } catch (caught) {
      setError(
        caught instanceof ApiCallError ? caught.message : "The link could not be created.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard access can be denied; the input is selectable as a fallback.
      setError("Copying was blocked — select the link and copy it manually.");
    }
  }

  return (
    <Modal
      title="Share a link"
      onClose={onClose}
      footer={
        url ? (
          <>
            <span className="modal__note">Anyone with this link can view your resume.</span>
            <Button onClick={onClose}>Done</Button>
            <Button variant="primary" onClick={() => void copy()}>
              {copied ? "Copied" : "Copy link"}
            </Button>
          </>
        ) : (
          <>
            <span className="modal__note">Links expire after 90 days.</span>
            <Button onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void publish()} disabled={busy}>
              {busy ? "Publishing…" : "Create link"}
            </Button>
          </>
        )
      }
    >
      {url ? (
        <>
          <input className="input" readOnly value={url} onFocus={(e) => e.target.select()} />
          <p className="modal__prose">
            The link is the only thing protecting it — there is no password. Share it with
            people you mean to, and publish again if you change your resume.
          </p>
        </>
      ) : (
        <p className="modal__prose">
          This uploads a copy of your resume so it can be opened from a link. Everything
          else in this app stays in your browser. Anyone who has the link can read it, so
          treat it as public.
        </p>
      )}

      {error ? (
        <p className="modal__error" role="alert">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
