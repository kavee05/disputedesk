"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { savePolicyAction } from "@/app/actions";
import type { SellerPolicy } from "@/lib/agent/policy";
import { BUTTON_BASE, BUTTON_STYLES, Result } from "@/components/action-button";

const input =
  "w-full rounded-xl border border-rule-strong bg-well px-3.5 py-2.5 text-[0.92rem] outline-none transition focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand/10";

// A settings section: what it is on the left, the controls on the right.
// Headings are plain h2 elements (not fieldset legends, which browsers draw
// across the box border).
function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-b border-rule py-8 first:pt-0 last:border-0 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-10">
      <div>
        <h2 className="text-[1.05rem] font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div className="min-w-0 rounded-[20px] bg-surface shadow-[var(--shadow-soft)] ring-1 ring-rule/70">{children}</div>
    </section>
  );
}

function SwitchRow({ name, label, hint, defaultChecked }: { name: string; label: string; hint: string; defaultChecked: boolean }) {
  const id = `sw-${name}`;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4 last:border-0">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block font-medium">{label}</span>
        <span className="block text-sm text-muted">{hint}</span>
      </label>
      <input id={id} type="checkbox" role="switch" name={name} defaultChecked={defaultChecked} className="switch mt-0.5" />
    </div>
  );
}

function NumberField({ name, label, hint, unit, ...rest }: { name: string; label: string; hint: string; unit: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block min-w-0">
      <span className="block font-medium">{label}</span>
      <span className="block text-sm text-muted">{hint}</span>
      <span className="mt-2 flex items-stretch">
        <input name={name} type="number" className={`${input} rounded-r-none`} {...rest} />
        <span className="flex items-center rounded-r-xl border border-l-0 border-rule-strong bg-surface px-3.5 text-sm text-muted">{unit}</span>
      </span>
    </label>
  );
}

export function PolicyForm({ policy, reasons }: { policy: SellerPolicy; reasons: [string, string][] }) {
  const [state, action, pending] = useActionState(savePolicyAction, null);
  return (
    <form action={action} className="max-w-5xl pb-4">
      <Section title="When the agent may act alone" description="Cases inside every limit here are handled without waiting for you. Everything else comes to you first.">
        <SwitchRow name="autoActEnabled" label="Let the agent act on its own" hint="When off, every step waits for your approval." defaultChecked={policy.autoActEnabled} />
        <div className="grid gap-5 border-b border-rule px-5 py-4 sm:grid-cols-2">
          <NumberField name="autoActLimit" label="Auto-act limit" hint="Larger disputes always wait for you." unit="USD" min={0} step="1" defaultValue={policy.autoActLimit} />
          <NumberField
            name="minConfidence"
            label="Minimum confidence"
            hint="Below this, the agent asks you first."
            unit="%"
            min={0}
            max={100}
            step="5"
            defaultValue={Math.round(policy.minConfidence * 100)}
          />
        </div>
        <SwitchRow name="allowAutoFight" label="Submit evidence automatically" hint="Lets the agent send evidence or a reply when the case is clear." defaultChecked={policy.allowAutoFight} />
        <SwitchRow name="allowAutoRefund" label="Refund automatically" hint="Lets the agent accept small claims it cannot win." defaultChecked={policy.allowAutoRefund} />
      </Section>

      <Section title="Never act alone on these" description="Dispute reasons that always come to you, whatever the amount or confidence.">
        <div className="grid gap-x-6 gap-y-1 p-3 sm:grid-cols-2">
          {reasons.map(([code, label]) => (
            <label key={code} className="flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-well">
              <input type="checkbox" name="neverAutoReasons" value={code} defaultChecked={policy.neverAutoReasons.includes(code)} className="h-4 w-4 shrink-0 accent-[#5b4fe9]" />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Your numbers" description="Used to weigh fighting against refunding, and for the hours-saved estimate.">
        <div className="grid gap-5 border-b border-rule px-5 py-4 sm:grid-cols-2">
          <NumberField name="hourlyValue" label="Your time, per hour" hint="What an hour of your time is worth." unit="USD" min={0} step="1" defaultValue={policy.hourlyValue} />
          <NumberField name="hoursPerDispute" label="Time a dispute takes by hand" hint="Used for the hours-saved estimate." unit="hours" min={0} step="0.25" defaultValue={policy.hoursPerDispute} />
        </div>
        <label className="block px-5 py-4">
          <span className="block font-medium">Your shipping and returns policy</span>
          <span className="block text-sm text-muted">The agent may cite this as your own policy. It is never presented as a PayPal record.</span>
          <textarea name="storePolicy" rows={4} maxLength={2000} defaultValue={policy.storePolicy} className={`${input} mt-2 resize-y`} />
        </label>
      </Section>

      <div className="sticky bottom-0 z-10 -mx-4 mt-2 flex flex-wrap items-center gap-4 border-t border-rule bg-surface px-4 py-3.5 shadow-[0_-10px_30px_-12px_rgba(17,26,58,0.14)] sm:mx-0 sm:rounded-t-[20px] sm:border-0 sm:px-5 sm:ring-1 sm:ring-rule/70">
        <button type="submit" disabled={pending} className={`${BUTTON_BASE} ${BUTTON_STYLES.primary}`}>
          <Save className="h-4 w-4" aria-hidden />
          {pending ? "Saving" : "Save policy"}
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}
