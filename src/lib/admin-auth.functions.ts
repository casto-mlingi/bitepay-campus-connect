import { createServerFn } from "@tanstack/react-start";
import { createHash, timingSafeEqual } from "node:crypto";

// Fallback for self-hosted deployments (e.g. Coolify) where ADMIN_PASSWORD
// isn't set: only the SHA-256 hash is stored, never the password itself.
const FALLBACK_ADMIN_HASH = "675d34ba5c3c3343bdf37ffcb4545d1f92bac2542b34ef69561fd4382e3177d9";

function sha(s: string) {
  return createHash("sha256").update(s, "utf8").digest();
}

export const verifyAdminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { username: string; password: string }) => ({
    username: String(d?.username ?? "").slice(0, 100),
    password: String(d?.password ?? "").slice(0, 200),
  }))
  .handler(async ({ data }) => {
    const env = process.env.ADMIN_PASSWORD;
    const expected = env ? sha(env) : Buffer.from(FALLBACK_ADMIN_HASH, "hex");
    const userOk = data.username.trim().toLowerCase() === "admin";
    const passOk = timingSafeEqual(sha(data.password.trim()), expected);
    return { ok: (userOk && passOk) as boolean };
  });
