import { audit } from "../audit";
import { now } from "../db";
import { refreshCase } from "../cases/sync";
import { scrubPersonalData } from "../evidence/redact";
import { paypal, PayPalError } from "../paypal";
import { AGENT_ACTIONS, linkNames, type AllowedAction } from "../paypal/types";
import { getRun, saveRun, type AgentRun } from "./runs";

// Step 4: the Executor. The only code that changes a dispute at PayPal.
// - Runs only for an AUTO gate decision or an explicit seller approval.
// - Only actions in a fixed allowlist, with payloads built here, not by the AI.
// - GETs the dispute first and refuses if PayPal no longer offers the action.
// - Records PayPal's response verbatim. It never records an outcome itself:
//   a 200 means "PayPal accepted the step", and the case status still comes
//   from the next GET.

export class ExecutorRefusal extends Error {}

const MAX_TEXT = 2000;

// Internal evidence ids like "(E4)" or "[E1, E3]" mean nothing to PayPal.
export function stripCitations(text: string): string {
  return text
    .replace(/\s*[([]\s*E\d+(?:\s*[,;&]\s*E\d+)*\s*[)\]]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function buildPayload(action: AllowedAction, text: string, amount: { value: number; currency: string }): unknown {
  const clean = scrubPersonalData(stripCitations(text)).slice(0, MAX_TEXT);
  switch (action) {
    case "provide_evidence":
      // The sandbox only accepts OTHER (PROOF_OF_FULFILLMENT is rejected with
      // EVIDENCE_TYPE_IS_NOT_ALLOWED), so tracking facts travel in the notes.
      return { evidences: [{ evidence_type: "OTHER", notes: clean }] };
    case "send_message":
      return { message: clean };
    case "accept_claim":
      return { note: clean || "Refunding the buyer in full.", accept_claim_type: "REFUND" };
    case "make_offer":
      return { note: clean, offer_amount: { currency_code: amount.currency, value: amount.value.toFixed(2) }, offer_type: "REFUND" };
    default:
      throw new ExecutorRefusal(`Action ${action} is not something the agent may send.`);
  }
}

export async function executeRun(runId: string, by: "policy" | "seller", editedText?: string): Promise<AgentRun> {
  const run = getRun(runId);
  if (!run) throw new ExecutorRefusal("Run not found");
  if (run.status === "submitted") throw new ExecutorRefusal("This step was already sent to PayPal.");
  if (by === "policy" && run.data.gate.decision !== "AUTO") throw new ExecutorRefusal("The policy gate did not allow an automatic action.");
  if (run.status !== "awaiting_approval" && !(by === "policy" && run.data.gate.decision === "AUTO")) {
    throw new ExecutorRefusal(`This run is ${run.status} and cannot be sent.`);
  }
  const action = run.data.plan.action;
  if (!action || !(AGENT_ACTIONS as readonly string[]).includes(action)) {
    audit("guardrail", `Executor refused action ${String(action)}: not in the allowlist`, { runId, action }, run.caseId);
    throw new ExecutorRefusal("That action is not on the allowlist.");
  }

  // Fresh GET right before acting.
  const dispute = await paypal().getDispute(run.caseId);
  if (!linkNames(dispute).includes(action)) {
    audit("guardrail", `Executor stopped: PayPal no longer offers ${action}`, { runId, links: linkNames(dispute), status: dispute.status }, run.caseId);
    run.status = "blocked";
    run.data.gate = { decision: "BLOCKED", reasons: [`PayPal no longer offers "${action}" for this dispute (status ${dispute.status}).`] };
    saveRun(run);
    await refreshCase(run.caseId);
    return run;
  }

  const text = editedText ?? run.draftText;
  const edited = editedText !== undefined && editedText !== run.draftText;
  const payload = buildPayload(action, text, { value: Number(dispute.dispute_amount.value), currency: dispute.dispute_amount.currency_code });
  audit("paypal_request", `Sending ${action} to PayPal (${by === "policy" ? "automatic, within policy" : "approved by seller"})`, { runId, action, payload }, run.caseId);

  try {
    const res = await paypal().act(run.caseId, action, payload, run.caseId);
    run.status = "submitted";
    run.draftText = text;
    run.data.execution = { at: now(), by, action, edited, response: { status: res.status, body: res.body, debugId: res.debugId } };
    audit("paypal_response", `PayPal accepted ${action} (HTTP ${res.status})`, { runId, response: res }, run.caseId);
  } catch (err) {
    const e = err instanceof PayPalError ? err : new PayPalError((err as Error).message, 0, null);
    run.status = "failed";
    run.data.execution = { at: now(), by, action, edited, error: { message: e.message, status: e.status, body: e.body, debugId: e.debugId } };
    audit("paypal_response", `PayPal rejected ${action}: ${e.message}`, { runId, status: e.status, body: e.body, debugId: e.debugId }, run.caseId);
  }
  saveRun(run);
  await refreshCase(run.caseId).catch(() => undefined);
  return run;
}

export function rejectRun(runId: string): AgentRun {
  const run = getRun(runId);
  if (!run) throw new ExecutorRefusal("Run not found");
  if (run.status === "submitted") throw new ExecutorRefusal("Already sent to PayPal.");
  run.status = "rejected";
  saveRun(run);
  audit("seller_action", "Seller rejected the agent's proposal", { runId }, run.caseId);
  return run;
}

// Sandbox-only stand-in for PayPal's own decision. Never called by the agent.
// Labelled "Sandbox adjudication" wherever its result is shown.
export async function sandboxAdjudicate(caseId: string, outcome: "SELLER_FAVOR" | "BUYER_FAVOR") {
  const dispute = await paypal().getDispute(caseId);
  if (!linkNames(dispute).includes("adjudicate")) {
    throw new ExecutorRefusal("PayPal does not offer adjudication on this case yet. In the sandbox it appears 20 to 30 minutes after evidence is submitted.");
  }
  try {
    const res = await paypal().act(caseId, "adjudicate", { adjudication_outcome: outcome }, caseId);
    audit("paypal_response", `Sandbox adjudication ${outcome} accepted (HTTP ${res.status})`, { sandboxAdjudication: true, outcome, response: res }, caseId);
  } catch (err) {
    const e = err as PayPalError;
    audit("paypal_response", `Sandbox adjudication rejected: ${e.message}`, { sandboxAdjudication: true, outcome, status: e.status, body: e.body }, caseId);
    throw err;
  }
  return refreshCase(caseId);
}
