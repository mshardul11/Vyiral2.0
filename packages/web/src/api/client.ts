import type { RewriteKind, RewriteRequest, RewriteResult } from "@resume/shared";

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
