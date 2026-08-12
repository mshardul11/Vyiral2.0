import { z } from "zod";
import { ResumeSchema } from "./resume.js";
import { IntakeAnswersSchema } from "./intake.js";

/**
 * Request and response contracts shared by the server routes and the web client.
 *
 * Schemas whose names end in `Result` are handed to Claude as structured-output
 * formats, so the same "no value constraints" rule from `resume.ts` applies to them.
 * Request schemas are server-side input validation only and may constrain freely.
 */

// --- POST /api/resume/rewrite -------------------------------------------------

/** What kind of prose is being rewritten. Selects the guidance in the prompt. */
export const RewriteKindSchema = z.enum(["highlight", "summary", "project-description"]);
export type RewriteKind = z.infer<typeof RewriteKindSchema>;

export const RewriteRequestSchema = z.object({
  text: z.string().min(1).max(2000),
  kind: RewriteKindSchema,
  /** Surrounding facts (role, company, target job) so variants stay grounded. */
  context: z.string().max(4000).default(""),
  /** Optional steer, e.g. "make it shorter" or "emphasise the cost saving". */
  instruction: z.string().max(500).default(""),
});
export type RewriteRequest = z.infer<typeof RewriteRequestSchema>;

export const RewriteResultSchema = z.object({
  variants: z
    .array(z.string())
    .describe("Exactly three rewrites, meaningfully different from each other and from the original."),
});
export type RewriteResult = z.infer<typeof RewriteResultSchema>;

// --- POST /api/resume/generate ------------------------------------------------

export const GenerateRequestSchema = z.object({
  intake: IntakeAnswersSchema,
});
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

// --- POST /api/resume/parse ---------------------------------------------------
// multipart/form-data with a single `file` field; no JSON body schema.

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const PDF_MIME = "application/pdf";
export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// --- POST /api/resume/tailor --------------------------------------------------

export const ChangeNoteSchema = z.object({
  section: z
    .string()
    .describe("Where the change lands, e.g. 'Summary' or 'Experience — Acme Corp'."),
  before: z.string().describe("The original text. Empty string if this adds something new."),
  after: z.string().describe("The replacement text. Empty string if this removes something."),
  rationale: z
    .string()
    .describe("One sentence tying the change to something specific in the job description."),
});
export type ChangeNote = z.infer<typeof ChangeNoteSchema>;

export const TailorRequestSchema = z.object({
  resume: ResumeSchema,
  jobDescription: z.string().min(1).max(20000),
});
export type TailorRequest = z.infer<typeof TailorRequestSchema>;

export const TailorResultSchema = z.object({
  resume: ResumeSchema.describe("The full tailored resume, ready to replace the original."),
  changes: z
    .array(ChangeNoteSchema)
    .describe("One entry per substantive edit, so the user can review before accepting."),
});
export type TailorResult = z.infer<typeof TailorResultSchema>;

// --- Share --------------------------------------------------------------------

export const ShareRequestSchema = z.object({
  resume: ResumeSchema,
});
export type ShareRequest = z.infer<typeof ShareRequestSchema>;

export const ShareCreatedSchema = z.object({
  slug: z.string(),
});
export type ShareCreated = z.infer<typeof ShareCreatedSchema>;

export const SharedResumeSchema = z.object({
  resume: ResumeSchema,
  createdAt: z.string(),
});
export type SharedResume = z.infer<typeof SharedResumeSchema>;

// --- Errors -------------------------------------------------------------------

export const ApiErrorSchema = z.object({
  error: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
