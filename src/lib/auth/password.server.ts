import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing using Node's built-in scrypt (Worker-safe with nodejs_compat).
 * Format: scrypt$N$r$p$saltB64$hashB64
 * Defaults follow OWASP: N=2^15, r=8, p=1, 64-byte key.
 */
const N = 1 << 15;
const R = 8;
const P = 1;
const KEYLEN = 64;

export function hashPassword(plain: string): string {
  if (!plain || plain.length < 4) throw new Error("Password too short");
  const salt = randomBytes(16);
  const key = scryptSync(plain, salt, KEYLEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  if (!stored?.startsWith("scrypt$")) return false;
  const [, nStr, rStr, pStr, saltB64, hashB64] = stored.split("$");
  const n = Number(nStr), r = Number(rStr), p = Number(pStr);
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const key = scryptSync(plain, salt, expected.length, { N: n, r, p, maxmem: 64 * 1024 * 1024 });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** PIN uses the same primitive; kept as its own name for clarity. */
export const hashPin = hashPassword;
export const verifyPin = verifyPassword;
