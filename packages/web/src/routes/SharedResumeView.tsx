import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Resume } from "@resume/shared";
import { ApiCallError, fetchShare } from "../api/client";
import { Preview } from "../components/Preview";
import { Button } from "../components/ui";
import { downloadPdf } from "../export/pdf";
import { downloadDocx } from "../export/docx";

/** Read-only view of a published resume, rendered from the same PDF template. */
export function SharedResumeView() {
  const { slug } = useParams<{ slug: string }>();
  const [resume, setResume] = useState<Resume | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<null | "pdf" | "docx">(null);

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();

    fetchShare(slug, controller.signal)
      .then((shared) => setResume(shared.resume))
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(
          caught instanceof ApiCallError ? caught.message : "That link could not be opened.",
        );
      });

    return () => controller.abort();
  }, [slug]);

  async function runExport(kind: "pdf" | "docx") {
    if (!resume) return;
    setExporting(kind);
    try {
      if (kind === "pdf") await downloadPdf(resume);
      else await downloadDocx(resume);
    } finally {
      setExporting(null);
    }
  }

  if (error) {
    return (
      <div className="shared shared--message">
        <h1 className="shared__title">This link doesn&rsquo;t work</h1>
        <p className="shared__prose">{error}</p>
        <a className="button" href="/">
          Build your own resume
        </a>
      </div>
    );
  }

  if (!resume) {
    return <div className="loading-screen">Loading…</div>;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <strong className="app-header__brand">
          {resume.basics.name ? `${resume.basics.name} — Resume` : "Resume"}
        </strong>
        <div className="app-header__spacer" />
        <div className="app-header__group">
          <Button onClick={() => void runExport("docx")} disabled={exporting !== null}>
            {exporting === "docx" ? "Preparing…" : "Download DOCX"}
          </Button>
          <Button
            variant="primary"
            onClick={() => void runExport("pdf")}
            disabled={exporting !== null}
          >
            {exporting === "pdf" ? "Preparing…" : "Download PDF"}
          </Button>
        </div>
      </header>
      <main className="shared__preview">
        <Preview resume={resume} />
      </main>
    </div>
  );
}
