// Shared helpers for the Phase 0 sandbox probes.
// Rules: sandbox only, never print the token or client secret, save every
// raw response under results/ (gitignored) so FEASIBILITY.md cites real calls.
import { config } from "dotenv";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Same precedence as Next.js: .env.local wins over .env. Both are gitignored.
config({ path: [".env.local", ".env"], quiet: true });

const here = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(here, "results");
const STATE_FILE = join(here, ".state.json");
export const BASE_URL = "https://api-m.sandbox.paypal.com";

export function requireEnv() {
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENV } = process.env;
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    console.error("Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET in .env.local. See .env.example.");
    process.exit(1);
  }
  if (PAYPAL_ENV !== "sandbox") {
    console.error('PAYPAL_ENV must be "sandbox". These probes never touch live PayPal.');
    process.exit(1);
  }
  return { clientId: PAYPAL_CLIENT_ID, clientSecret: PAYPAL_CLIENT_SECRET };
}

let cachedToken: string | undefined;

export async function getToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  const { clientId, clientSecret } = requireEnv();
  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const body = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error(`OAuth failed (${res.status}): ${JSON.stringify(redact(body))}`);
  cachedToken = body.access_token as string;
  return cachedToken;
}

export type ApiResult = { status: number; ok: boolean; body: any; debugId?: string };

// One call to the sandbox. `label` names the saved result file.
export async function api(
  label: string,
  method: string,
  path: string,
  opts: { json?: unknown; form?: FormData; headers?: Record<string, string> } = {},
): Promise<ApiResult> {
  const token = await getToken();
  const headers: Record<string, string> = { Authorization: `Bearer ${token}`, ...opts.headers };
  let body: BodyInit | undefined;
  if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.json);
  } else if (opts.form) {
    body = opts.form; // fetch sets the multipart boundary itself
  }
  const res = await fetch(`${BASE_URL}${path}`, { method, headers, body });
  const text = await res.text();
  let parsed: any = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* keep raw text */
  }
  const result: ApiResult = {
    status: res.status,
    ok: res.ok,
    body: parsed,
    debugId: res.headers.get("paypal-debug-id") ?? undefined,
  };
  save(label, { request: { method, path, json: opts.json ?? (opts.form ? "[multipart]" : undefined) }, response: result });
  console.log(`${method} ${path} -> ${res.status}${result.debugId ? ` (debug_id ${result.debugId})` : ""}`);
  return result;
}

const SECRET_KEYS = /token|secret|authorization|password/i;

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, SECRET_KEYS.test(k) ? "[redacted]" : redact(v)]),
    );
  }
  return value;
}

export function save(label: string, data: unknown) {
  mkdirSync(RESULTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(join(RESULTS_DIR, `${stamp}_${label}.json`), JSON.stringify(redact(data), null, 2));
}

// Local state shared between probes (order ids, capture ids, dispute ids).
export type CaseKey = "D1" | "D2" | "D3" | "D4" | "C1";
export type CaseState = {
  amount: string;
  item: string;
  orderId?: string;
  approveUrl?: string;
  captureId?: string;
  merchantId?: string;
  tracking?: { carrier: string; number: string };
  disputeId?: string;
};
export type State = { cases: Partial<Record<CaseKey, CaseState>> };

export function loadState(): State {
  return existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")) : { cases: {} };
}

export function saveState(state: State) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// HATEOAS link names on a dispute, normalised so "provide-evidence" and
// "provide_evidence" compare equal.
export function linkNames(resource: any): string[] {
  return ((resource?.links ?? []) as { rel: string }[]).map((l) => l.rel.toLowerCase().replace(/-/g, "_"));
}
