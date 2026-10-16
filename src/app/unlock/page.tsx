"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";
import { unlockAction } from "@/app/actions";
import { BUTTON_BASE, BUTTON_STYLES, Result } from "@/components/action-button";
import { PageHeader } from "@/components/ui";

export default function UnlockPage() {
  const [state, action, pending] = useActionState(unlockAction, null);
  return (
    <>
      <PageHeader title="Unlock changes" intro="This deployment is read-only for visitors. Enter the passcode to run the agent, approve drafts or change the policy." />
      <form action={action} className="flex max-w-md flex-col gap-4 rounded-xl border border-rule bg-surface p-5 shadow-[var(--shadow-panel)]">
        <label className="block">
          <span className="font-medium">Passcode</span>
          <input
            name="passcode"
            type="password"
            autoComplete="current-password"
            className="mt-1.5 w-full rounded-lg border border-rule-strong bg-surface px-3 py-2 outline-none focus:border-sky focus:ring-2 focus:ring-sky/15"
          />
        </label>
        <button type="submit" disabled={pending} className={`${BUTTON_BASE} ${BUTTON_STYLES.primary} w-fit`}>
          <Lock className="h-4 w-4" aria-hidden />
          {pending ? "Checking" : "Unlock"}
        </button>
        <Result state={state} />
      </form>
    </>
  );
}
