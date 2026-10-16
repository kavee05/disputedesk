import { desc, eq } from "drizzle-orm";
import { db, now } from "../db";
import { agentRuns } from "../db/schema";
import type { AllowedAction } from "../paypal/types";
import type { ExpectedValue } from "./ev";
import type { GateDecision } from "./policy";
import type { AnalystOutput, WriterOutput } from "./steps";

export type RunStatus =
  | "awaiting_approval" // gate said NEEDS_APPROVAL
  | "needs_decision" // agent said ESCALATE, the seller picks a direction
  | "blocked" // PayPal offers no matching action right now
  | "submitted" // PayPal accepted the action (200). Not an outcome.
  | "failed" // PayPal rejected the action
  | "rejected"; // the seller said no

export type RunData = {
  provider: { name: string; label: string; model: string; offline: boolean };
  analyst: AnalystOutput;
  ev: ExpectedValue;
  writer?: WriterOutput;
  verification: { unknownIds: string[]; unsupported: string[] };
  plan: { action: AllowedAction | null; purpose: "evidence" | "message" | "refund_note" | null; linkAvailable: boolean };
  gate: GateDecision;
  overrideFrom?: string;
  execution?: {
    at: string;
    by: "policy" | "seller";
    action: AllowedAction;
    edited: boolean;
    response?: { status: number; body: unknown; debugId?: string };
    error?: { message: string; status: number; body: unknown; debugId?: string };
  };
};

export type AgentRun = { id: string; caseId: string; createdAt: string; updatedAt: string; status: RunStatus; draftText: string; data: RunData };

export function saveRun(r: AgentRun) {
  const row = {
    id: r.id,
    caseId: r.caseId,
    createdAt: r.createdAt,
    provider: r.data.provider.name,
    model: r.data.provider.model,
    data: JSON.stringify(r.data),
    status: r.status,
    draftText: r.draftText,
    updatedAt: now(),
  };
  db()
    .insert(agentRuns)
    .values(row)
    .onConflictDoUpdate({ target: agentRuns.id, set: { data: row.data, status: row.status, draftText: row.draftText, updatedAt: row.updatedAt } })
    .run();
}

const toRun = (r: typeof agentRuns.$inferSelect): AgentRun => ({
  id: r.id,
  caseId: r.caseId,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  status: r.status as RunStatus,
  draftText: r.draftText,
  data: JSON.parse(r.data),
});

export function getRun(id: string): AgentRun | null {
  const r = db().select().from(agentRuns).where(eq(agentRuns.id, id)).get();
  return r ? toRun(r) : null;
}

export function latestRun(caseId: string): AgentRun | null {
  const r = db().select().from(agentRuns).where(eq(agentRuns.caseId, caseId)).orderBy(desc(agentRuns.createdAt)).get();
  return r ? toRun(r) : null;
}

export function listRuns(): AgentRun[] {
  return db().select().from(agentRuns).orderBy(desc(agentRuns.createdAt)).all().map(toRun);
}
