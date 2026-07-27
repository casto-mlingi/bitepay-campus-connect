import { createHmac, timingSafeEqual } from "node:crypto";
import {
  getRequestHeader,
  setResponseHeader,
} from "@tanstack/react-start/server";

/**
 * Stateless HMAC-signed session cookie.
 * Payload = base64url(JSON({ uid, sid, exp })) + "." + base64url(hmacSHA256(payload))
 * Rotate by changing SESSION_SECRET.
 */

const COOKIE = "bp_session";
const TTL_DAYS = 30;

export type SessionPayload = {
  uid: string;          // profile.id
  sid: string | null;   // active store_id (nullable for super_admin)
  role: "customer" | "staff" | "super_admin";
  staffRole?: "cashier" | "supervisor" | "owner" | null;
  exp: number;          // unix seconds
};

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

function b64url(input: Buffer | string) {
  const b = typeof input === "string" ? Buffer.from(input) : input;
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function signSession(p: Omit<SessionPayload, "exp"> & { exp?: number }): string {
  const exp = p.exp ?? Math.floor(Date.now() / 1000) + TTL_DAYS * 86400;
  const body = b64url(JSON.stringify({ ...p, exp }));
  const sig = b64url(createHmac("sha256", secret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifySession(token: string): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest();
  const provided = fromB64url(sig);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;
  try {
    const parsed = JSON.parse(fromB64url(body).toString("utf8")) as SessionPayload;
    if (parsed.exp * 1000 < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  header.split(/;\s*/).forEach((kv) => {
    const i = kv.indexOf("=");
    if (i > 0) out[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1));
  });
  return out;
}

export function readSessionCookie(): SessionPayload | null {
  const cookies = parseCookies(getRequestHeader("cookie"));
  const raw = cookies[COOKIE];
  return raw ? verifySession(raw) : null;
}

export function writeSessionCookie(payload: Omit<SessionPayload, "exp">) {
  const token = signSession(payload);
  const maxAge = TTL_DAYS * 86400;
  setResponseHeader(
    "set-cookie",
    `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`,
  );
  return token;
}

export function clearSessionCookie() {
  setResponseHeader("set-cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}
