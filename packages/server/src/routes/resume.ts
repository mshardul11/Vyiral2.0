import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  DOCX_MIME,
  GenerateRequestSchema,
  MAX_UPLOAD_BYTES,
  PDF_MIME,
  RewriteRequestSchema,
} from "@resume/shared";
import mammoth from "mammoth";
import { requireApiKey } from "../claude/client.js";
import { generateResume, parseResume, rewriteSection } from "../claude/operations.js";
import { respondWithError } from "./errors.js";

export const resumeRoutes = new Hono();

/**
 * Rewrite one bullet, summary, or project description into three alternatives.
 * The client shows them as options; nothing is applied without the user choosing.
 */
resumeRoutes.post(
  "/rewrite",
  zValidator("json", RewriteRequestSchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: "That request was not valid." }, 400);
    }
    return undefined;
  }),
  async (c) => {
    try {
      requireApiKey();
      const { data, usage } = await rewriteSection(c.req.valid("json"));
      console.log("rewrite", usage);
      return c.json(data);
    } catch (error) {
      return respondWithError(c, error);
    }
  },
);

/** Build a full resume from the guided-questions answers. */
resumeRoutes.post(
  "/generate",
  zValidator("json", GenerateRequestSchema, (result, c) => {
    if (!result.success) return c.json({ error: "That request was not valid." }, 400);
    return undefined;
  }),
  async (c) => {
    try {
      requireApiKey();
      const { data, usage } = await generateResume(c.req.valid("json").intake);
      console.log("generate", usage);
      return c.json(data);
    } catch (error) {
      return respondWithError(c, error);
    }
  },
);

/**
 * Import an existing resume from an uploaded PDF or DOCX.
 *
 * Size and type are checked before the file reaches the model: an oversized or
 * unsupported upload should cost nothing and fail immediately.
 */
resumeRoutes.post("/parse", async (c) => {
  try {
    // Validation runs before the API-key check on purpose: rejecting an oversized
    // or unsupported file is free and should not depend on how the server is
    // configured, and a user who picked the wrong file deserves that message rather
    // than a generic "AI is not configured".

    // Check the declared length before parseBody buffers the whole upload into
    // memory. The post-parse check below still stands, since Content-Length can be
    // absent or wrong.
    const declaredLength = Number(c.req.header("content-length") ?? 0);
    if (declaredLength > MAX_UPLOAD_BYTES * 1.1) {
      const limitMb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
      return c.json({ error: `That file is larger than ${limitMb}MB.` }, 413);
    }

    const body = await c.req.parseBody();
    const file = body["file"];

    if (!(file instanceof File)) {
      return c.json({ error: "Attach a file to import." }, 400);
    }
    if (file.size === 0) {
      return c.json({ error: "That file is empty." }, 400);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      const limitMb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
      return c.json({ error: `That file is larger than ${limitMb}MB.` }, 413);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    // Trust the file's signature over the browser-declared MIME type, which varies
    // by platform and is trivially wrong for DOCX.
    const kind = detectFileKind(bytes, file);
    if (!kind) {
      return c.json({ error: "Import a PDF or a Word (.docx) file." }, 415);
    }

    const source =
      kind === "pdf"
        ? ({ kind: "pdf", base64: bytes.toString("base64") } as const)
        : ({ kind: "text", text: (await mammoth.extractRawText({ buffer: bytes })).value } as const);

    if (source.kind === "text" && source.text.trim().length === 0) {
      return c.json({ error: "No text could be read from that document." }, 422);
    }

    requireApiKey();
    const { data, usage } = await parseResume(source);
    console.log("parse", { ...usage, kind, bytes: file.size });
    return c.json(data);
  } catch (error) {
    return respondWithError(c, error);
  }
});

/** PDFs start with "%PDF-"; DOCX is a zip, so it starts with "PK". */
function detectFileKind(bytes: Buffer, file: File): "pdf" | "docx" | null {
  if (bytes.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  if (bytes.subarray(0, 2).toString("latin1") === "PK") {
    // A zip could be anything; only accept it when the client also calls it a DOCX
    // or the filename says so.
    if (file.type === DOCX_MIME || file.name.toLowerCase().endsWith(".docx")) return "docx";
    return null;
  }
  if (file.type === PDF_MIME) return "pdf";
  return null;
}
