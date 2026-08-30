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
    .describe("Human-readable location, e.g. 'Summary' or 'Experience — Acme Corp'."),
  /**
   * The `path` is what makes per-change accept/reject exact: applying a subset is a
   * copy of the tailored value at each accepted path, rather than trying to locate
   * `before` by string matching.
   */
  path: z
    .string()
    .describe(
      "Dot-separated path to the changed value in the resume object, using numeric " +
        "indices for arrays. Examples: 'summary', 'basics.headline', " +
        "'experience.0.highlights.2', 'skills.1.items', 'experience'. Point at the " +
        "smallest value that fully contains the change — use the array path when " +
        "items were reordered, added, or removed.",
    ),
  before: z.string().describe("The original text, for display. Empty if this adds something."),
  after: z.string().describe("The new text, for display. Empty if this removes something."),
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

// --- Accounts -----------------------------------------------------------------

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  title: z.string(),
  createdAt: z.string(),
});
export type User = z.infer<typeof UserSchema>;

export const RegisterRequestSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(10).max(128),
});
export const LoginRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});
export const UpdateProfileRequestSchema = z.object({
  name: z.string().trim().min(2).max(80),
  title: z.string().trim().max(100),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

// --- Errors -------------------------------------------------------------------

export const ApiErrorSchema = z.object({
  error: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
