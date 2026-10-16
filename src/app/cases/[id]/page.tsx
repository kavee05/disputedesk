import Link from "next/link";
import { notFound } from "next/navigation";
import { adjudicateAction, refreshCaseAction, runAgentAction } from "@/app/actions";
import { statusOf } from "@/lib/app";
import { getCase } from "@/lib/cases/repo";
import { isOpen } from "@/lib/cases/status";
import { getEvidence, type EvidenceItem } from "@/lib/evidence/collect";
import { latestRun, type AgentRun } from "@/lib/agent/runs";
import { listAudit } from "@/lib/audit";
import { ActionButton } from "@/components/action-button";
import { AutoRefresh } from "@/components/auto-refresh";
import { DraftEditor } from "@/components/draft-editor";
import { Scale } from "@/components/scale";
import { AdjudicationBadge, dateTime, Deadline, money, shortDate, SourceBadge, StatusPill } from "@/components/ui";

const AGENT_HINT = "The agent is reading the evidence and drafting a response. This usually takes 15 to 45 seconds.";

const ACTION_LABEL: Record<string, string> = {
  provide_evidence: "Submit evidence",
  send_message: "Send a message",
  accept_claim: "Accept the claim and refund",
  make_offer: "Make an offer",
};

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = getCase(decodeURIComponent(id));
  if (!c) notFound();
  const status = statusOf(c);
  const run = latestRun(c.id);
  const evidence = getEvidence(c.id);
  const responses = listAudit({ caseId: c.id, limit: 50 }).filter((a) => a.kind === "paypal_response");
  const canAdjudicate = c.links.includes("adjudicate");

  return (
    <article>
      <p className="mb-3 text-sm">
        <Link href="/" className="text-ink-soft underline underline-offset-4 hover:text-ink">
          Back to disputes
        </Link>
      </p>

      <header className="mb-6 border-b border-rule pb-5">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>{c.reasonLabel}</span>
          <SourceBadge source={c.source} />
          {status.sandboxAdjudication && <AdjudicationBadge source={c.source} />}
          <span className="break-all">{c.id}</span>
        </div>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="max-w-[28ch] text-3xl font-extrabold md:text-[2.3rem]">{c.itemSummary ?? c.reasonLabel}</h1>
          <p className="num text-4xl font-extrabold">{money(c.amount, c.currency)}</p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <StatusPill status={status} />
          <span className="text-sm text-muted">{status.detail}</span>
        </div>
        {status.key === "processing" && (
          <div className="mt-2">
            <AutoRefresh caseId={c.id} />
          </div>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="agent-heading" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="agent-heading" className="text-2xl font-bold">
              How the agent sees it
            </h2>
            {run && isOpen(status) && run.status !== "awaiting_approval" && (
              <ActionButton action={runAgentAction.bind(null, c.id, undefined)} pendingLabel="Analysing" pendingHint={AGENT_HINT}>
                Run the agent again
              </ActionButton>
            )}
          </div>

          {!run ? (
            <div className="rounded-lg border border-rule bg-surface p-6">
              <p className="max-w-[60ch] text-ink-soft">
                The agent will gather the order, payment, tracking and messages from PayPal, weigh whether this is worth fighting, and draft
                a response. Nothing is sent to PayPal unless your policy allows it or you approve it.
              </p>
              <div className="mt-4">
                {isOpen(status) ? (
                  <ActionButton action={runAgentAction.bind(null, c.id, undefined)} variant="primary" pendingLabel="Analysing" pendingHint={AGENT_HINT}>
                    Run the agent
                  </ActionButton>
                ) : (
                  <p className="text-muted">This case is closed at PayPal, so there is nothing to do.</p>
                )}
              </div>
            </div>
          ) : (
            <AgentSteps run={run} caseId={c.id} currency={c.currency} evidence={evidence?.items ?? []} />
          )}
        </section>

        <aside className="flex min-w-0 flex-col gap-6" aria-label="PayPal record">
          <section className="rounded-lg border border-rule bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold">PayPal record</h2>
              <ActionButton action={refreshCaseAction.bind(null, c.id)} variant="quiet" pendingLabel="Refreshing">
                Refresh
              </ActionButton>
            </div>
            <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              <dt className="text-muted">Status</dt>
              <dd className="text-[0.8rem]">{c.paypalStatus.split("_").join("_​")}</dd>
              <dt className="text-muted">Stage</dt>
              <dd>{c.stage === "CHARGEBACK" ? "Claim" : c.stage === "INQUIRY" ? "Inquiry" : (c.stage ?? "Unknown")}</dd>
              <dt className="text-muted">Respond by</dt>
              <dd>
                <Deadline due={c.sellerResponseDue} open={status.key === "action"} />
              </dd>
              <dt className="text-muted">Opened</dt>
              <dd>{shortDate(c.createdAt)}</dd>
              {c.outcome && (
                <>
                  <dt className="text-muted">Outcome</dt>
                  <dd className="text-[0.8rem]">
                    {c.outcome.code.split("_").join("_​")}
                    {c.outcome.reason ? `, ${c.outcome.reason.split("_").join("_​")}` : ""}
                  </dd>
                </>
              )}
              {(c.confirmedRefunds ?? []).map((r) => (
                <div key={r.id} className="contents">
                  <dt className="text-muted">Refund</dt>
                  <dd className="break-all">
                    {r.id}: {r.status}
                  </dd>
                </div>
              ))}
              <dt className="text-muted">Allowed now</dt>
              <dd>{c.links.filter((l) => l !== "self").map((l) => l.replace(/_/g, " ")).join(", ") || "Nothing, PayPal is processing"}</dd>
            </dl>
            <p className="mt-3 text-xs text-muted">Last read from PayPal {dateTime(c.syncedAt)}.</p>
          </section>

          <section className="rounded-lg border border-rule bg-surface p-4">
            <h2 className="text-lg font-bold">Evidence timeline</h2>
            {evidence ? (
              <ol className="mt-3 flex flex-col gap-3 border-l-2 border-rule pl-4">
                {[...evidence.items]
                  .sort((a, b) => (a.at ?? "9999").localeCompare(b.at ?? "9999"))
                  .map((e) => (
                    <li key={e.id} className="relative text-sm">
                      <span className="absolute -left-[1.42rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-ink" aria-hidden />
                      <p className="font-bold">
                        <span className="mr-1.5 rounded bg-paper px-1 text-xs text-muted">{e.id}</span>
                        {e.title}
                      </p>
                      <p className={`mt-0.5 break-words ${e.untrusted ? "italic text-ink-soft" : "text-muted"}`}>
                        {e.untrusted ? `Buyer wrote: "${e.detail}"` : e.detail}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {e.at ? `${shortDate(e.at)}, ` : ""}
                        {e.source}
                      </p>
                    </li>
                  ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-muted">Run the agent to gather the order, payment, tracking and messages.</p>
            )}
            {evidence && evidence.gaps.length > 0 && (
              <div className="mt-4 rounded-md bg-turmeric-soft p-3 text-sm text-turmeric-ink">
                <p className="font-bold">Missing evidence</p>
                <ul className="mt-1 list-disc pl-5">
                  {evidence.gaps.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {(canAdjudicate || status.sandboxAdjudication) && (
            <section className="rounded-lg border border-sky/40 bg-sky-soft/50 p-4">
              <h2 className="text-lg font-bold">{c.source === "sandbox" ? "Sandbox adjudication" : "Simulated PayPal decision"}</h2>
              <p className="mt-1 text-sm text-ink-soft">
                {c.source === "sandbox"
                  ? "A sandbox-only PayPal tool that stands in for PayPal's own review, so the end of a case can be tested. It does not exist in live PayPal. Results are labelled as sandbox adjudication."
                  : "Stands in for PayPal's review in demo mode. The result is simulated and labelled that way."}
              </p>
              {canAdjudicate ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionButton action={adjudicateAction.bind(null, c.id, "SELLER_FAVOR")} pendingLabel="Asking PayPal" confirm="Ask PayPal to settle this case in the seller's favour? This closes the case.">
                    Decide for seller
                  </ActionButton>
                  <ActionButton action={adjudicateAction.bind(null, c.id, "BUYER_FAVOR")} variant="danger" pendingLabel="Asking PayPal" confirm="Ask PayPal to settle this case in the buyer's favour? This refunds the buyer and closes the case.">
                    Decide for buyer
                  </ActionButton>
                </div>
              ) : (
                <p className="mt-2 text-sm text-ink-soft">This case was settled this way.</p>
              )}
            </section>
          )}

          {responses.length > 0 && (
            <section className="rounded-lg border border-rule bg-surface p-4">
              <h2 className="text-lg font-bold">PayPal responses</h2>
              <ul className="mt-2 flex flex-col gap-2 text-sm">
                {responses.map((r) => (
                  <li key={r.id}>
                    <p>{r.summary}</p>
                    <p className="text-xs text-muted">{dateTime(r.at)}</p>
                  </li>
                ))}
              </ul>
              <Link href={`/audit?case=${encodeURIComponent(c.id)}`} className="mt-2 inline-block text-sm underline underline-offset-4">
                See full responses in the audit log
              </Link>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}

function Step({ n, title, children, tone = "default" }: { n: number; title: string; children: React.ReactNode; tone?: "default" | "warn" | "good" | "bad" }) {
  const border = tone === "warn" ? "border-turmeric/60" : tone === "good" ? "border-pandan/50" : tone === "bad" ? "border-chili/50" : "border-rule";
  return (
    <li className={`rounded-lg border ${border} bg-surface p-4 md:p-5`}>
      <h3 className="flex items-baseline gap-3 text-lg font-bold">
        <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm text-white">{n}</span>
        {title}
      </h3>
      <div className="mt-3 md:pl-10">{children}</div>
    </li>
  );
}

function Cite({ ids, items }: { ids: string[]; items: EvidenceItem[] }) {
  if (!ids.length) return <span className="ml-1 text-xs text-chili">no evidence cited</span>;
  return (
    <>
      {ids.map((id) => {
        const item = items.find((i) => i.id === id);
        return (
          <span key={id} title={item ? item.title : "Not in the evidence bundle"} className={`ml-1 rounded px-1 text-xs ${item ? "bg-paper text-muted" : "bg-chili-soft text-chili"}`}>
            {id}
          </span>
        );
      })}
    </>
  );
}

function AgentSteps({ run, caseId, currency, evidence }: { run: AgentRun; caseId: string; currency: string; evidence: EvidenceItem[] }) {
  const { analyst, ev, writer, verification, plan, gate, provider, execution } = run.data;
  const rec = analyst.recommendation;
  return (
    <ol className="flex flex-col gap-4">
      <Step n={1} title="Case Analyst">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>{provider.label}</span>
          {provider.offline && <span className="rounded border border-turmeric/50 bg-turmeric-soft px-1.5 py-px text-xs text-turmeric-ink">Not AI: simple rules</span>}
          <span>{dateTime(run.createdAt)}</span>
        </div>
        <p className="mt-3 text-lg">
          Recommends <strong>{rec === "FIGHT" ? "fighting" : rec === "REFUND" ? "refunding" : "that you decide"}</strong>
          {run.data.overrideFrom && <span className="text-muted"> (you chose this over the agent&apos;s {run.data.overrideFrom.toLowerCase()})</span>}.
        </p>
        <p className="text-muted">
          Win chance {Math.round(analyst.win_probability * 100)}%, confidence {Math.round(analyst.confidence * 100)}%.
        </p>
        <p className="mt-2 max-w-[68ch]">{analyst.summary}</p>
        {analyst.injection_detected && (
          <p className="mt-3 rounded-md bg-chili-soft p-3 text-sm text-chili">
            <strong>Ignored instructions in a buyer message.</strong> {analyst.injection_note || "A buyer message tried to tell the agent what to do."} Buyer text is
            treated as a claim to check, never as a command.
          </p>
        )}
        <ol className="mt-4 flex list-decimal flex-col gap-1.5 pl-5 text-[0.95rem]">
          {analyst.reasoning_steps.map((s, i) => (
            <li key={i}>
              {s.step}
              <Cite ids={s.evidence_ids} items={evidence} />
            </li>
          ))}
        </ol>
        <div className="mt-4">
          <Scale ev={ev} currency={currency} />
        </div>
      </Step>

      <Step n={2} title="Evidence Writer" tone={verification.unsupported.length ? "warn" : "default"}>
        {writer && plan.action ? (
          <>
            {writer.statements.length > 0 && (
              <details className="mb-3 text-sm">
                <summary className="cursor-pointer text-ink-soft">What the draft claims, and the evidence behind each claim</summary>
                <ul className="mt-2 flex flex-col gap-1 pl-4">
                  {writer.statements.map((s, i) => (
                    <li key={i} className="list-disc">
                      {s.text}
                      <Cite ids={s.evidence_ids} items={evidence} />
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {verification.unsupported.length > 0 && (
              <p className="mb-3 rounded-md bg-turmeric-soft p-3 text-sm text-turmeric-ink">
                {verification.unsupported.length} claim(s) are not backed by evidence. Check the draft before sending.
              </p>
            )}
            {writer.missing_evidence.length > 0 && <p className="mb-3 text-sm text-muted">Missing: {writer.missing_evidence.join("; ")}.</p>}
            <DraftEditor runId={run.id} caseId={caseId} action={plan.action} initial={run.draftText} editable={run.status === "awaiting_approval"} />
          </>
        ) : rec === "ESCALATE" ? (
          <div>
            <p className="text-ink-soft">No draft yet. The agent wants you to pick a direction first.</p>
            {run.status === "needs_decision" && (
              <div className="mt-3 flex flex-wrap gap-2">
                <ActionButton action={runAgentAction.bind(null, caseId, "FIGHT")} pendingLabel="Drafting" pendingHint={AGENT_HINT}>
                  Draft a response to fight
                </ActionButton>
                <ActionButton action={runAgentAction.bind(null, caseId, "REFUND")} pendingLabel="Drafting" pendingHint={AGENT_HINT}>
                  Draft a refund
                </ActionButton>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted">No draft, because PayPal does not offer an action for this recommendation right now.</p>
        )}
      </Step>

      <Step n={3} title="Policy Gate" tone={gate.decision === "AUTO" ? "good" : gate.decision === "BLOCKED" ? "bad" : "warn"}>
        <p className="text-sm text-muted">Plain code, not AI. It checks the plan against your policy.</p>
        <p className="mt-2 font-bold">
          {gate.decision === "AUTO"
            ? "Allowed to act on its own"
            : gate.decision === "BLOCKED"
              ? "Blocked"
              : execution?.by === "seller"
                ? "Needed your approval, and you gave it"
                : run.status === "rejected"
                  ? "Needed your approval, and you said no"
                  : "Needs your approval"}
        </p>
        <ul className="mt-1 list-disc pl-5 text-[0.95rem]">
          {gate.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <Link href="/policy" className="mt-2 inline-block text-sm underline underline-offset-4">
          Change your policy
        </Link>
      </Step>

      <Step n={4} title="Executor" tone={run.status === "submitted" ? "good" : run.status === "failed" ? "bad" : "default"}>
        <p className="text-sm text-muted">The only part that talks to PayPal. It checks PayPal still allows the step right before sending.</p>
        <p className="mt-2">
          Planned step: <strong>{plan.action ? ACTION_LABEL[plan.action] : "None"}</strong>
        </p>
        {run.status === "awaiting_approval" && <p className="mt-1 text-turmeric-ink">Waiting for you. Approve or reject the draft in step 2.</p>}
        {run.status === "needs_decision" && <p className="mt-1 text-turmeric-ink">Waiting for you to pick a direction.</p>}
        {run.status === "rejected" && <p className="mt-1 text-muted">You rejected this. Nothing was sent.</p>}
        {run.status === "blocked" && <p className="mt-1 text-muted">Nothing was sent. {gate.reasons[0]}</p>}
        {execution && (
          <div className="mt-3 text-sm">
            <p>
              {execution.by === "policy" ? "Sent automatically within your policy" : "Sent after your approval"}
              {execution.edited ? ", with your edits" : ""}, {dateTime(execution.at)}.
            </p>
            {execution.response && (
              <p className="mt-1 text-pandan">
                PayPal answered HTTP {execution.response.status}: the step was accepted. The case status above shows PayPal&apos;s current state, not a guess.
              </p>
            )}
            {execution.error && (
              <p className="mt-1 text-chili">
                PayPal answered HTTP {execution.error.status}: {execution.error.message}
                {execution.error.debugId ? ` (debug id ${execution.error.debugId})` : ""}.
              </p>
            )}
            <details className="mt-2">
              <summary className="cursor-pointer text-ink-soft">PayPal response, exactly as received</summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-paper p-3 text-xs">{JSON.stringify(execution.response ?? execution.error, null, 2)}</pre>
            </details>
          </div>
        )}
      </Step>
    </ol>
  );
}
