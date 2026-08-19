import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ShareRequestSchema } from "@resume/shared";
import { publishShare, readShare } from "../store/shares.js";
import { respondWithError } from "./errors.js";

export const shareRoutes = new Hono();

/**
 * Publish a resume and get back a slug.
 *
 * No API key needed: this is plain storage, not a model call. Publishing is always
 * an explicit user action — the editor never writes here on its own.
 */
shareRoutes.post(
  "/",
  zValidator("json", ShareRequestSchema, (result, c) => {
    if (!result.success) return c.json({ error: "That resume could not be shared." }, 400);
    return undefined;
  }),
  async (c) => {
    try {
      const slug = await publishShare(c.req.valid("json").resume);
      return c.json({ slug }, 201);
    } catch (error) {
      return respondWithError(c, error);
    }
  },
);

/** Fetch a published resume. The slug is the only credential. */
shareRoutes.get("/:slug", async (c) => {
  try {
    const record = await readShare(c.req.param("slug"));
    if (!record) {
      return c.json({ error: "That link is not valid, or it has expired." }, 404);
    }
    return c.json(record);
  } catch (error) {
    return respondWithError(c, error);
  }
});
