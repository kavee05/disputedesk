"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { approveAction, rejectAction, type ActionState } from "@/app/actions";
import { BUTTON_BASE, BUTTON_STYLES, Result } from "./action-button";

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
      <div className="mt-2 rounded-lg border border-rule-strong bg-surface focus-within:border-sky focus-within:ring-2 focus-within:ring-sky/15">
        <textarea
          id={`draft-${runId}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          readOnly={!editable || pending}
          rows={Math.min(14, Math.max(5, Math.ceil(text.length / 75)))}
          className="block w-full resize-y rounded-t-lg bg-transparent p-3.5 text-[0.92rem] leading-relaxed outline-none read-only:bg-paper/60"
        />
        <div className="flex items-center justify-between gap-3 border-t border-rule px-3.5 py-2 text-xs">
          <span className="text-muted">{editable ? (text !== initial ? "Edited. Your version is what gets sent." : "You can edit this before sending.") : "Read only"}</span>
          <span className={`num ${tooLong ? "font-semibold text-chili" : "text-faint"}`}>{text.length} / 2000</span>
        </div>
      </div>
      {editable && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={pending || tooLong || text.trim().length === 0}
            onClick={() => start(async () => setResult(await approveAction(runId, caseId, text)))}
            className={`${BUTTON_BASE} ${BUTTON_STYLES.primary}`}
          >
            {pending ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
            {pending ? "Sending to PayPal" : copy.button}
          </button>
          <button type="button" disabled={pending} onClick={() => start(async () => setResult(await rejectAction(runId)))} className={`${BUTTON_BASE} ${BUTTON_STYLES.secondary}`}>
            <X className="h-4 w-4" aria-hidden />
            Reject
          </button>
        </div>
      )}
      <div className="mt-2">
        <Result state={result} />
      </div>
    </div>
  );
}
