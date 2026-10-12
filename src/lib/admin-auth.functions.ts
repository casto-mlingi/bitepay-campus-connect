import { createServerFn } from "@tanstack/react-start";
import { createHash, timingSafeEqual } from "node:crypto";

function matches(input: string, expected: string) {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export const verifyAdminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { username: string; password: string }) => ({
    username: String(d?.username ?? "").slice(0, 100),
    password: String(d?.password ?? "").slice(0, 200),
  }))
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) return { ok: false as const };
    const userOk = data.username.trim().toLowerCase() === "admin";
    const passOk = matches(data.password, expected);
    return { ok: (userOk && passOk) as boolean };
  });
