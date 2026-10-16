import { cookies } from "next/headers";
import { config } from "./config";
import type { Case } from "./cases/model";
import { listCases } from "./cases/repo";
import { deriveStatus } from "./cases/status";
import { seedDemoCases } from "./demo/seed";

// Small server helpers shared by pages and actions.

// Outcomes that come from the parties themselves, not from a PayPal decision.
const PARTY_OUTCOME_REASONS = new Set(["SELLER_ISSUED_REFUND", "CANCELED_BY_BUYER", "ACCEPTED_OFFER"]);

// Nobody at PayPal reviews sandbox cases, so a decided sandbox case can only
// have been settled by the sandbox-only adjudicate tool, whoever called it.
// Label all of those, not just the ones DisputeDesk adjudicated itself.
export function settledBySandboxTool(c: Case): boolean {
  if (c.sandboxAdjudicated) return true;
  if (c.source !== "sandbox" || !c.outcome) return false;
  return c.outcome.code !== "CANCELED_BY_BUYER" && !PARTY_OUTCOME_REASONS.has(c.outcome.reason ?? "");
}

export function statusOf(c: Case) {
  return deriveStatus(c, c.confirmedRefunds ?? [], { sandboxAdjudicated: settledBySandboxTool(c) });
}

// Demo mode seeds itself on first boot, so a fresh deploy is never empty.
export function ensureReady() {
  if (config.mode === "demo" && listCases().length === 0) seedDemoCases();
}

export const PASSCODE_COOKIE = "dd_passcode";

export async function canWrite(): Promise<boolean> {
  if (!config.adminPasscode) return true;
  const jar = await cookies();
  return jar.get(PASSCODE_COOKIE)?.value === config.adminPasscode;
}

export async function requireWrite() {
  if (!(await canWrite())) throw new Error("This deployment is read-only. Enter the passcode to make changes.");
}

// Keeps a public demo from burning through the AI quota.
const runTimes: number[] = [];
export function takeAgentSlot(limitPerHour = 60) {
  const cutoff = Date.now() - 3_600_000;
  while (runTimes.length && runTimes[0] < cutoff) runTimes.shift();
  if (runTimes.length >= limitPerHour) throw new Error("The agent has run a lot in the last hour. Please try again in a few minutes.");
  runTimes.push(Date.now());
}
