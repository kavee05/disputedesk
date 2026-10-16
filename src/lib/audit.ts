import { desc, eq } from "drizzle-orm";
import { db, now } from "./db";
import { auditLog } from "./db/schema";

export type AuditKind =
  | "paypal_request" // every call we make to PayPal (method, path, status)
  | "paypal_response" // verbatim response body for actions
  | "agent_decision" // analyst and writer output
  | "policy_gate" // deterministic gate decision
  | "seller_action" // approve, reject, edit, policy change
  | "guardrail" // something was blocked
  | "system";

const SECRET_KEYS = /token|secret|authorization|password|client_id|api[-_]?key/i;

// Strip anything that looks like a credential before it is stored.
export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        SECRET_KEYS.test(k) ? "[redacted]" : redactSecrets(v),
      ]),
    );
  }
  return value;
}

export function audit(kind: AuditKind, summary: string, data: unknown = {}, caseId?: string) {
  db()
    .insert(auditLog)
    .values({ at: now(), caseId: caseId ?? null, kind, summary, data: JSON.stringify(redactSecrets(data)) })
    .run();
}

export type AuditEntry = { id: number; at: string; caseId: string | null; kind: AuditKind; summary: string; data: unknown };

export function listAudit(opts: { caseId?: string; limit?: number } = {}): AuditEntry[] {
  const q = db().select().from(auditLog);
  const rows = (opts.caseId ? q.where(eq(auditLog.caseId, opts.caseId)) : q)
    .orderBy(desc(auditLog.id))
    .limit(opts.limit ?? 300)
    .all();
  return rows.map((r) => ({ ...r, kind: r.kind as AuditKind, data: JSON.parse(r.data) }));
}
