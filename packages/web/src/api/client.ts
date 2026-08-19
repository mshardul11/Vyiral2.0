import type {
  GenerateRequest,
  IntakeAnswers,
  Resume,
  RewriteKind,
  RewriteRequest,
  RewriteResult,
  TailorRequest,
  TailorResult,
} from "@resume/shared";

/**
 * Calls to our own API.
 *
 * In development Vite proxies /api to the server, so there is no base URL and no
 * CORS. In production `VITE_API_URL` points at the deployed API. The Anthropic key
 * never appears here — every model call goes through the server.
 */

const BASE = import.meta.env.VITE_API_URL ?? "";

/** An API call that failed with a message meant for the user. */
export class ApiCallError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiCallError";
  }
}

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiCallError("Could not reach the server. Check your connection.", 0);
  }

  if (!response.ok) {
    // The server sends { error } for every failure; fall back if it didn't.
    const message = await response
      .json()
      .then((body: unknown) =>
        typeof body === "object" && body !== null && "error" in body
          ? String((body as { error: unknown }).error)
          : null,
      )
      .catch(() => null);
    throw new ApiCallError(message ?? "Something went wrong. Try again.", response.status);
  }

  return (await response.json()) as T;
}

export function rewrite(
  request: {
    text: string;
    kind: RewriteKind;
    context?: string;
    instruction?: string;
  },
  signal?: AbortSignal,
): Promise<RewriteResult> {
  const body: RewriteRequest = {
    text: request.text,
    kind: request.kind,
    context: request.context ?? "",
    instruction: request.instruction ?? "",
  };
  return post<RewriteResult>("/resume/rewrite", body, signal);
}

export function tailorResume(
  resume: Resume,
  jobDescription: string,
  signal?: AbortSignal,
): Promise<TailorResult> {
  const body: TailorRequest = { resume, jobDescription };
  return post<TailorResult>("/resume/tailor", body, signal);
}

export function generateResume(
  intake: IntakeAnswers,
  signal?: AbortSignal,
): Promise<Resume> {
  const body: GenerateRequest = { intake };
  return post<Resume>("/resume/generate", body, signal);
}

/**
 * Uploads a PDF or DOCX for import. Sent as multipart rather than JSON so the file
 * is streamed as bytes instead of inflating ~33% as base64 on the way out.
 */
export async function parseResumeFile(file: File, signal?: AbortSignal): Promise<Resume> {
  const form = new FormData();
  form.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${BASE}/api/resume/parse`, {
      method: "POST",
      body: form,
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiCallError("Could not reach the server. Check your connection.", 0);
  }

  if (!response.ok) {
    const message = await response
      .json()
      .then((body: unknown) =>
        typeof body === "object" && body !== null && "error" in body
          ? String((body as { error: unknown }).error)
          : null,
      )
      .catch(() => null);
    throw new ApiCallError(message ?? "That file could not be imported.", response.status);
  }

  return (await response.json()) as Resume;
}
