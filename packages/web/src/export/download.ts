/** Triggers a browser download for an in-memory blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking immediately can cancel the download in some browsers; one tick is enough.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "Priya Raghunathan" + ".pdf" -> "Priya-Raghunathan-Resume.pdf" */
export function resumeFilename(name: string, extension: string): string {
  const base = name.trim().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
  return `${base || "Resume"}-Resume.${extension}`;
}
