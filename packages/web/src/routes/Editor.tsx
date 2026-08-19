import { Suspense, lazy, useState } from "react";
import { isBlankResume, resumeReadiness, type Resume } from "@resume/shared";
import { clearHistory, useResumeStore, useTemporalStore } from "../state/resume";
import { useHydrated } from "../state/hydration";

import { Button } from "../components/ui";
import { BasicsSection } from "../components/sections/BasicsSection";
import { ExperienceSection } from "../components/sections/ExperienceSection";
import { ProjectsSection } from "../components/sections/ProjectsSection";
import { EducationSection } from "../components/sections/EducationSection";
import { SkillsSection } from "../components/sections/SkillsSection";
import { fixtureResume } from "../resume/fixture";
import { ImportDialog } from "../components/ImportDialog";
import { IntakeWizard } from "../components/IntakeWizard";
import { TailorDialog } from "../components/TailorDialog";
import { ShareDialog } from "../components/ShareDialog";

/**
 * The PDF renderer is the heaviest thing in the bundle, so it loads after the rest
 * of the page. The form is usable immediately; the preview fills in behind it.
 */
const Preview = lazy(() =>
  import("../components/Preview").then((module) => ({ default: module.Preview })),
);

export function Editor() {
  const hydrated = useHydrated();
  const resume = useResumeStore((state) => state.resume);
  const replace = useResumeStore((state) => state.replace);
  const reset = useResumeStore((state) => state.reset);

  const undo = useTemporalStore((state) => state.undo);
  const redo = useTemporalStore((state) => state.redo);
  const pastStates = useTemporalStore((state) => state.pastStates);
  const futureStates = useTemporalStore((state) => state.futureStates);

  const [exporting, setExporting] = useState<null | "pdf" | "docx">(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | "import" | "wizard" | "tailor" | "share">(null);

  const problems = resumeReadiness(resume);
  const blank = isBlankResume(resume);

  /**
   * Import and generate replace the entire document, so undo history from before
   * the replacement is dropped: the first undo should return to the imported
   * resume, not to a document the user was never shown.
   */
  function adopt(next: Resume) {
    replace(next);
    clearHistory();
    setDialog(null);
  }

  async function runExport(kind: "pdf" | "docx") {
    setExporting(kind);
    setExportError(null);
    try {
      // Both exporters pull in a large library, so they are loaded on demand
      // rather than sitting in the entry chunk for a user who never downloads.
      if (kind === "pdf") {
        const { downloadPdf } = await import("../export/pdf");
        await downloadPdf(resume);
      } else {
        const { downloadDocx } = await import("../export/docx");
        await downloadDocx(resume);
      }
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "The file could not be generated.",
      );
    } finally {
      setExporting(null);
    }
  }

  if (!hydrated) {
    return <div className="loading-screen">Loading your resume…</div>;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <strong className="app-header__brand">Resume Builder</strong>

        <div className="app-header__group">
          <Button
            variant="ghost"
            onClick={() => undo()}
            disabled={pastStates.length === 0}
            title="Undo"
          >
            ↶ Undo
          </Button>
          <Button
            variant="ghost"
            onClick={() => redo()}
            disabled={futureStates.length === 0}
            title="Redo"
          >
            ↷ Redo
          </Button>
        </div>

        <div className="app-header__group">
          <Button onClick={() => setDialog("import")}>Import resume</Button>
          <Button onClick={() => setDialog("wizard")}>Guided questions</Button>
          <Button onClick={() => setDialog("tailor")} disabled={blank}>
            Tailor to a job
          </Button>
        </div>

        <div className="app-header__spacer" />

        <div className="app-header__group">
          <Button onClick={() => setDialog("share")} disabled={blank}>
            Share link
          </Button>
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

      {exportError ? (
        <div className="banner banner--error" role="alert">
          {exportError}
        </div>
      ) : null}

      {problems.length > 0 ? (
        <div className="banner banner--info">
          <strong>Before you send this:</strong>
          <ul>
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <main className="editor">
        <div className="editor__form">
          {blank ? (
            <div className="starter">
              <h2 className="starter__title">Start from something</h2>
              <p className="starter__prose">
                Import a resume you already have, or answer a few questions and have one
                written for you. You can also just fill the form in yourself.
              </p>
              <div className="starter__actions">
                <Button variant="primary" onClick={() => setDialog("wizard")}>
                  Answer a few questions
                </Button>
                <Button onClick={() => setDialog("import")}>Import an existing resume</Button>
              </div>
            </div>
          ) : null}

          <BasicsSection />
          <ExperienceSection />
          <ProjectsSection />
          <EducationSection />
          <SkillsSection />

          <div className="editor__footer">
            <Button
              variant="ghost"
              onClick={() => replace(fixtureResume)}
              title="Replace the document with example content"
            >
              Load example content
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm("Clear the whole resume? This can be undone with ↶ Undo.")) {
                  reset();
                }
              }}
            >
              Clear resume
            </Button>
          </div>
        </div>

        <aside className="editor__preview">
          <Suspense fallback={<div className="preview preview--loading">Loading preview…</div>}>
            <Preview resume={resume} />
          </Suspense>
        </aside>
      </main>

      {dialog === "import" ? (
        <ImportDialog
          hasExistingContent={!blank}
          onImport={adopt}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {dialog === "wizard" ? (
        <IntakeWizard
          hasExistingContent={!blank}
          onGenerated={adopt}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {dialog === "share" ? (
        <ShareDialog resume={resume} onClose={() => setDialog(null)} />
      ) : null}

      {dialog === "tailor" ? (
        <TailorDialog
          resume={resume}
          // Unlike import and generate, tailoring keeps undo history: it edits the
          // document the user already had, so undoing back past it is meaningful.
          onApply={(next) => {
            replace(next);
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </div>
  );
}
