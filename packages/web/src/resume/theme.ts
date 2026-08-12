/**
 * Design tokens for the resume document.
 *
 * Kept separate from the template so the DOCX exporter can reference the same
 * sizes and spacing and the two outputs don't drift apart visually.
 */
export const theme = {
  /** Helvetica is a standard PDF base-14 font: no font file to fetch, no network
   *  dependency at render time, and reliably parsed by ATS software. */
  fontFamily: "Helvetica",
  fontFamilyBold: "Helvetica-Bold",
  fontFamilyOblique: "Helvetica-Oblique",
  color: {
    ink: "#111827",
    muted: "#4b5563",
    faint: "#9ca3af",
    rule: "#d1d5db",
    accent: "#1f2937",
  },
  size: {
    name: 22,
    headline: 11,
    sectionHeading: 10,
    body: 9.5,
    meta: 9,
  },
  spacing: {
    page: 40,
    section: 14,
    entry: 9,
    line: 2,
  },
  lineHeight: 1.4,
} as const;
