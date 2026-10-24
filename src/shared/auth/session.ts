import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { resolveUser } from "@/shared/auth/access";
import { routes } from "@/shared/config/routes";

export const SESSION_COOKIE = "lvd_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (value && value.length >= 16) return value;
  if (process.env.NODE_ENV === "production") return null;
  return "phien-cuc-bo-khong-dung-cho-production";
}

export function seal(userId: string, now: number) {
  const key = secret();
  if (!key) return null;
  const body = `${userId}.${now + MAX_AGE_SECONDS * 1000}`;
  const signature = createHmac("sha256", key).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function openSeal(token: string, now: number) {
  const key = secret();
  if (!key) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresRaw, signature] = parts;
  if (!userId || !expiresRaw || !signature) return null;
  const body = `${userId}.${expiresRaw}`;
  const expected = createHmac("sha256", key).update(body).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < now) return null;
  return userId;
}

export async function readUser() {
  await connection();
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = openSeal(token, Date.now());
  if (!userId) return null;
  return resolveUser(userId);
}

export async function requireUser() {
  const user = await readUser();
  if (!user) redirect(routes.login);
  return user;
}

export const sessionCookie = {
  name: SESSION_COOKIE,
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
  secure: process.env.NODE_ENV === "production",
};
