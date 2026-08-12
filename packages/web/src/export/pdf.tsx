import { pdf } from "@react-pdf/renderer";
import type { Resume } from "@resume/shared";
import { ResumeDocument } from "../resume/Document";
import { downloadBlob, resumeFilename } from "./download";

/**
 * Renders and downloads the resume as a PDF.
 *
 * Renders fresh rather than reusing the preview's blob so the download always
 * reflects the current document, even if the debounced preview is a beat behind.
 */
export async function downloadPdf(resume: Resume): Promise<void> {
  const blob = await pdf(<ResumeDocument resume={resume} />).toBlob();
  downloadBlob(blob, resumeFilename(resume.basics.name, "pdf"));
}
