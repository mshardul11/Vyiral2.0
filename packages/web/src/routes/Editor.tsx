import { useState } from "react";
import { resumeReadiness } from "@resume/shared";
import { useResumeStore, useTemporalStore } from "../state/resume";
import { useHydrated } from "../state/hydration";
import { Preview } from "../components/Preview";
import { Button } from "../components/ui";
import { BasicsSection } from "../components/sections/BasicsSection";
import { ExperienceSection } from "../components/sections/ExperienceSection";
import { ProjectsSection } from "../components/sections/ProjectsSection";
import { EducationSection } from "../components/sections/EducationSection";
import { SkillsSection } from "../components/sections/SkillsSection";
import { downloadPdf } from "../export/pdf";
import { downloadDocx } from "../export/docx";
import { fixtureResume } from "../resume/fixture";

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

  const problems = resumeReadiness(resume);

  async function runExport(kind: "pdf" | "docx") {
    setExporting(kind);
    setExportError(null);
    try {
      if (kind === "pdf") await downloadPdf(resume);
      else await downloadDocx(resume);
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
          <Preview resume={resume} />
        </aside>
      </main>
    </div>
  );
}
