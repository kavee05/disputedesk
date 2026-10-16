import { desc, eq } from "drizzle-orm";
import { db, now } from "../db";
import { agentRuns, cases } from "../db/schema";
import type { PayPalDispute } from "../paypal/types";
import { normalizeDispute, type Case, type CaseSource } from "./model";

export function upsertCase(d: PayPalDispute, source: CaseSource, extra: Pick<Case, "confirmedRefunds" | "sandboxAdjudicated"> = {}): Case {
  const c = { ...normalizeDispute(d, source), ...extra };
  const row = { id: c.id, source, data: JSON.stringify(c), raw: JSON.stringify(d), syncedAt: now() };
  db()
    .insert(cases)
    .values(row)
    .onConflictDoUpdate({ target: cases.id, set: { data: row.data, raw: row.raw, syncedAt: row.syncedAt, source } })
    .run();
  return c;
}

export function getCase(id: string): (Case & { syncedAt: string }) | null {
  const row = db().select().from(cases).where(eq(cases.id, id)).get();
  return row ? { ...(JSON.parse(row.data) as Case), syncedAt: row.syncedAt } : null;
}

export function getRawDispute(id: string): PayPalDispute | null {
  const row = db().select({ raw: cases.raw }).from(cases).where(eq(cases.id, id)).get();
  return row ? (JSON.parse(row.raw) as PayPalDispute) : null;
}

export function listCases(): (Case & { syncedAt: string })[] {
  return db()
    .select()
    .from(cases)
    .all()
    .map((r) => ({ ...(JSON.parse(r.data) as Case), syncedAt: r.syncedAt }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function latestRunStatus(caseId: string) {
  return db()
    .select({ status: agentRuns.status, data: agentRuns.data })
    .from(agentRuns)
    .where(eq(agentRuns.caseId, caseId))
    .orderBy(desc(agentRuns.createdAt))
    .get();
}
