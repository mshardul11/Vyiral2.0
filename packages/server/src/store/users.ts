import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { User } from "@resume/shared";
import { config } from "../config.js";

const scrypt = promisify(scryptCallback);
const usersFile = path.join(config.dataDir, "accounts", "users.json");

type StoredUser = User & { passwordHash: string; passwordSalt: string };

async function readUsers(): Promise<StoredUser[]> {
  try {
    return JSON.parse(await readFile(usersFile, "utf8")) as StoredUser[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeUsers(users: StoredUser[]) {
  await mkdir(path.dirname(usersFile), { recursive: true });
  const temporary = `${usersFile}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(users, null, 2), { mode: 0o600 });
  await rename(temporary, usersFile);
}

function publicUser({ passwordHash: _hash, passwordSalt: _salt, ...user }: StoredUser): User {
  return user;
}

export async function createUser(name: string, email: string, password: string): Promise<User | null> {
  const users = await readUsers();
  if (users.some((user) => user.email === email)) return null;
  const salt = randomBytes(16).toString("hex");
  const passwordHash = ((await scrypt(password, salt, 64)) as Buffer).toString("hex");
  const user: StoredUser = {
    id: randomUUID(), name, email, title: "", createdAt: new Date().toISOString(), passwordHash, passwordSalt: salt,
  };
  users.push(user);
  await writeUsers(users);
  return publicUser(user);
}

export async function authenticate(email: string, password: string): Promise<User | null> {
  const user = (await readUsers()).find((candidate) => candidate.email === email);
  if (!user) return null;
  const actual = (await scrypt(password, user.passwordSalt, 64)) as Buffer;
  const expected = Buffer.from(user.passwordHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected) ? publicUser(user) : null;
}

export async function findUser(id: string): Promise<User | null> {
  const user = (await readUsers()).find((candidate) => candidate.id === id);
  return user ? publicUser(user) : null;
}

export async function updateUser(id: string, name: string, title: string): Promise<User | null> {
  const users = await readUsers();
  const user = users.find((candidate) => candidate.id === id);
  if (!user) return null;
  user.name = name;
  user.title = title;
  await writeUsers(users);
  return publicUser(user);
}
