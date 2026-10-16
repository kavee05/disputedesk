import Link from "next/link";
import { CheckCircle2, CircleDollarSign, Clock, Inbox as InboxIcon, RefreshCw, TriangleAlert } from "lucide-react";
import { syncAction } from "./actions";
import { config } from "@/lib/config";
import { statusOf } from "@/lib/app";
import { listCases } from "@/lib/cases/repo";
import { isOpen } from "@/lib/cases/status";
import { latestRun, type AgentRun } from "@/lib/agent/runs";
import { ActionButton } from "@/components/action-button";
import { deadlineInfo, DeadlineBar, Empty, ItemTile, money, PageHeader, Panel, SourceBadge, Stat, StatusPill } from "@/components/ui";

const VIEWS = [
  { key: "needs", label: "Needs you" },
  { key: "open", label: "All open" },
  { key: "closed", label: "Closed" },
  { key: "all", label: "Everything" },
] as const;

function agentSummary(run: AgentRun | null) {
  if (!run) return { head: "Not analysed yet", sub: "", tone: "text-faint" };
  const rec = run.data.analyst.recommendation;
  const head = `${rec === "FIGHT" ? "Fight" : rec === "REFUND" ? "Refund" : "Your call"}, ${Math.round(run.data.analyst.win_probability * 100)}% win`;
  switch (run.status) {
    case "awaiting_approval":
      return { head, sub: "Waiting for your approval", tone: "text-turmeric-ink" };
    case "needs_decision":
      return { head, sub: "Waiting for your decision", tone: "text-turmeric-ink" };
    case "submitted":
      return { head, sub: run.data.execution?.by === "policy" ? "Sent to PayPal automatically" : "Sent to PayPal", tone: "text-ink-soft" };
    case "failed":
      return { head, sub: "PayPal rejected the step", tone: "text-chili" };
    case "blocked":
      return { head, sub: "No PayPal action available", tone: "text-muted" };
    default:
      return { head, sub: "You rejected the draft", tone: "text-muted" };
  }
}

export default async function Inbox({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view = "needs" } = await searchParams;
  const rows = listCases().map((c) => ({ c, s: statusOf(c), run: latestRun(c.id) }));
  const needsYou = (r: (typeof rows)[number]) =>
    isOpen(r.s) && (r.s.key === "action" || r.run?.status === "awaiting_approval" || r.run?.status === "needs_decision");
  const filtered = rows.filter((r) => (view === "needs" ? needsYou(r) : view === "open" ? isOpen(r.s) : view === "closed" ? !isOpen(r.s) : true));
  const counts = { needs: rows.filter(needsYou).length, open: rows.filter((r) => isOpen(r.s)).length, closed: rows.filter((r) => !isOpen(r.s)).length, all: rows.length };
  const atStake = rows.filter((r) => isOpen(r.s)).reduce((t, r) => t + r.c.amount, 0);
  const dueSoon = rows.filter((r) => r.s.key === "action" && deadlineInfo(r.c.sellerResponseDue)?.urgent).length;
  const defended = rows.reduce((t, r) => t + r.s.defended, 0);

  return (
    <>
      <PageHeader
        title="Disputes"
        intro={
          config.mode === "sandbox"
            ? "Disputes from your PayPal Sandbox seller account. Status always comes from PayPal."
            : "Fictional cases for a small handmade-goods shop, served by the PayPal simulator."
        }
      >
        <ActionButton action={syncAction} pendingLabel="Syncing" icon={<RefreshCw className="h-4 w-4" aria-hidden />}>
          {config.mode === "sandbox" ? "Sync from PayPal" : "Refresh"}
        </ActionButton>
      </PageHeader>

      <div className="mb-7 grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        <Stat label="Needs you" value={String(counts.needs)} tone={counts.needs ? "text-turmeric-ink" : ""} icon={<InboxIcon className="h-4 w-4" />}>
          Cases waiting on a reply or your approval
        </Stat>
        <Stat label="At stake" value={money(atStake)} icon={<CircleDollarSign className="h-4 w-4" />}>
          Across {counts.open} open {counts.open === 1 ? "case" : "cases"}
        </Stat>
        <Stat label="Due in 3 days" value={String(dueSoon)} tone={dueSoon ? "text-chili" : ""} icon={<Clock className="h-4 w-4" />}>
          Reply before PayPal&apos;s deadline
        </Stat>
        <Stat label="Defended" value={money(defended)} tone="text-pandan" icon={<CheckCircle2 className="h-4 w-4" />}>
          Confirmed by PayPal outcomes only
        </Stat>
      </div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3 sm:px-5">
          <div role="tablist" aria-label="Filter disputes" className="flex flex-wrap gap-1 rounded-lg bg-paper p-1">
            {VIEWS.map((v) => (
              <Link
                key={v.key}
                role="tab"
                aria-selected={view === v.key}
                href={v.key === "needs" ? "/" : `/?view=${v.key}`}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  view === v.key ? "bg-surface text-ink shadow-[0_1px_2px_rgba(24,33,74,0.12)]" : "text-muted hover:text-ink"
                }`}
              >
                {v.label} <span className="num ml-0.5 text-faint">{counts[v.key]}</span>
              </Link>
            ))}
          </div>
          <p className="text-sm text-muted">
            {filtered.length} {filtered.length === 1 ? "case" : "cases"}
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="p-5">
            <Empty title="No disputes yet" icon={<InboxIcon className="h-5 w-5" />}>
              {config.mode === "sandbox" ? (
                <>
                  Open a test dispute as your sandbox buyer, then press Sync. The{" "}
                  <Link className="font-medium underline" href="/demo">
                    Demo cases
                  </Link>{" "}
                  page shows how.
                </>
              ) : (
                <>
                  Go to{" "}
                  <Link className="font-medium underline" href="/demo">
                    Demo cases
                  </Link>{" "}
                  and load the demo set.
                </>
              )}
            </Empty>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <Empty title={view === "needs" ? "Nothing needs you right now" : "No disputes in this view"} icon={<CheckCircle2 className="h-5 w-5" />}>
              {view === "needs" ? "The agent handled everything within your policy, or the cases are waiting on PayPal or the buyer." : null}
            </Empty>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-left xl:table">
              <thead>
                <tr className="text-[0.8rem] text-muted">
                  <th className="px-5 py-2.5 font-medium">Case</th>
                  <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-3 py-2.5 font-medium">Respond by</th>
                  <th className="px-3 py-2.5 font-medium">PayPal status</th>
                  <th className="px-5 py-2.5 font-medium">Agent</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ c, s, run }) => {
                  const a = agentSummary(run);
                  return (
                    <tr key={c.id} className="group border-t border-rule transition-colors hover:bg-paper/70">
                      <td className="px-5 py-3.5">
                        <Link href={`/cases/${c.id}`} className="flex items-center gap-3">
                          <ItemTile name={c.itemSummary ?? c.reasonLabel} />
                          <span className="min-w-0">
                            <span className="block font-semibold text-ink group-hover:underline">{c.itemSummary ?? c.reasonLabel}</span>
                            <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[0.8rem] text-muted">
                              {c.reasonLabel} <SourceBadge source={c.source} />
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="num px-3 py-3.5 text-right text-[1.05rem] font-semibold">{money(c.amount, c.currency)}</td>
                      <td className="px-3 py-3.5 text-sm">
                        <DeadlineBar due={c.sellerResponseDue} open={s.key === "action"} />
                      </td>
                      <td className="px-3 py-3.5">
                        <StatusPill status={s} />
                      </td>
                      <td className="px-5 py-3.5 text-sm">
                        <span className={`block font-medium ${a.tone}`}>{a.head}</span>
                        {a.sub && <span className="block text-[0.8rem] text-muted">{a.sub}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile and tablet list */}
            <ul className="divide-y divide-rule xl:hidden">
              {filtered.map(({ c, s, run }) => {
                const a = agentSummary(run);
                return (
                  <li key={c.id}>
                    <Link href={`/cases/${c.id}`} className="block px-4 py-4 hover:bg-paper/70 sm:px-5">
                      <div className="flex items-start gap-3">
                        <ItemTile name={c.itemSummary ?? c.reasonLabel} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-semibold">{c.itemSummary ?? c.reasonLabel}</p>
                            <p className="num shrink-0 font-semibold">{money(c.amount, c.currency)}</p>
                          </div>
                          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[0.8rem] text-muted">
                            {c.reasonLabel} <SourceBadge source={c.source} />
                          </p>
                          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                            <StatusPill status={s} />
                            {s.key === "action" && <DeadlineBar due={c.sellerResponseDue} open />}
                          </div>
                          <p className={`mt-2 text-[0.8rem] ${a.tone}`}>
                            {a.head}
                            {a.sub ? `. ${a.sub}` : ""}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Panel>

      {counts.needs > 0 && view !== "needs" && (
        <p className="mt-4 flex items-center gap-2 text-sm text-turmeric-ink">
          <TriangleAlert className="h-4 w-4" aria-hidden /> {counts.needs} {counts.needs === 1 ? "case needs" : "cases need"} you.{" "}
          <Link href="/" className="font-medium underline">
            Show them
          </Link>
        </p>
      )}
    </>
  );
}
