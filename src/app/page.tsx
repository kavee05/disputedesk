import Link from "next/link";
import { syncAction } from "./actions";
import { config } from "@/lib/config";
import { statusOf } from "@/lib/app";
import { listCases } from "@/lib/cases/repo";
import { isOpen } from "@/lib/cases/status";
import { latestRun, type AgentRun } from "@/lib/agent/runs";
import { ActionButton } from "@/components/action-button";
import { Deadline, Empty, money, PageHeader, SourceBadge, StatusPill } from "@/components/ui";

const VIEWS = [
  { key: "needs", label: "Needs you" },
  { key: "open", label: "All open" },
  { key: "closed", label: "Closed" },
  { key: "all", label: "Everything" },
] as const;

function agentSummary(run: AgentRun | null) {
  if (!run) return { text: "Not analysed yet", tone: "text-muted" };
  const rec = run.data.analyst.recommendation;
  const pct = Math.round(run.data.analyst.win_probability * 100);
  const base = `${rec === "FIGHT" ? "Fight" : rec === "REFUND" ? "Refund" : "Ask you"}, ${pct}% win`;
  switch (run.status) {
    case "awaiting_approval":
      return { text: `${base}. Waiting for approval`, tone: "text-turmeric-ink font-bold" };
    case "needs_decision":
      return { text: `${base}. Your call`, tone: "text-turmeric-ink font-bold" };
    case "submitted":
      return { text: `${base}. Sent to PayPal${run.data.execution?.by === "policy" ? " automatically" : ""}`, tone: "text-ink-soft" };
    case "failed":
      return { text: `${base}. PayPal rejected it`, tone: "text-chili font-bold" };
    case "blocked":
      return { text: `${base}. No PayPal action available`, tone: "text-muted" };
    default:
      return { text: `${base}. Rejected by you`, tone: "text-muted" };
  }
}

export default async function Inbox({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view = "needs" } = await searchParams;
  const rows = listCases().map((c) => ({ c, s: statusOf(c), run: latestRun(c.id) }));
  const needsYou = (r: (typeof rows)[number]) =>
    isOpen(r.s) && (r.s.key === "action" || r.run?.status === "awaiting_approval" || r.run?.status === "needs_decision");
  const filtered = rows.filter((r) =>
    view === "needs" ? needsYou(r) : view === "open" ? isOpen(r.s) : view === "closed" ? !isOpen(r.s) : true,
  );
  const counts = { needs: rows.filter(needsYou).length, open: rows.filter((r) => isOpen(r.s)).length, closed: rows.filter((r) => !isOpen(r.s)).length, all: rows.length };

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
        <ActionButton action={syncAction} pendingLabel="Syncing" variant="secondary">
          {config.mode === "sandbox" ? "Sync from PayPal" : "Refresh"}
        </ActionButton>
      </PageHeader>

      <div role="tablist" aria-label="Filter disputes" className="mb-4 flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            role="tab"
            aria-selected={view === v.key}
            href={v.key === "needs" ? "/" : `/?view=${v.key}`}
            className={`rounded-full px-3.5 py-1.5 text-sm ${view === v.key ? "bg-ink text-white" : "border border-rule bg-surface text-ink-soft hover:border-ink"}`}
          >
            {v.label} <span className="num ml-0.5 opacity-75">{counts[v.key]}</span>
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Empty title="No disputes yet">
          {config.mode === "sandbox" ? (
            <>
              Open a test dispute as your sandbox buyer, then press Sync. The <Link className="underline" href="/demo">Demo cases</Link> page shows how.
            </>
          ) : (
            <>
              Go to <Link className="underline" href="/demo">Demo cases</Link> and load the demo set.
            </>
          )}
        </Empty>
      ) : filtered.length === 0 ? (
        <Empty title={view === "needs" ? "Nothing needs you right now" : "No disputes in this view"}>
          {view === "needs" ? "The agent has handled everything within your policy, or the cases are waiting on PayPal or the buyer." : null}
        </Empty>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg border border-rule bg-surface lg:block">
            <table className="w-full text-left text-[0.95rem]">
              <thead className="border-b border-rule bg-paper/60 text-sm text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-normal">Case</th>
                  <th className="px-3 py-2.5 font-normal">Amount</th>
                  <th className="px-3 py-2.5 font-normal">Respond by</th>
                  <th className="px-3 py-2.5 font-normal">PayPal status</th>
                  <th className="px-4 py-2.5 font-normal">Agent</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ c, s, run }) => {
                  const a = agentSummary(run);
                  return (
                    <tr key={c.id} className="border-b border-rule last:border-0 hover:bg-paper/50">
                      <td className="px-4 py-3">
                        <Link href={`/cases/${c.id}`} className="font-bold text-ink hover:underline">
                          {c.itemSummary ?? c.reasonLabel}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted">
                          <span>{c.reasonLabel}</span>
                          <SourceBadge source={c.source} />
                        </div>
                      </td>
                      <td className="num px-3 py-3 text-lg font-bold">{money(c.amount, c.currency)}</td>
                      <td className="px-3 py-3 text-sm">
                        <Deadline due={c.sellerResponseDue} open={s.key === "action"} />
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill status={s} />
                      </td>
                      <td className={`px-4 py-3 text-sm ${a.tone}`}>{a.text}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile and tablet list */}
          <ul className="flex flex-col gap-3 lg:hidden">
            {filtered.map(({ c, s, run }) => {
              const a = agentSummary(run);
              return (
                <li key={c.id}>
                  <Link href={`/cases/${c.id}`} className="block rounded-lg border border-rule bg-surface p-4 hover:border-ink">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold">{c.itemSummary ?? c.reasonLabel}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted">
                          {c.reasonLabel} <SourceBadge source={c.source} />
                        </p>
                      </div>
                      <p className="num shrink-0 text-lg font-bold">{money(c.amount, c.currency)}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                      <StatusPill status={s} />
                      <Deadline due={c.sellerResponseDue} open={s.key === "action"} />
                    </div>
                    <p className={`mt-2 text-sm ${a.tone}`}>{a.text}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
