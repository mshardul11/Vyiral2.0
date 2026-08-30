import { createHmac, timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { LoginRequestSchema, RegisterRequestSchema, UpdateProfileRequestSchema } from "@resume/shared";
import { config } from "../config.js";
import { authenticate, createUser, findUser, updateUser } from "../store/users.js";

export const authRoutes = new Hono();
const cookieName = "vyiral_session";

function sign(value: string) {
  return createHmac("sha256", config.sessionSecret).update(value).digest("base64url");
}

function sessionFor(userId: string) {
  const expires = Date.now() + 1000 * 60 * 60 * 24 * 30;
  const value = `${userId}.${expires}`;
  return `${value}.${sign(value)}`;
}

function sessionUserId(cookie?: string) {
  if (!cookie) return null;
  const [id, expires, signature] = cookie.split(".");
  if (!id || !expires || !signature || Number(expires) < Date.now()) return null;
  const expected = Buffer.from(sign(`${id}.${expires}`));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? id : null;
}

function setSession(c: Parameters<typeof setCookie>[0], userId: string) {
  setCookie(c, cookieName, sessionFor(userId), {
    httpOnly: true, secure: config.isProduction, sameSite: "Lax", path: "/", maxAge: 60 * 60 * 24 * 30,
  });
}

authRoutes.post("/register", async (c) => {
  const parsed = RegisterRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Enter a valid name, email, and a password of at least 10 characters." }, 400);
  const user = await createUser(parsed.data.name, parsed.data.email, parsed.data.password);
  if (!user) return c.json({ error: "An account with that email already exists." }, 409);
  setSession(c, user.id);
  return c.json({ user }, 201);
});

authRoutes.post("/login", async (c) => {
  const parsed = LoginRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Enter a valid email and password." }, 400);
  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) return c.json({ error: "Email or password is incorrect." }, 401);
  setSession(c, user.id);
  return c.json({ user });
});

authRoutes.get("/me", async (c) => {
  const id = sessionUserId(getCookie(c, cookieName));
  const user = id ? await findUser(id) : null;
  return user ? c.json({ user }) : c.json({ error: "Not signed in." }, 401);
});

authRoutes.patch("/me", async (c) => {
  const id = sessionUserId(getCookie(c, cookieName));
  if (!id) return c.json({ error: "Not signed in." }, 401);
  const parsed = UpdateProfileRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Check your profile details." }, 400);
  const user = await updateUser(id, parsed.data.name, parsed.data.title);
  return user ? c.json({ user }) : c.json({ error: "Account not found." }, 404);
});

authRoutes.post("/logout", (c) => {
  deleteCookie(c, cookieName, { path: "/" });
  return c.json({ ok: true });
});
