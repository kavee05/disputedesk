"use client";

import { useState, useTransition } from "react";
import { approveAction, rejectAction, type ActionState } from "@/app/actions";
import { Result } from "./action-button";

const ACTION_COPY: Record<string, { button: string; explain: string }> = {
  provide_evidence: { button: "Approve and submit evidence", explain: "This text goes to PayPal as your evidence statement (type OTHER, the only type the sandbox accepts)." },
  send_message: { button: "Approve and send message", explain: "PayPal does not take formal evidence at this stage, so this goes to the buyer as a message through PayPal." },
  accept_claim: { button: "Approve and refund", explain: "This accepts the claim and refunds the buyer in full. The note goes with it." },
};

export function DraftEditor({
  runId,
  caseId,
  action,
  initial,
  editable,
}: {
  runId: string;
  caseId: string;
  action: string;
  initial: string;
  editable: boolean;
}) {
  const [text, setText] = useState(initial);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionState>(null);
  const copy = ACTION_COPY[action] ?? { button: "Approve", explain: "" };
  const tooLong = text.length > 2000;

  return (
    <div>
      <label htmlFor={`draft-${runId}`} className="text-sm text-muted">
        {copy.explain}
      </label>
      <textarea
        id={`draft-${runId}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        readOnly={!editable || pending}
        rows={Math.min(14, Math.max(5, Math.ceil(text.length / 70)))}
        className="mt-2 w-full resize-y rounded-md border border-rule-strong bg-surface p-3 text-[0.95rem] leading-relaxed read-only:bg-paper/60"
      />
      <p className={`mt-1 text-right text-xs ${tooLong ? "text-chili" : "text-muted"}`}>{text.length} / 2000</p>
      {editable && (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={pending || tooLong || text.trim().length === 0}
            onClick={() => start(async () => setResult(await approveAction(runId, caseId, text)))}
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink px-4 py-2 font-bold text-white hover:bg-ink-soft disabled:opacity-60"
          >
            {pending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
            {pending ? "Sending to PayPal" : copy.button}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => start(async () => setResult(await rejectAction(runId)))}
            className="min-h-10 rounded-md border border-rule-strong bg-surface px-4 py-2 font-bold text-ink hover:border-ink disabled:opacity-60"
          >
            Reject
          </button>
          {text !== initial && <span className="text-sm text-muted">You edited the draft. Your version is what gets sent.</span>}
        </div>
      )}
      <div className="mt-2">
        <Result state={result} />
      </div>
    </div>
  );
}
