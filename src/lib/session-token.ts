/** Browser copy of the signed session token, sent with every server call. */
export const SESSION_TOKEN_KEY = "bitepay.session_token";

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(SESSION_TOKEN_KEY); } catch { return null; }
}

export function saveSessionToken(token: string | null | undefined) {
  if (typeof window === "undefined") return;
  try {
    if (token) localStorage.setItem(SESSION_TOKEN_KEY, token);
    else localStorage.removeItem(SESSION_TOKEN_KEY);
  } catch { /* storage blocked */ }
}
