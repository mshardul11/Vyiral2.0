import { PDFViewer } from "@react-pdf/renderer";
import { ResumeDocument } from "./resume/Document";
import { fixtureResume } from "./resume/fixture";

/**
 * Phase-1 shell: renders the fixture resume through the real PDF template so the
 * data model and the document layout can be verified before any editor or model
 * call exists. The editor replaces this in phase 2.
 */
export function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <strong>Resume Builder</strong>
        <span className="app-header__note">Preview — fixture data</span>
      </header>
      <main className="preview-pane">
        <PDFViewer className="preview-frame" showToolbar>
          <ResumeDocument resume={fixtureResume} />
        </PDFViewer>
      </main>
    </div>
  );
}
