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
  /**
   * Line heights, applied per text style — never on the page.
   *
   * Two react-pdf behaviours, both established with `src/dev/leading-sweep.tsx`
   * rather than assumed:
   *
   * 1. A page-level `lineHeight` does not inherit into nested <Text> the way CSS
   *    would. Setting it there collapses the blocks and the headline renders on top
   *    of the name.
   * 2. An explicit `lineHeight` is not a plain multiple of the font size — react-pdf
   *    factors in the font's own metrics. Values below ~0.9 make a block shorter
   *    than its glyphs, so the next element overlaps it.
   *
   * 1.0 is the floor that clears every block cleanly while keeping wrapped prose
   * readable. Re-run the sweep before changing these.
   */
  lineHeight: {
    display: 1,
    heading: 1,
    body: 1,
    prose: 1.1,
  },
} as const;
