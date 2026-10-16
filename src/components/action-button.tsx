"use client";

import { useState, useTransition } from "react";
import type { ActionState } from "@/app/actions";

type Variant = "primary" | "secondary" | "danger" | "quiet";

const STYLES: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-ink-soft",
  secondary: "border border-rule-strong bg-surface text-ink hover:border-ink",
  danger: "border border-chili/40 bg-surface text-chili hover:bg-chili-soft",
  quiet: "text-ink-soft underline underline-offset-4 hover:text-ink",
};

// A button that runs a server action and reports what happened, in place.
export function ActionButton({
  action,
  children,
  pendingLabel,
  pendingHint,
  variant = "secondary",
  confirm,
}: {
  action: () => Promise<ActionState>;
  children: React.ReactNode;
  pendingLabel?: string;
  pendingHint?: string;
  variant?: Variant;
  confirm?: string;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionState>(null);
  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          setResult(null);
          start(async () => setResult(await action()));
        }}
        className={`inline-flex min-h-10 items-center gap-2 rounded-md px-4 py-2 text-[0.95rem] font-bold transition-colors disabled:cursor-wait disabled:opacity-70 ${STYLES[variant]}`}
      >
        {pending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
        {pending ? (pendingLabel ?? "Working") : children}
      </button>
      {pending && pendingHint && <p className="text-sm text-muted">{pendingHint}</p>}
      <Result state={result} />
    </div>
  );
}

export function Result({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p role="status" className={`max-w-[60ch] text-sm ${state.ok ? "text-pandan" : "text-chili"}`}>
      {state.message}
    </p>
  );
}
