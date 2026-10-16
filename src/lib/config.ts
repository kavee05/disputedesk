import { z } from "zod";

// All configuration is read once, server side. Secrets never leave this module
// except as arguments to the PayPal and Anthropic clients.
const Env = z.object({
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_ENV: z.string().optional(),
  // "true" forces the simulated PayPal adapter even if credentials are set.
  DEMO_MODE: z.string().optional(),
  // "gemini" or "anthropic". Defaults to whichever key is set (Gemini first).
  AI_PROVIDER: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  GEMINI_FALLBACK_MODEL: z.string().optional(),
  GEMINI_THINKING_LEVEL: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().optional(),
  DATABASE_PATH: z.string().optional(),
  // Optional passcode that protects actions on a public deployment.
  ADMIN_PASSCODE: z.string().optional(),
});

const env = Env.parse(process.env);

export type DataMode = "sandbox" | "demo";

function resolveMode(): DataMode {
  if (env.DEMO_MODE === "true") return "demo";
  if (env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET) {
    if (env.PAYPAL_ENV !== "sandbox") {
      throw new Error('PAYPAL_ENV must be "sandbox". DisputeDesk never talks to live PayPal.');
    }
    return "sandbox";
  }
  return "demo";
}

export type AiProviderName = "gemini" | "anthropic" | "offline";

function resolveProvider(): AiProviderName {
  const wanted = env.AI_PROVIDER?.trim().toLowerCase();
  const hasGemini = !!env.GEMINI_API_KEY?.trim();
  const hasAnthropic = !!env.ANTHROPIC_API_KEY?.trim();
  if (wanted === "gemini" && hasGemini) return "gemini";
  if (wanted === "anthropic" && hasAnthropic) return "anthropic";
  if (hasGemini) return "gemini";
  if (hasAnthropic) return "anthropic";
  return "offline";
}

export const config = {
  mode: resolveMode(),
  paypal: {
    baseUrl: "https://api-m.sandbox.paypal.com",
    clientId: env.PAYPAL_CLIENT_ID ?? "",
    clientSecret: env.PAYPAL_CLIENT_SECRET ?? "",
  },
  ai: {
    provider: resolveProvider(),
    gemini: {
      apiKey: env.GEMINI_API_KEY?.trim() ?? "",
      // Flash-Lite answers in 1 to 4 seconds and has a much larger free-tier
      // quota than 3.8 Flash, which ran out of daily quota during testing.
      model: env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
      fallbackModel: env.GEMINI_FALLBACK_MODEL?.trim() || "gemini-3.8-flash",
      // "low" keeps answers around 5 seconds. Set to "" to use the model default.
      thinkingLevel: env.GEMINI_THINKING_LEVEL === undefined ? "low" : env.GEMINI_THINKING_LEVEL.trim(),
    },
    anthropic: {
      apiKey: env.ANTHROPIC_API_KEY?.trim() ?? "",
      model: env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-5-5",
    },
  },
  databasePath: env.DATABASE_PATH || "data/disputedesk.db",
  adminPasscode: env.ADMIN_PASSCODE ?? "",
};

export const hasAiKey = () => config.ai.provider !== "offline";
