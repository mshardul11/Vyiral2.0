// Dev-only smoke check: renders the fixture resume to a real PDF outside the
// browser, so template regressions surface without opening the app.
// Usage: npx tsx src/dev/render-check.tsx [outfile]
import { renderToFile } from "@react-pdf/renderer";
import { ResumeDocument } from "../resume/Document";
import { fixtureResume } from "../resume/fixture";

const out = process.argv[2] ?? "./resume-check.pdf";
await renderToFile(<ResumeDocument resume={fixtureResume} />, out);
console.log("rendered ->", out);
