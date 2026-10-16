"use client";

import { useActionState } from "react";
import { unlockAction } from "@/app/actions";
import { Result } from "@/components/action-button";
import { PageHeader } from "@/components/ui";

export default function UnlockPage() {
  const [state, action, pending] = useActionState(unlockAction, null);
  return (
    <>
      <PageHeader title="Unlock changes" intro="This deployment is read-only for visitors. Enter the passcode to run the agent, approve drafts or change the policy." />
      <form action={action} className="flex max-w-md flex-col gap-3">
        <label className="block">
          <span className="font-bold">Passcode</span>
          <input name="passcode" type="password" autoComplete="current-password" className="mt-1 w-full rounded-md border border-rule-strong bg-surface px-3 py-2" />
        </label>
        <button type="submit" disabled={pending} className="min-h-10 w-fit rounded-md bg-ink px-5 py-2 font-bold text-white disabled:opacity-60">
          {pending ? "Checking" : "Unlock"}
        </button>
        <Result state={state} />
      </form>
    </>
  );
}
