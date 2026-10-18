import Link from "next/link";
import { CircleDollarSign, Clock, Gauge, Receipt } from "lucide-react";
import { statusOf } from "@/lib/app";
import { listCases } from "@/lib/cases/repo";
import { isOpen } from "@/lib/cases/status";
import { listRuns } from "@/lib/agent/runs";
import { getPolicy } from "@/lib/agent/policy";
import { AdjudicationBadge, Empty, GradientStat, ItemTile, money, PageHeader, Panel, PanelHeader, SourceBadge, Stat, StatusPill } from "@/components/ui";

export default function ImpactPage() {
  const policy = getPolicy();
  const cases = listCases().map((c) => ({ c, s: statusOf(c) }));
  const runs = listRuns();
  const submitted = runs.filter((r) => r.status === "submitted");
  // "Handled" means the agent actually sent a step to PayPal for the case.
  const handled = new Set(submitted.map((r) => r.caseId)).size;
  const auto = submitted.filter((r) => r.data.execution?.by === "policy").length;
  const approved = submitted.length - auto;

  const sum = (src: "sandbox" | "simulated", key: "defended" | "refunded") =>
    cases.filter(({ c }) => c.source === src).reduce((t, { s }) => t + s[key], 0);
  const defendedSandbox = sum("sandbox", "defended");
  const defendedSim = sum("simulated", "defended");
  const refundedSandbox = sum("sandbox", "refunded");
  const refundedSim = sum("simulated", "refunded");
  const atStake = cases.filter(({ s }) => isOpen(s)).reduce((t, { c }) => t + c.amount, 0);
  const hoursSaved = Math.max(0, handled * (policy.hoursPerDispute - 10 / 60));
  const closed = cases.filter(({ s }) => !isOpen(s));

  return (
    <>
      <PageHeader
        title="Impact"
        intro="Money only counts as defended when PayPal itself reports the case resolved in your favour. Refunds only count once PayPal reports the refund as completed. Totals cover every synced case."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4 xl:gap-5">
        <GradientStat label="Money defended" value={money(defendedSandbox + defendedSim)}>
          {defendedSandbox > 0 && <span className="block">{money(defendedSandbox)} confirmed by PayPal Sandbox</span>}
          {defendedSim > 0 && <span className="block">{money(defendedSim)} in simulated cases</span>}
          {defendedSandbox + defendedSim === 0 && <span className="block">No case resolved for you yet</span>}
        </GradientStat>
        <Stat label="Handled by the agent" value={String(handled)} icon={<Gauge className="h-4 w-4" />}>
          {auto} sent automatically, {approved} after your approval
        </Stat>
        <Stat label="Hours saved" value={hoursSaved.toFixed(1)} icon={<Clock className="h-4 w-4" />}>
          Estimate: {policy.hoursPerDispute}h by hand versus about 10 minutes of review, per case
        </Stat>
        <Stat label="Still at stake" value={money(atStake)} icon={<CircleDollarSign className="h-4 w-4" />}>
          Open cases waiting on you, the buyer or PayPal
        </Stat>
      </div>

      <p className="mt-4 flex items-start gap-2 text-sm text-muted">
        <Receipt className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          Refunded and confirmed by PayPal: {money(refundedSandbox + refundedSim)}
          {refundedSim > 0 && refundedSandbox > 0 ? ` (${money(refundedSandbox)} sandbox, ${money(refundedSim)} simulated)` : ""}. Hours saved is an estimate from your
          policy settings, not a measurement.
        </span>
      </p>

      <Panel className="mt-8">
        <PanelHeader title="Closed cases" description="Each with the outcome PayPal reported" />
        {closed.length === 0 ? (
          <div className="p-5">
            <Empty title="No closed cases yet">When PayPal resolves a case, it shows up here with the outcome PayPal reported.</Empty>
          </div>
        ) : (
          <ul className="divide-y divide-rule">
            {closed.map(({ c, s }) => (
              <li key={c.id}>
                <Link href={`/cases/${encodeURIComponent(c.id)}`} className="flex flex-col gap-3 px-5 py-4 hover:bg-paper/70 sm:flex-row sm:items-center sm:justify-between">
                  <span className="flex min-w-0 items-start gap-3">
                    <ItemTile name={c.itemSummary ?? c.reasonLabel} />
                    <span className="min-w-0">
                      <span className="block font-semibold">{c.itemSummary ?? c.reasonLabel}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[0.8rem] text-muted">
                        {c.reasonLabel} <SourceBadge source={c.source} />
                        {s.sandboxAdjudication && <AdjudicationBadge source={c.source} />}
                      </span>
                      <span className="mt-0.5 block text-xs text-faint [overflow-wrap:anywhere]">{s.detail}</span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3 pl-12 sm:pl-0">
                    <StatusPill status={s} />
                    <span className="num text-[1.05rem] font-semibold">{money(c.amount, c.currency)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
