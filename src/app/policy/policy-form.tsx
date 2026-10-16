"use client";

import { useActionState } from "react";
import { savePolicyAction } from "@/app/actions";
import type { SellerPolicy } from "@/lib/agent/policy";
import { Result } from "@/components/action-button";

const field = "mt-1 w-full rounded-md border border-rule-strong bg-surface px-3 py-2 text-[0.95rem]";

function Toggle({ name, label, hint, defaultChecked }: { name: string; label: string; hint: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 h-5 w-5 shrink-0 accent-[#1f2a5c]" />
      <span>
        <span className="font-bold">{label}</span>
        <span className="block text-sm text-muted">{hint}</span>
      </span>
    </label>
  );
}

export function PolicyForm({ policy, reasons }: { policy: SellerPolicy; reasons: [string, string][] }) {
  const [state, action, pending] = useActionState(savePolicyAction, null);
  return (
    <form action={action} className="grid max-w-3xl gap-6">
      <fieldset className="rounded-lg border border-rule bg-surface p-5">
        <legend className="px-1 font-[family-name:var(--font-display)] text-xl font-bold">When the agent may act alone</legend>
        <div className="mt-2 grid gap-4">
          <Toggle name="autoActEnabled" label="Let the agent act on its own" hint="When off, every step waits for your approval." defaultChecked={policy.autoActEnabled} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="font-bold">Auto-act limit (USD)</span>
              <span className="block text-sm text-muted">Disputes above this amount always wait for you.</span>
              <input name="autoActLimit" type="number" min={0} step="1" defaultValue={policy.autoActLimit} className={field} />
            </label>
            <label className="block">
              <span className="font-bold">Minimum confidence (%)</span>
              <span className="block text-sm text-muted">Below this, the agent asks you first.</span>
              <input name="minConfidence" type="number" min={0} max={100} step="5" defaultValue={Math.round(policy.minConfidence * 100)} className={field} />
            </label>
          </div>
          <Toggle name="allowAutoFight" label="Submit evidence automatically" hint="Lets the agent send evidence or a reply when the case is clear." defaultChecked={policy.allowAutoFight} />
          <Toggle name="allowAutoRefund" label="Refund automatically" hint="Lets the agent accept small claims it cannot win." defaultChecked={policy.allowAutoRefund} />
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-rule bg-surface p-5">
        <legend className="px-1 font-[family-name:var(--font-display)] text-xl font-bold">Never act alone on these</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {reasons.map(([code, label]) => (
            <label key={code} className="flex cursor-pointer items-center gap-2.5">
              <input type="checkbox" name="neverAutoReasons" value={code} defaultChecked={policy.neverAutoReasons.includes(code)} className="h-4 w-4 accent-[#1f2a5c]" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-rule bg-surface p-5">
        <legend className="px-1 font-[family-name:var(--font-display)] text-xl font-bold">Your numbers</legend>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="font-bold">Your time, per hour (USD)</span>
            <span className="block text-sm text-muted">Used to weigh fighting against refunding.</span>
            <input name="hourlyValue" type="number" min={0} step="1" defaultValue={policy.hourlyValue} className={field} />
          </label>
          <label className="block">
            <span className="font-bold">Hours a dispute takes by hand</span>
            <span className="block text-sm text-muted">Used for the hours-saved estimate.</span>
            <input name="hoursPerDispute" type="number" min={0} step="0.25" defaultValue={policy.hoursPerDispute} className={field} />
          </label>
        </div>
        <label className="mt-4 block">
          <span className="font-bold">Your shipping and returns policy</span>
          <span className="block text-sm text-muted">The agent may cite this as your own policy. It is never presented as a PayPal record.</span>
          <textarea name="storePolicy" rows={4} maxLength={2000} defaultValue={policy.storePolicy} className={field} />
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="min-h-10 rounded-md bg-ink px-5 py-2 font-bold text-white hover:bg-ink-soft disabled:opacity-60">
          {pending ? "Saving" : "Save policy"}
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}
