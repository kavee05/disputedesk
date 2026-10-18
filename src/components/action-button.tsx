"use client";

import { useState, useTransition } from "react";
import type { ActionState } from "@/app/actions";

type Variant = "primary" | "secondary" | "danger" | "quiet";

export const BUTTON_STYLES: Record<Variant, string> = {
  primary: "brand-gradient text-white shadow-[var(--shadow-brand)] hover:brightness-[1.06]",
  secondary: "bg-surface text-ink shadow-[var(--shadow-soft)] ring-1 ring-rule-strong/80 hover:ring-brand/40 hover:text-brand-ink",
  danger: "bg-surface text-chili ring-1 ring-chili/30 hover:bg-chili-soft",
  quiet: "px-2.5 text-muted hover:bg-well hover:text-ink",
};

export const BUTTON_BASE =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-[0.88rem] font-semibold transition-all duration-200 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 disabled:active:scale-100";

// A button that runs a server action and reports what happened, in place.
export function ActionButton({
  action,
  children,
  pendingLabel,
  pendingHint,
  variant = "secondary",
  confirm,
  icon,
}: {
  action: () => Promise<ActionState>;
  children: React.ReactNode;
  pendingLabel?: string;
  pendingHint?: string;
  variant?: Variant;
  confirm?: string;
  icon?: React.ReactNode;
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
        className={`${BUTTON_BASE} ${BUTTON_STYLES[variant]}`}
      >
        {pending ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : icon}
        {pending ? (pendingLabel ?? "Working") : children}
      </button>
      {pending && pendingHint && <p className="max-w-[46ch] text-[0.8rem] text-muted">{pendingHint}</p>}
      <Result state={result} />
    </div>
  );
}

export function Result({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p role="status" className={`max-w-[60ch] text-[0.85rem] ${state.ok ? "text-pandan" : "text-chili"}`}>
      {state.message}
    </p>
  );
}
