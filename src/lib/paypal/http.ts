import { audit } from "../audit";
import { config } from "../config";

// Thin typed wrapper over the PayPal REST API (sandbox only).
// Retries network errors, 429 and 5xx with backoff. Logs every call to the
// audit log without headers, so the token and client secret never land there.

export class PayPalError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
    readonly debugId?: string,
  ) {
    super(message);
  }
}

export type PayPalResponse<T = any> = { status: number; body: T; debugId?: string };

let token: { value: string; expiresAt: number } | undefined;

async function accessToken(): Promise<string> {
  if (token && Date.now() < token.expiresAt - 60_000) return token.value;
  const basic = Buffer.from(`${config.paypal.clientId}:${config.paypal.clientSecret}`).toString("base64");
  const res = await fetch(`${config.paypal.baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const body = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !body.access_token) {
    audit("paypal_request", `OAuth token request failed (${res.status})`, { status: res.status, error: body.error });
    throw new PayPalError("Could not get a PayPal sandbox token. Check PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.", res.status, { error: body.error });
  }
  token = { value: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 300) * 1000 };
  return token.value;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function paypalRequest<T = any>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  opts: { json?: unknown; form?: FormData; caseId?: string; attempts?: number } = {},
): Promise<PayPalResponse<T>> {
  const attempts = opts.attempts ?? 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${await accessToken()}` };
      let body: BodyInit | undefined;
      if (opts.json !== undefined) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(opts.json);
      } else if (opts.form) {
        body = opts.form;
      }
      const started = Date.now();
      const res = await fetch(`${config.paypal.baseUrl}${path}`, { method, headers, body });
      const text = await res.text();
      let parsed: any = text;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        /* non JSON body, keep text */
      }
      const debugId = res.headers.get("paypal-debug-id") ?? undefined;
      audit(
        "paypal_request",
        `${method} ${path} -> ${res.status}`,
        { method, path, status: res.status, debugId, ms: Date.now() - started, attempt },
        opts.caseId,
      );
      if (res.status === 401) token = undefined;
      if ((res.status === 429 || res.status >= 500 || res.status === 401) && attempt < attempts) {
        await sleep(400 * 2 ** (attempt - 1));
        continue;
      }
      if (!res.ok) {
        const issue = parsed?.details?.[0]?.issue ?? parsed?.name ?? "UNKNOWN";
        throw new PayPalError(`PayPal returned ${res.status} (${issue})`, res.status, parsed, debugId);
      }
      return { status: res.status, body: parsed as T, debugId };
    } catch (err) {
      if (err instanceof PayPalError) throw err;
      lastError = err; // network error, retry
      if (attempt < attempts) await sleep(400 * 2 ** (attempt - 1));
    }
  }
  throw new PayPalError(`Network error talking to PayPal: ${String(lastError)}`, 0, null);
}
