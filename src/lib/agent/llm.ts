import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { config, type AiProviderName } from "../config";

// Small provider interface so the model can be swapped (Gemini by default,
// Claude optional). Every response is validated with zod before use.

export type JsonRequest<T> = { name: string; system: string; user: string; schema: z.ZodType<T> };
export type JsonResult<T> = { data: T; model: string };

export interface LlmProvider {
  readonly name: AiProviderName;
  readonly label: string;
  generateJson<T>(req: JsonRequest<T>): Promise<JsonResult<T>>;
}

export class LlmError extends Error {}

function jsonSchemaFor(schema: z.ZodType): Record<string, unknown> {
  const s = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  delete s.$schema;
  return s;
}

function parseOrThrow<T>(schema: z.ZodType<T>, text: string): T {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new LlmError("Model did not return valid JSON");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new LlmError(`Model output failed validation: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
  return parsed.data;
}

class GeminiProvider implements LlmProvider {
  readonly name = "gemini" as const;
  get label() {
    return `Google Gemini (${config.ai.gemini.model})`;
  }

  async generateJson<T>(req: JsonRequest<T>): Promise<JsonResult<T>> {
    const models = [config.ai.gemini.model, config.ai.gemini.fallbackModel].filter((m, i, a) => m && a.indexOf(m) === i);
    // A seller should not wait minutes: hard budget across all retries, and
    // the primary model may not use it all, so the fallback still gets a turn.
    const deadline = Date.now() + 50_000;
    let lastErr: unknown;
    for (const [index, model] of models.entries()) {
      const isLast = index === models.length - 1;
      const modelDeadline = isLast ? deadline : Math.min(deadline - 15_000, Date.now() + 25_000);
      for (let attempt = 1; attempt <= 2; attempt++) {
        const left = modelDeadline - Date.now();
        if (left < 3_000) break;
        try {
          const text = await this.call(model, req, left);
          return { data: parseOrThrow(req.schema, text), model };
        } catch (err) {
          lastErr = err;
          const msg = err instanceof LlmError ? err.message : "";
          // Quota used up or model gone: retrying the same model cannot help.
          if (/\b(429|404)\b/.test(msg)) break;
          const retryable = /\b(500|503)\b|validation|valid JSON/i.test(msg);
          if (!retryable) break;
          await new Promise((r) => setTimeout(r, 600 * attempt));
        }
      }
    }
    throw new LlmError(`Gemini gave no usable answer within the time budget (${lastErr instanceof Error ? lastErr.message : "busy"})`);
  }

  private async call(model: string, req: JsonRequest<unknown>, timeoutMs: number, thinking = true): Promise<string> {
    // Gemini 3 models think by default, which took over a minute per call in
    // testing. A low thinking level answers in about 5 seconds.
    const level = config.ai.gemini.thinkingLevel;
    let res: Response;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": config.ai.gemini.apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.system }] },
          contents: [{ role: "user", parts: [{ text: req.user }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseJsonSchema: jsonSchemaFor(req.schema),
            temperature: 0.2,
            ...(thinking && level ? { thinkingConfig: { thinkingLevel: level } } : {}),
          },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      throw new LlmError(`Gemini request timeout or network error: ${(err as Error).message}`);
    }
    const body = (await res.json().catch(() => ({}))) as any;
    if (res.status === 400 && thinking && /thinking/i.test(body?.error?.message ?? "")) return this.call(model, req, timeoutMs, false);
    if (!res.ok) throw new LlmError(`Gemini ${res.status}: ${body?.error?.message ?? "request failed"}`);
    const text = (body.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join("");
    if (!text) throw new LlmError(`Gemini returned no content (finish reason ${body.candidates?.[0]?.finishReason ?? "unknown"})`);
    return text;
  }
}

class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic" as const;
  private client = new Anthropic({ apiKey: config.ai.anthropic.apiKey });
  get label() {
    return `Anthropic Claude (${config.ai.anthropic.model})`;
  }

  async generateJson<T>(req: JsonRequest<T>): Promise<JsonResult<T>> {
    // Forced tool use gives schema-shaped JSON; zod still validates it.
    const msg = await this.client.messages.create({
      model: config.ai.anthropic.model,
      max_tokens: 4096,
      system: req.system,
      messages: [{ role: "user", content: req.user }],
      tools: [{ name: req.name, description: `Return the ${req.name} result.`, input_schema: jsonSchemaFor(req.schema) as Anthropic.Tool.InputSchema }],
      tool_choice: { type: "tool", name: req.name },
    });
    const block = msg.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") throw new LlmError("Claude did not return a tool result");
    return { data: parseOrThrow(req.schema, JSON.stringify(block.input)), model: config.ai.anthropic.model };
  }
}

let provider: LlmProvider | null | undefined;

// null means no AI key: the pipeline uses its labelled offline rules instead.
export function llm(): LlmProvider | null {
  if (provider === undefined) {
    provider = config.ai.provider === "gemini" ? new GeminiProvider() : config.ai.provider === "anthropic" ? new AnthropicProvider() : null;
  }
  return provider;
}
