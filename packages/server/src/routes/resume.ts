import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { RewriteRequestSchema } from "@resume/shared";
import { requireApiKey } from "../claude/client.js";
import { rewriteSection } from "../claude/operations.js";
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
