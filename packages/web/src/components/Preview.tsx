import { useEffect } from "react";
import { usePDF } from "@react-pdf/renderer";
import type { Resume } from "@resume/shared";
import { ResumeDocument } from "../resume/Document";
import { useDebounced } from "../hooks/useDebounced";

/**
 * Live PDF preview.
 *
 * Uses `usePDF` + a plain iframe rather than react-pdf's <PDFViewer> so we control
 * the update cadence: the previous page stays on screen while the next render is in
 * flight, instead of the viewer blanking on every keystroke.
 */
export function Preview({ resume }: { resume: Resume }) {
  const debounced = useDebounced(resume, 400);
  const [instance, update] = usePDF({ document: <ResumeDocument resume={debounced} /> });

  useEffect(() => {
    update(<ResumeDocument resume={debounced} />);
  }, [debounced, update]);

  if (instance.error) {
    return (
      <div className="preview preview--error">
        <p>The preview could not be rendered.</p>
        <pre>{String(instance.error)}</pre>
      </div>
    );
  }

  return (
    <div className="preview">
      {instance.url ? (
        <iframe
          className="preview__frame"
          // Hide the built-in viewer's toolbar and thumbnail rail: this is a live
          // preview of the document, not a PDF reader. Chrome and Firefox honour
          // these; anything that ignores them just shows its own chrome.
          src={`${instance.url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
          title="Resume preview"
        />
      ) : (
        <div className="preview__placeholder">Rendering…</div>
      )}
      {instance.loading && instance.url ? (
        <span className="preview__status">Updating…</span>
      ) : null}
    </div>
  );
}
