import { useRef, useState } from "react";
import { DOCX_MIME, MAX_UPLOAD_BYTES, PDF_MIME, type Resume } from "@resume/shared";
import { ApiCallError, parseResumeFile } from "../api/client";
import { Modal } from "./Modal";
import { Button } from "./ui";

/**
 * Import an existing resume from a PDF or DOCX.
 *
 * The result replaces the whole document, so it is confirmed rather than applied
 * on arrival — the user sees what was extracted before it overwrites anything they
 * already had.
 */
export function ImportDialog({
  hasExistingContent,
  onImport,
  onClose,
}: {
  hasExistingContent: boolean;
  onImport: (resume: Resume) => void;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function accept(candidate: File | undefined) {
    if (!candidate) return;
    setError(null);
    if (candidate.size > MAX_UPLOAD_BYTES) {
      setError(`That file is larger than ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB.`);
      return;
    }
    const named = candidate.name.toLowerCase();
    const looksSupported =
      candidate.type === PDF_MIME ||
      candidate.type === DOCX_MIME ||
      named.endsWith(".pdf") ||
      named.endsWith(".docx");
    if (!looksSupported) {
      setError("Import a PDF or a Word (.docx) file.");
      return;
    }
    setFile(candidate);
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onImport(await parseResumeFile(file));
    } catch (caught) {
      setError(
        caught instanceof ApiCallError ? caught.message : "That file could not be imported.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Import an existing resume"
      onClose={onClose}
      footer={
        <>
          <span className="modal__note">
            {hasExistingContent
              ? "This replaces what you have now. You can undo it afterwards."
              : "Your file is read on the server and not stored."}
          </span>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => void run()} disabled={!file || busy}>
            {busy ? "Reading…" : "Import"}
          </Button>
        </>
      }
    >
      <div
        className={`dropzone${dragging ? " dropzone--active" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          accept(event.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          hidden
          accept=".pdf,.docx,application/pdf"
          onChange={(event) => accept(event.target.files?.[0])}
        />
        {file ? (
          <>
            <strong>{file.name}</strong>
            <span className="dropzone__hint">{(file.size / 1024).toFixed(0)} KB — click to change</span>
          </>
        ) : (
          <>
            <strong>Drop a PDF or .docx here</strong>
            <span className="dropzone__hint">or click to choose a file</span>
          </>
        )}
      </div>

      <p className="modal__prose">
        Your resume is transcribed as written — wording is not changed. Check the dates and
        numbers afterwards; anything the file did not contain is left blank rather than
        guessed at.
      </p>

      {error ? (
        <p className="modal__error" role="alert">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
