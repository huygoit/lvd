import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derived = (await scryptAsync(password.normalize("NFKC"), salt, 32)) as Buffer;
  return `scrypt$${salt}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [kind, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const derived = (await scryptAsync(password.normalize("NFKC"), salt, 32)) as Buffer;
  const actual = Buffer.from(hash, "base64url");
  if (actual.length !== derived.length) return false;
  return timingSafeEqual(actual, derived);
}
