"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { config } from "@/lib/config";
import { requireWrite, takeAgentSlot, PASSCODE_COOKIE } from "@/lib/app";
import { refreshCase, syncAllCases } from "@/lib/cases/sync";
import { paypalName } from "@/lib/paypal";
import { executeRun, rejectRun, sandboxAdjudicate } from "@/lib/agent/executor";
import { runPipeline } from "@/lib/agent/pipeline";
import { savePolicy, SellerPolicy, type Recommendation } from "@/lib/agent/policy";
import { resetLocalData, seedDemoCases } from "@/lib/demo/seed";
import { captureKitOrders, createKitOrders } from "@/lib/demo/kit";

export type ActionState = { ok: boolean; message: string } | null;

const fail = (err: unknown): ActionState => ({ ok: false, message: err instanceof Error ? err.message : String(err) });

export async function syncAction(): Promise<ActionState> {
  try {
    const r = await syncAllCases();
    revalidatePath("/", "layout");
    return { ok: r.errors.length === 0, message: r.errors.length ? `Synced with ${r.errors.length} errors: ${r.errors[0]}` : `Synced ${r.count} disputes.` };
  } catch (err) {
    return fail(err);
  }
}

export async function refreshCaseAction(caseId: string): Promise<ActionState> {
  try {
    await refreshCase(caseId);
    revalidatePath(`/cases/${caseId}`);
    return { ok: true, message: "Refreshed from PayPal." };
  } catch (err) {
    return fail(err);
  }
}

export async function runAgentAction(caseId: string, override?: Recommendation): Promise<ActionState> {
  try {
    await requireWrite();
    takeAgentSlot();
    const run = await runPipeline(caseId, { override });
    revalidatePath("/", "layout");
    const msg =
      run.status === "submitted"
        ? `The agent acted within your policy. ${paypalName()} accepted the step.`
        : run.status === "failed"
          ? `${paypalName()} rejected the step. See the details below.`
          : run.status === "awaiting_approval"
            ? "The agent drafted a response and is waiting for your approval."
            : run.status === "needs_decision"
              ? "The agent wants you to decide this one."
              : "PayPal does not offer a matching action right now.";
    return { ok: run.status !== "failed", message: msg };
  } catch (err) {
    return fail(err);
  }
}

export async function approveAction(runId: string, caseId: string, text: string): Promise<ActionState> {
  try {
    await requireWrite();
    audit("seller_action", "Seller approved the agent's proposal", { runId, edited: true }, caseId);
    const run = await executeRun(runId, "seller", text);
    revalidatePath("/", "layout");
    if (run.status === "submitted") return { ok: true, message: `Sent. ${paypalName()} accepted the step and is processing it.` };
    if (run.status === "blocked") return { ok: false, message: run.data.gate.reasons[0] ?? "PayPal no longer offers this action." };
    return { ok: false, message: run.data.execution?.error?.message ?? `${paypalName()} rejected the step.` };
  } catch (err) {
    return fail(err);
  }
}

export async function rejectAction(runId: string): Promise<ActionState> {
  try {
    await requireWrite();
    rejectRun(runId);
    revalidatePath("/", "layout");
    return { ok: true, message: "Rejected. Nothing was sent to PayPal." };
  } catch (err) {
    return fail(err);
  }
}

export async function adjudicateAction(caseId: string, outcome: "SELLER_FAVOR" | "BUYER_FAVOR"): Promise<ActionState> {
  try {
    await requireWrite();
    await sandboxAdjudicate(caseId, outcome);
    revalidatePath("/", "layout");
    return { ok: true, message: `${paypalName()} accepted the request. The decision usually shows within a few minutes.` };
  } catch (err) {
    return fail(err);
  }
}

export async function savePolicyAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requireWrite();
    const num = (k: string) => Number(form.get(k));
    const policy = SellerPolicy.parse({
      autoActEnabled: form.get("autoActEnabled") === "on",
      autoActLimit: num("autoActLimit"),
      minConfidence: num("minConfidence") / 100,
      neverAutoReasons: form.getAll("neverAutoReasons").map(String),
      allowAutoRefund: form.get("allowAutoRefund") === "on",
      allowAutoFight: form.get("allowAutoFight") === "on",
      hourlyValue: num("hourlyValue"),
      hoursPerDispute: num("hoursPerDispute"),
      storePolicy: String(form.get("storePolicy") ?? ""),
    });
    savePolicy(policy);
    audit("seller_action", "Seller updated the policy", policy);
    revalidatePath("/", "layout");
    return { ok: true, message: "Policy saved." };
  } catch (err) {
    return fail(err);
  }
}

export async function resetDemoAction(): Promise<ActionState> {
  try {
    await requireWrite();
    if (config.mode === "demo") {
      const n = seedDemoCases();
      revalidatePath("/", "layout");
      return { ok: true, message: `Reset done. ${n} fresh simulated cases are ready.` };
    }
    resetLocalData({ keepPolicy: true });
    const r = await syncAllCases();
    revalidatePath("/", "layout");
    return { ok: true, message: `Local history cleared and ${r.count} disputes reloaded from PayPal Sandbox. Nothing was changed at PayPal.` };
  } catch (err) {
    return fail(err);
  }
}

export async function createKitAction(): Promise<ActionState> {
  try {
    await requireWrite();
    if (config.mode !== "sandbox") return { ok: false, message: "Test orders need PayPal Sandbox keys. Demo mode uses the simulated set instead." };
    const orders = await createKitOrders();
    revalidatePath("/demo");
    return { ok: true, message: `Created ${orders.length} sandbox orders. Approve each one as your sandbox buyer.` };
  } catch (err) {
    return fail(err);
  }
}

export async function captureKitAction(): Promise<ActionState> {
  try {
    await requireWrite();
    const r = await captureKitOrders();
    revalidatePath("/demo");
    const problems = [...r.errors, ...r.pending];
    return problems.length
      ? { ok: false, message: `Captured ${r.captured}. Check these: ${problems.join("; ")}` }
      : { ok: true, message: `Captured ${r.captured}. All payments are complete, so you can open disputes on them now.` };
  } catch (err) {
    return fail(err);
  }
}

export async function unlockAction(_: ActionState, form: FormData): Promise<ActionState> {
  if (!config.adminPasscode) return { ok: true, message: "No passcode is needed here." };
  if (String(form.get("passcode")) !== config.adminPasscode) return { ok: false, message: "That passcode is not right." };
  (await cookies()).set(PASSCODE_COOKIE, config.adminPasscode, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 7 });
  revalidatePath("/", "layout");
  return { ok: true, message: "Unlocked for this browser." };
}
