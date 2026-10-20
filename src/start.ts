import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { getSessionToken } from "./lib/session-token";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

/** Sends the stored session token so sync works even when cookies are blocked. */
const sessionTokenMiddleware = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const token = getSessionToken();
  return next(token ? { headers: { "x-bp-session": token } } : undefined);
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
  functionMiddleware: [sessionTokenMiddleware],
}));
