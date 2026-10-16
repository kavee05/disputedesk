import { randomUUID } from "node:crypto";
import { audit } from "../audit";
import { now } from "../db";
import type { Case } from "../cases/model";
import { refreshCase } from "../cases/sync";
import { collectEvidence, type EvidenceBundle } from "../evidence/collect";
import type { AllowedAction } from "../paypal/types";
import { expectedValue } from "./ev";
import { executeRun, stripCitations } from "./executor";
import { llm } from "./llm";
import { offlineAnalyst, offlineWriter } from "./offline";
import { getPolicy, policyGate, type Recommendation } from "./policy";
import { saveRun, type AgentRun, type RunData } from "./runs";
import { runAnalyst, runWriter, type WriterOutput } from "./steps";

// Picks the PayPal action for a recommendation from what PayPal offers now.
// Pure code, so the model can never choose an action.
export function planAction(rec: Recommendation, links: string[]): RunData["plan"] {
  const has = (l: string) => links.includes(l);
  if (rec === "FIGHT") {
    if (has("provide_evidence")) return { action: "provide_evidence", purpose: "evidence", linkAvailable: true };
    if (has("send_message")) return { action: "send_message", purpose: "message", linkAvailable: true };
    return { action: "provide_evidence", purpose: "evidence", linkAvailable: false };
  }
  if (rec === "REFUND") return { action: "accept_claim", purpose: "refund_note", linkAvailable: has("accept_claim") };
  return { action: null, purpose: null, linkAvailable: false };
}

// Writer citations are checked against the bundle. Unknown ids or claims with
// no evidence are surfaced and push the case to human approval.
export function verifyCitations(w: WriterOutput, b: EvidenceBundle) {
  const known = new Set(b.items.map((i) => i.id));
  const unknownIds = [...new Set(w.statements.flatMap((s) => s.evidence_ids).filter((id) => !known.has(id)))];
  const unsupported = w.statements.filter((s) => s.evidence_ids.length === 0 || s.evidence_ids.some((id) => !known.has(id))).map((s) => s.text);
  return { unknownIds, unsupported };
}

export async function runPipeline(caseId: string, opts: { override?: Recommendation } = {}): Promise<AgentRun> {
  const c: Case = await refreshCase(caseId);
  const policy = getPolicy();
  const bundle = await collectEvidence(c, policy.storePolicy);
  const ai = llm();
  const provider = ai
    ? { name: ai.name, label: ai.label, model: "", offline: false }
    : { name: "offline", label: "Offline rules (no AI key)", model: "rules-v1", offline: true };

  // Step 1: Case Analyst
  let analyst;
  if (ai) {
    const r = await runAnalyst(ai, c, bundle);
    analyst = r.data;
    provider.model = r.model;
  } else {
    analyst = offlineAnalyst(c, bundle);
  }
  const ev = expectedValue(analyst.win_probability, c.amount, policy.hourlyValue);
  const recommendation = opts.override ?? analyst.recommendation;
  audit(
    "agent_decision",
    `Case Analyst: ${analyst.recommendation} (win ${Math.round(analyst.win_probability * 100)}%, confidence ${Math.round(analyst.confidence * 100)}%)${opts.override ? `, seller chose ${opts.override}` : ""}`,
    { provider, analyst, ev },
    c.id,
  );
  if (analyst.injection_detected) {
    audit("guardrail", "Buyer message tried to instruct the agent. Treated as data only.", { note: analyst.injection_note }, c.id);
  }

  // Step 2: Evidence Writer (skipped when a human must choose the direction)
  const plan = planAction(recommendation, c.links);
  let writer: WriterOutput | undefined;
  let verification = { unknownIds: [] as string[], unsupported: [] as string[] };
  if (plan.purpose) {
    writer = ai ? (await runWriter(ai, c, bundle, analyst, plan.purpose)).data : offlineWriter(c, bundle, plan.purpose);
    writer = { ...writer, response_text: stripCitations(writer.response_text) };
    verification = verifyCitations(writer, bundle);
    audit("agent_decision", `Evidence Writer drafted a ${plan.purpose.replace("_", " ")} (${writer.statements.length} cited statements)`, { writer, verification }, c.id);
  }

  // Step 3: Policy Gate (deterministic)
  const gate = policyGate(
    {
      recommendation,
      confidence: analyst.confidence,
      amount: c.amount,
      reason: c.reason,
      plannedAction: plan.action as AllowedAction | null,
      linkAvailable: plan.linkAvailable,
      unsupportedClaims: verification.unsupported.length,
      injectionSuspected: analyst.injection_detected,
    },
    policy,
  );
  audit("policy_gate", `Policy Gate: ${gate.decision}`, gate, c.id);

  const run: AgentRun = {
    id: randomUUID(),
    caseId: c.id,
    createdAt: now(),
    updatedAt: now(),
    status: recommendation === "ESCALATE" ? "needs_decision" : gate.decision === "BLOCKED" ? "blocked" : "awaiting_approval",
    draftText: writer?.response_text ?? "",
    data: { provider, analyst, ev, writer, verification, plan, gate, overrideFrom: opts.override ? analyst.recommendation : undefined },
  };
  saveRun(run);

  // Step 4: Executor, only if the gate allows acting alone.
  if (gate.decision === "AUTO" && !opts.override) return executeRun(run.id, "policy");
  return run;
}
