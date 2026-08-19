import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { MessageCreateParams } from "@anthropic-ai/sdk/resources/messages";
import {
  ResumeSchema,
  RewriteResultSchema,
  TailorResultSchema,
  type IntakeAnswers,
  type Resume,
  type RewriteRequest,
  type RewriteResult,
  type TailorResult,
} from "@resume/shared";
import { MODEL } from "../config.js";
import { anthropic } from "./client.js";
import { CRAFT, GENERATE, PARSE, REWRITE, TAILOR } from "./prompts.js";

/**
 * Every model call in the app.
 *
 * All operations run on the same model; cost and latency are tuned with
 * `output_config.effort` rather than by switching models. Thinking is on by default
 * on this model, so the `thinking` parameter is deliberately absent.
 */

type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/**
 * System prompt as two blocks with the cache breakpoint after the shared half, so
 * every operation reads the same cached prefix instead of each caching its own copy.
 */
function system(operationPrompt: string): MessageCreateParams["system"] {
  return [
    { type: "text", text: CRAFT, cache_control: { type: "ephemeral" } },
    { type: "text", text: operationPrompt },
  ];
}

/** Wraps text in a tag so the model can tell inputs apart from instructions. */
function tag(name: string, content: string): string {
  return `<${name}>\n${content}\n</${name}>`;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  model: string;
}

export interface Completed<T> {
  data: T;
  usage: Usage;
}

function usageOf(response: {
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
  };
}): Usage {
  return {
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
    cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
  };
}

/** Raised when the model declined the request rather than answering it. */
export class ModelRefusalError extends Error {
  constructor(readonly category: string | null) {
    super("The model declined to work on this content.");
    this.name = "ModelRefusalError";
  }
}

/** Raised when the response was cut off before the structured output was complete. */
export class TruncatedResponseError extends Error {
  constructor() {
    super("The response was cut off before it was complete.");
    this.name = "TruncatedResponseError";
  }
}

/**
 * Checks the outcome of a structured-output call before its content is trusted.
 * `stop_reason` has to be read first: a refusal returns HTTP 200 with empty content,
 * so code that reaches straight for the parsed output breaks on it.
 */
function assertUsable(response: {
  stop_reason: string | null;
  stop_details?: { category?: string | null } | null;
}): void {
  if (response.stop_reason === "refusal") {
    throw new ModelRefusalError(response.stop_details?.category ?? null);
  }
  if (response.stop_reason === "max_tokens") {
    throw new TruncatedResponseError();
  }
}

// --- Section rewrite ----------------------------------------------------------

const REWRITE_GUIDANCE: Record<RewriteRequest["kind"], string> = {
  highlight: "This is an achievement bullet. Keep each variant to one line, under 20 words.",
  summary:
    "This is the resume summary. Keep each variant to two or three sentences, third person, no pronouns.",
  "project-description":
    "This is a project description. Keep each variant to one or two sentences.",
};

export async function rewriteSection(
  request: RewriteRequest,
): Promise<Completed<RewriteResult>> {
  const parts = [
    REWRITE_GUIDANCE[request.kind],
    tag("original", request.text),
    request.context.trim() ? tag("context", request.context) : "",
    request.instruction.trim()
      ? tag("requested_change", request.instruction)
      : "",
  ].filter(Boolean);

  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 2000,
    system: system(REWRITE),
    output_config: {
      format: zodOutputFormat(RewriteResultSchema),
      // Three rewrites of one line is not a reasoning problem, and this button is
      // pressed constantly — latency matters more than depth here.
      effort: "low" satisfies Effort,
    },
    messages: [{ role: "user", content: parts.join("\n\n") }],
  });

  assertUsable(response);

  const parsed = response.parsed_output;
  if (!parsed) throw new Error("The model returned no usable output.");

  return { data: parsed, usage: usageOf(response) };
}

// --- Guided generate ----------------------------------------------------------

/** Renders intake answers as tagged text so the model can tell the fields apart. */
function renderIntake(intake: IntakeAnswers): string {
  const roles = intake.roles
    .filter((role) => role.company.trim() || role.role.trim() || role.whatYouDid.trim())
    .map((role, index) =>
      tag(
        `role_${index + 1}`,
        [
          `Title: ${role.role}`,
          `Company: ${role.company}`,
          `Location: ${role.location}`,
          `Dates: ${role.startDate} to ${role.endDate}`,
          `In their words: ${role.whatYouDid}`,
        ].join("\n"),
      ),
    )
    .join("\n\n");

  return [
    tag(
      "contact",
      [
        `Name: ${intake.name}`,
        `Email: ${intake.email}`,
        `Phone: ${intake.phone}`,
        `Location: ${intake.location}`,
        `Links:\n${intake.links}`,
      ].join("\n"),
    ),
    tag(
      "goal",
      [`Target role: ${intake.targetRole}`, `Years of experience: ${intake.yearsExperience}`].join(
        "\n",
      ),
    ),
    roles ? tag("roles", roles) : "",
    intake.education.trim() ? tag("education", intake.education) : "",
    intake.skills.trim() ? tag("skills", intake.skills) : "",
    intake.projects.trim() ? tag("projects", intake.projects) : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function generateResume(intake: IntakeAnswers): Promise<Completed<Resume>> {
  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: system(GENERATE),
    output_config: {
      format: zodOutputFormat(ResumeSchema),
      // Turning rough answers into resume prose is real writing, but it is bounded
      // work — the facts are all supplied.
      effort: "medium" satisfies Effort,
    },
    messages: [{ role: "user", content: renderIntake(intake) }],
  });

  assertUsable(response);
  const parsed = response.parsed_output;
  if (!parsed) throw new Error("The model returned no usable output.");
  return { data: parsed, usage: usageOf(response) };
}

// --- Import an existing resume ------------------------------------------------

export type UploadSource =
  /** PDFs go to the model as-is; it reads them natively, so no text extraction. */
  | { kind: "pdf"; base64: string }
  /** DOCX has no native path, so the text is extracted before the call. */
  | { kind: "text"; text: string };

export async function parseResume(source: UploadSource): Promise<Completed<Resume>> {
  const instruction =
    "Extract this resume into the structured format. Transcribe; do not rewrite.";

  const content =
    source.kind === "pdf"
      ? ([
          // The document block goes before the text block.
          //
          // Citations stay off: they are mutually exclusive with
          // output_config.format and the request would 400.
          {
            type: "document" as const,
            source: {
              type: "base64" as const,
              media_type: "application/pdf" as const,
              data: source.base64,
            },
          },
          { type: "text" as const, text: instruction },
        ])
      : `${instruction}\n\n${tag("resume_text", source.text)}`;

  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: system(PARSE),
    output_config: {
      format: zodOutputFormat(ResumeSchema),
      // Mechanical extraction — no judgment to make, and import should feel quick.
      effort: "low" satisfies Effort,
    },
    messages: [{ role: "user", content }],
  });

  assertUsable(response);
  const parsed = response.parsed_output;
  if (!parsed) throw new Error("The model returned no usable output.");
  return { data: parsed, usage: usageOf(response) };
}

// --- Tailor to a job description ----------------------------------------------

export async function tailorResume(
  resume: Resume,
  jobDescription: string,
): Promise<Completed<TailorResult>> {
  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: system(TAILOR),
    output_config: {
      format: zodOutputFormat(TailorResultSchema),
      // The one operation with a genuinely hard judgment call in it: deciding what
      // to emphasise, reorder, and reword against a posting — and where to leave a
      // gap standing rather than paper over it.
      effort: "high" satisfies Effort,
    },
    messages: [
      {
        role: "user",
        content: [
          tag("current_resume", JSON.stringify(resume, null, 2)),
          tag("job_description", jobDescription),
        ].join("\n\n"),
      },
    ],
  });

  assertUsable(response);
  const parsed = response.parsed_output;
  if (!parsed) throw new Error("The model returned no usable output.");
  return { data: parsed, usage: usageOf(response) };
}
