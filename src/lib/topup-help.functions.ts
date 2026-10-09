import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const INSTRUCTIONS = `You help customers of BitePay, a Tanzanian college canteen wallet app, with Selcom mobile money top-up problems (M-Pesa, Yas Pesa/Mixx, Airtel Money, HaloPesa).
How it works: the customer picks a network, enters a phone number, BitePay asks Selcom to send a PIN prompt (USSD push) to the phone, the customer enters their PIN, and the wallet is credited once Selcom confirms. A transaction fee may be added. Minimum TZS 500.
Common causes: wrong network chosen for the number, phone off/no signal so the prompt never arrives, prompt timed out (~60s), wrong PIN, insufficient mobile balance including fee, daily limits, network delay in confirmation, canteen not set up.
Reply in the customer's language (English or Swahili), plain words, under 150 words, in this format:
**Likely cause:** one sentence.
**What to do next:**
1. ...
2. ...
If money left their phone but the wallet was not credited, tell them to keep the SMS confirmation and show it to the cashier. Never ask for their PIN.`;

export const diagnoseTopupIssue = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({
    description: z.string().trim().min(5).max(1500),
    recent: z.string().max(1500).optional(),
  }).parse(raw))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false as const, reason: "The help assistant is not set up yet." };
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    try {
      let failure: unknown = null;
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        system: INSTRUCTIONS,
        prompt: `Customer's description:\n${data.description}\n\nTheir recent mobile money attempts:\n${data.recent || "none recorded"}`,
        onError: ({ error }) => { failure = error; },
        providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] } },
      });
      const text = await result.text;
      if (failure || !text.trim()) throw failure ?? new Error("empty");
      return { ok: true as const, text };
    } catch (e) {
      const status = (e as { statusCode?: number })?.statusCode;
      if (status === 429) return { ok: false as const, reason: "The assistant is busy. Please try again in a minute." };
      if (status === 402 || status === 403) return { ok: false as const, reason: "The help assistant is unavailable right now. Please ask the cashier." };
      return { ok: false as const, reason: "Could not get help right now. Please try again or ask the cashier." };
    }
  });
