import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  CreditCard,
  FileText,
  MessageSquare,
  Package,
  Receipt,
  RefreshCw,
  Scale as ScaleIcon,
  ShieldCheck,
  Store,
  TriangleAlert,
  Truck,
} from "lucide-react";
import { adjudicateAction, refreshCaseAction, runAgentAction } from "@/app/actions";
import { statusOf } from "@/lib/app";
import { getCase } from "@/lib/cases/repo";
import { isOpen } from "@/lib/cases/status";
import { getEvidence, type EvidenceItem, type EvidenceKind } from "@/lib/evidence/collect";
import { latestRun, type AgentRun } from "@/lib/agent/runs";
import { listAudit } from "@/lib/audit";
import { stripCitations } from "@/lib/agent/executor";
import { ActionButton } from "@/components/action-button";
import { AutoRefresh } from "@/components/auto-refresh";
import { DraftEditor } from "@/components/draft-editor";
import { Scale } from "@/components/scale";
import { AdjudicationBadge, dateTime, Deadline, ItemTile, money, Panel, PanelHeader, shortDate, SourceBadge, StatusPill } from "@/components/ui";

const AGENT_HINT = "The agent is reading the evidence and drafting a response. This usually takes 10 to 40 seconds.";

const ACTION_LABEL: Record<string, string> = {
  provide_evidence: "Submit evidence",
  send_message: "Send a message",
  accept_claim: "Accept the claim and refund",
  make_offer: "Make an offer",
};

const KIND_ICON: Record<EvidenceKind, typeof FileText> = {
  dispute: FileText,
  order: Package,
  payment: CreditCard,
  tracking: Truck,
  buyer_message: MessageSquare,
  seller_message: MessageSquare,
  refund: Receipt,
  store_policy: Store,
};

const wrapCode = (s: string) => s.split("_").join("_​");

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = getCase(decodeURIComponent(id));
  if (!c) notFound();
  const status = statusOf(c);
  const run = latestRun(c.id);
  const evidence = getEvidence(c.id);
  const responses = listAudit({ caseId: c.id, limit: 50 }).filter((a) => a.kind === "paypal_response");
  const canAdjudicate = c.links.includes("adjudicate");
  const title = c.itemSummary ?? c.reasonLabel;

  return (
    <article>
      <Link href="/" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All disputes
      </Link>

      <Panel as="div" className="mb-8 p-5 sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <ItemTile name={title} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[0.8rem] text-muted">
                <span>{c.reasonLabel}</span>
                <SourceBadge source={c.source} />
                {status.sandboxAdjudication && <AdjudicationBadge source={c.source} />}
                <span className="break-all">{c.id}</span>
              </div>
              <h1 className="mt-1 text-[1.6rem] font-bold md:text-[2rem]">{title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                <StatusPill status={status} />
                <span className="text-sm text-muted [overflow-wrap:anywhere]">{status.detail}</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-row items-end justify-between gap-6 border-t border-rule pt-4 md:flex-col md:items-end md:border-0 md:pt-0">
            <p className="num text-[2.2rem] font-bold leading-none md:text-[2.6rem]">{money(c.amount, c.currency)}</p>
            {status.key === "action" && c.sellerResponseDue && (
              <p className="text-sm text-muted">
                Respond by <Deadline due={c.sellerResponseDue} open />
              </p>
            )}
          </div>
        </div>
        {(status.key === "processing" || status.key === "review") && (
          <div className="mt-4 border-t border-rule pt-3">
            <AutoRefresh
              caseId={c.id}
              everyMs={status.key === "processing" ? 6000 : c.source === "sandbox" ? 60000 : 8000}
              message={
                status.key === "processing"
                  ? `Checking ${c.source === "sandbox" ? "PayPal" : "Simulated PayPal"} for the result every few seconds.`
                  : c.source === "sandbox"
                    ? "Checking PayPal once a minute. In the sandbox a decision can take 20 to 30 minutes."
                    : "Checking Simulated PayPal for a decision every few seconds."
              }
            />
          </div>
        )}
      </Panel>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="agent-heading" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="agent-heading" className="text-xl font-semibold">
              How the agent sees it
            </h2>
            {run && isOpen(status) && run.status !== "awaiting_approval" && (
              <ActionButton action={runAgentAction.bind(null, c.id, undefined)} pendingLabel="Analysing" pendingHint={AGENT_HINT} icon={<RefreshCw className="h-4 w-4" aria-hidden />}>
                Run the agent again
              </ActionButton>
            )}
          </div>

          {!run ? (
            <Panel as="div" className="p-6 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink text-white">
                  <Bot className="h-6 w-6" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="font-[family-name:var(--font-display)] text-lg font-semibold">Let the agent build this case</p>
                  <p className="mt-1 max-w-[60ch] text-ink-soft">
                    It gathers the order, payment, tracking and messages from PayPal, weighs whether this is worth fighting, and drafts a response.
                    Nothing is sent to PayPal unless your policy allows it or you approve it.
                  </p>
                  <div className="mt-5">
                    {isOpen(status) ? (
                      <ActionButton action={runAgentAction.bind(null, c.id, undefined)} variant="primary" pendingLabel="Analysing" pendingHint={AGENT_HINT} icon={<Bot className="h-4 w-4" aria-hidden />}>
                        Run the agent
                      </ActionButton>
                    ) : (
                      <p className="text-muted">This case is closed at PayPal, so there is nothing to do.</p>
                    )}
                  </div>
                </div>
              </div>
            </Panel>
          ) : (
            <AgentSteps run={run} caseId={c.id} currency={c.currency} evidence={evidence?.items ?? []} pp={c.source === "sandbox" ? "PayPal" : "Simulated PayPal"} />
          )}
        </section>

        <aside className="flex min-w-0 flex-col gap-5" aria-label="PayPal record">
          <Panel>
            <PanelHeader title={c.source === "sandbox" ? "PayPal record" : "Simulated PayPal record"} description={`Last read ${dateTime(c.syncedAt)}`}>
              <ActionButton action={refreshCaseAction.bind(null, c.id)} variant="quiet" pendingLabel="Refreshing" icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden />}>
                Refresh
              </ActionButton>
            </PanelHeader>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2.5 px-5 py-4 text-sm">
              <dt className="text-muted">Status</dt>
              <dd className="text-[0.82rem] font-medium">{wrapCode(c.paypalStatus)}</dd>
              <dt className="text-muted">Stage</dt>
              <dd>{c.stage === "CHARGEBACK" ? "Claim" : c.stage === "INQUIRY" ? "Inquiry" : (c.stage ?? "Unknown")}</dd>
              <dt className="text-muted">Opened</dt>
              <dd>{shortDate(c.createdAt)}</dd>
              {c.outcome && (
                <>
                  <dt className="text-muted">Outcome</dt>
                  <dd className="text-[0.82rem] font-medium">
                    {wrapCode(c.outcome.code)}
                    {c.outcome.reason ? `, ${wrapCode(c.outcome.reason)}` : ""}
                  </dd>
                </>
              )}
              {(c.confirmedRefunds ?? []).map((r) => (
                <div key={r.id} className="contents">
                  <dt className="text-muted">Refund</dt>
                  <dd className="break-all text-[0.82rem]">
                    {r.id}: <span className="font-medium">{r.status}</span>
                  </dd>
                </div>
              ))}
              <dt className="text-muted">Allowed now</dt>
              <dd>{c.links.filter((l) => l !== "self").map((l) => l.replace(/_/g, " ")).join(", ") || (isOpen(status) ? "Nothing while PayPal is processing" : "Nothing, the case is closed")}</dd>
            </dl>
          </Panel>

          <Panel>
            <PanelHeader title="Evidence" description={evidence ? `${evidence.items.length} items, numbered for citation` : undefined} />
            {evidence ? (
              <ol className="flex flex-col px-5 py-4">
                {[...evidence.items]
                  .sort((a, b) => (a.at ?? "9999").localeCompare(b.at ?? "9999"))
                  .map((e, i, all) => {
                    const Icon = KIND_ICON[e.kind];
                    return (
                      <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
                        {i < all.length - 1 && <span className="absolute bottom-0 left-[15px] top-8 w-px bg-rule" aria-hidden />}
                        <span
                          className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${
                            e.untrusted ? "bg-turmeric-soft text-turmeric-ink ring-turmeric/30" : e.fromPayPal ? "bg-sky-soft text-sky ring-sky/20" : "bg-paper text-ink-soft ring-rule"
                          }`}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <div className="min-w-0 text-sm">
                          <p className="font-semibold">
                            <span className="mr-1.5 rounded bg-paper px-1 text-[0.72rem] font-medium text-muted">{e.id}</span>
                            {e.title}
                          </p>
                          <p className={`mt-0.5 break-words ${e.untrusted ? "italic text-ink-soft" : "text-muted"}`}>
                            {e.untrusted ? `Buyer wrote: "${e.detail}"` : e.detail}
                          </p>
                          <p className="mt-0.5 text-xs text-faint">
                            {e.at ? `${shortDate(e.at)}, ` : ""}
                            {e.source}
                          </p>
                        </div>
                      </li>
                    );
                  })}
              </ol>
            ) : (
              <p className="px-5 py-4 text-sm text-muted">Run the agent to gather the order, payment, tracking and messages.</p>
            )}
            {evidence && evidence.gaps.length > 0 && (
              <div className="mx-5 mb-5 rounded-lg bg-turmeric-soft p-3 text-sm text-turmeric-ink">
                <p className="flex items-center gap-1.5 font-semibold">
                  <TriangleAlert className="h-4 w-4" aria-hidden /> Missing evidence
                </p>
                <ul className="mt-1 list-disc pl-5">
                  {evidence.gaps.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          {(canAdjudicate || status.sandboxAdjudication) && (
            <section className="rounded-xl border border-sky/30 bg-sky-soft/60 p-5">
              <h2 className="flex items-center gap-2 text-[1.05rem] font-semibold">
                <ScaleIcon className="h-4 w-4 text-sky" aria-hidden />
                {c.source === "sandbox" ? "Sandbox adjudication" : "Simulated PayPal decision"}
              </h2>
              <p className="mt-1.5 text-sm text-ink-soft">
                {c.source === "sandbox"
                  ? "A sandbox-only PayPal tool that stands in for PayPal's own review, so the end of a case can be tested. It does not exist in live PayPal, and results are labelled as sandbox adjudication."
                  : "Stands in for PayPal's review in demo mode. The result is simulated and labelled that way."}
              </p>
              {canAdjudicate ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <ActionButton action={adjudicateAction.bind(null, c.id, "SELLER_FAVOR")} pendingLabel="Asking PayPal" confirm="Ask PayPal to settle this case in the seller's favour? This closes the case.">
                    Decide for seller
                  </ActionButton>
                  <ActionButton
                    action={adjudicateAction.bind(null, c.id, "BUYER_FAVOR")}
                    variant="danger"
                    pendingLabel="Asking PayPal"
                    confirm="Ask PayPal to settle this case in the buyer's favour? This refunds the buyer and closes the case."
                  >
                    Decide for buyer
                  </ActionButton>
                </div>
              ) : (
                <p className="mt-2 text-sm text-ink-soft">This case was settled this way.</p>
              )}
            </section>
          )}

          {responses.length > 0 && (
            <Panel>
              <PanelHeader title={c.source === "sandbox" ? "PayPal responses" : "Simulated PayPal responses"} />
              <ul className="flex flex-col gap-3 px-5 py-4 text-sm">
                {responses.map((r) => (
                  <li key={r.id}>
                    <p>{r.summary}</p>
                    <p className="text-xs text-faint">{dateTime(r.at)}</p>
                  </li>
                ))}
              </ul>
              <div className="border-t border-rule px-5 py-3">
                <Link href={`/audit?case=${encodeURIComponent(c.id)}`} className="text-sm font-medium text-ink-soft hover:text-ink">
                  Full responses in the audit log
                </Link>
              </div>
            </Panel>
          )}
        </aside>
      </div>
    </article>
  );
}

type StepTone = "default" | "warn" | "good" | "bad";
const STEP_DOT: Record<StepTone, string> = {
  default: "bg-ink text-white",
  warn: "bg-turmeric text-night",
  good: "bg-pandan text-white",
  bad: "bg-chili text-white",
};

function Step({ n, title, subtitle, last, tone = "default", children }: { n: number; title: string; subtitle: string; last?: boolean; tone?: StepTone; children: React.ReactNode }) {
  return (
    <li className="relative pl-12 sm:pl-14">
      {!last && <span className="absolute bottom-[-1.25rem] left-[17px] top-11 w-px bg-rule-strong sm:left-[19px]" aria-hidden />}
      <span className={`num absolute left-0 top-4 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold sm:h-10 sm:w-10 ${STEP_DOT[tone]}`}>{n}</span>
      <Panel as="div">
        <div className="border-b border-rule px-5 py-3.5">
          <h3 className="text-[1.05rem] font-semibold">{title}</h3>
          <p className="text-[0.8rem] text-muted">{subtitle}</p>
        </div>
        <div className="px-5 py-4">{children}</div>
      </Panel>
    </li>
  );
}

function Cite({ ids, items }: { ids: string[]; items: EvidenceItem[] }) {
  if (!ids.length) return <span className="ml-1 text-xs font-medium text-chili">no evidence cited</span>;
  return (
    <>
      {ids.map((id) => {
        const item = items.find((i) => i.id === id);
        return (
          <span
            key={id}
            title={item ? item.title : "Not in the evidence bundle"}
            className={`ml-1 inline-block rounded px-1 text-[0.72rem] font-medium ${item ? "bg-sky-soft text-sky" : "bg-chili-soft text-chili"}`}
          >
            {id}
          </span>
        );
      })}
    </>
  );
}

function AgentSteps({ run, caseId, currency, evidence, pp }: { run: AgentRun; caseId: string; currency: string; evidence: EvidenceItem[]; pp: string }) {
  const { analyst, ev, writer, verification, plan, gate, provider, execution } = run.data;
  const rec = analyst.recommendation;
  return (
    <ol className="flex flex-col gap-5">
      <Step n={1} title="Case Analyst" subtitle={`${provider.label}, ${dateTime(run.createdAt)}`}>
        {provider.offline && (
          <p className="mb-3 inline-flex rounded-md bg-turmeric-soft px-2 py-0.5 text-xs font-semibold text-turmeric-ink">Not AI: simple offline rules</p>
        )}
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="font-[family-name:var(--font-display)] text-[1.3rem] font-semibold">
            {rec === "FIGHT" ? "Fight this one" : rec === "REFUND" ? "Refund this one" : "This one needs you"}
            {run.data.overrideFrom && <span className="text-base font-normal text-muted"> (you chose this over the agent&apos;s {run.data.overrideFrom.toLowerCase()})</span>}
          </p>
          <p className="text-sm text-muted">
            <span className="num font-semibold text-ink">{Math.round(analyst.win_probability * 100)}%</span> win chance,{" "}
            <span className="num font-semibold text-ink">{Math.round(analyst.confidence * 100)}%</span> confidence
          </p>
        </div>
        <p className="mt-2 max-w-[68ch] text-ink-soft">{analyst.summary}</p>
        {analyst.injection_detected && (
          <div className="mt-4 flex gap-3 rounded-lg border border-chili/25 bg-chili-soft p-3 text-sm text-chili">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>
              <strong>Ignored instructions in a buyer message.</strong> {analyst.injection_note || "A buyer message tried to tell the agent what to do."} Buyer text is
              treated as a claim to check, never as a command.
            </p>
          </div>
        )}
        <ol className="mt-4 flex list-decimal flex-col gap-1.5 pl-5 text-[0.92rem] marker:text-faint">
          {analyst.reasoning_steps.map((s, i) => (
            <li key={i}>
              {stripCitations(s.step)}
              <Cite ids={s.evidence_ids} items={evidence} />
            </li>
          ))}
        </ol>
        <div className="mt-5">
          <Scale ev={ev} currency={currency} />
        </div>
      </Step>

      <Step n={2} title="Evidence Writer" subtitle="Drafts the text, citing evidence for every claim" tone={verification.unsupported.length ? "warn" : "default"}>
        {writer && plan.action ? (
          <>
            {writer.statements.length > 0 && (
              <details className="mb-3 text-sm">
                <summary className="cursor-pointer font-medium text-ink-soft">What the draft claims, and the evidence behind each claim</summary>
                <ul className="mt-2 flex flex-col gap-1 pl-4">
                  {writer.statements.map((s, i) => (
                    <li key={i} className="list-disc">
                      {stripCitations(s.text)}
                      <Cite ids={s.evidence_ids} items={evidence} />
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {verification.unsupported.length > 0 && (
              <p className="mb-3 rounded-lg bg-turmeric-soft p-3 text-sm text-turmeric-ink">
                {verification.unsupported.length} claim(s) are not backed by evidence. Check the draft before sending.
              </p>
            )}
            {writer.missing_evidence.length > 0 && (
              <p className="mb-3 text-sm text-muted">Missing: {writer.missing_evidence.map((m) => m.replace(/[.\s]+$/, "")).join("; ")}.</p>
            )}
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

      <Step
        n={3}
        title="Policy Gate"
        subtitle="Plain code, not AI. Checks the plan against your policy"
        tone={gate.decision === "AUTO" || execution?.by === "seller" ? "good" : gate.decision === "BLOCKED" ? "bad" : "warn"}
      >
        <p className="font-semibold">
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
        <ul className="mt-1.5 list-disc pl-5 text-[0.92rem] text-ink-soft">
          {gate.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <Link href="/policy" className="mt-3 inline-block text-sm font-medium text-ink-soft underline underline-offset-4 hover:text-ink">
          Change your policy
        </Link>
      </Step>

      <Step
        n={4}
        last
        title="Executor"
        subtitle="The only part that talks to PayPal. Re-checks PayPal right before sending"
        tone={run.status === "submitted" ? "good" : run.status === "failed" ? "bad" : "default"}
      >
        <p>
          Planned step: <strong className="font-semibold">{plan.action ? ACTION_LABEL[plan.action] : "None"}</strong>
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
                {pp} answered HTTP {execution.response.status}: the step was accepted. The case status above shows {pp}&apos;s current state, not a guess.
              </p>
            )}
            {execution.error && (
              <p className="mt-1 text-chili">
                {pp} answered HTTP {execution.error.status}: {execution.error.message}
                {execution.error.debugId ? ` (debug id ${execution.error.debugId})` : ""}.
              </p>
            )}
            <details className="mt-2">
              <summary className="cursor-pointer font-medium text-ink-soft">{pp} response, exactly as received</summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-paper p-3 text-xs">{JSON.stringify(execution.response ?? execution.error, null, 2)}</pre>
            </details>
          </div>
        )}
      </Step>
    </ol>
  );
}
