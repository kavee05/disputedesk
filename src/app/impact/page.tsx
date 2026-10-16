import Link from "next/link";
import { statusOf } from "@/lib/app";
import { listCases } from "@/lib/cases/repo";
import { isOpen } from "@/lib/cases/status";
import { listRuns } from "@/lib/agent/runs";
import { getPolicy } from "@/lib/agent/policy";
import { AdjudicationBadge, Empty, money, PageHeader, SourceBadge, StatusPill } from "@/components/ui";

export default function ImpactPage() {
  const policy = getPolicy();
  const cases = listCases().map((c) => ({ c, s: statusOf(c) }));
  const runs = listRuns();
  const submitted = runs.filter((r) => r.status === "submitted");
  const handledIds = new Set([...submitted.map((r) => r.caseId), ...cases.filter(({ s }) => !isOpen(s)).map(({ c }) => c.id)]);
  const handled = handledIds.size;
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
        intro="Money only counts as defended when PayPal itself reports the case resolved in your favour. Refunds only count once PayPal reports the refund as completed."
      />

      <section className="grid gap-px overflow-hidden rounded-lg border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Money defended" value={money(defendedSandbox + defendedSim)} tone="text-pandan">
          {defendedSandbox > 0 && <span className="block">{money(defendedSandbox)} confirmed by PayPal Sandbox</span>}
          {defendedSim > 0 && <span className="block">{money(defendedSim)} in simulated cases</span>}
          {defendedSandbox + defendedSim === 0 && <span className="block">No case resolved for you yet</span>}
        </Stat>
        <Stat label="Disputes handled" value={String(handled)}>
          {auto} sent automatically, {approved} after your approval
        </Stat>
        <Stat label="Hours saved (estimate)" value={hoursSaved.toFixed(1)}>
          {policy.hoursPerDispute}h by hand versus about 10 minutes of review, per case
        </Stat>
        <Stat label="Still at stake" value={money(atStake)}>
          Open cases waiting on you, the buyer or PayPal
        </Stat>
      </section>

      <p className="mt-3 text-sm text-muted">
        Refunded and confirmed: {money(refundedSandbox + refundedSim)}
        {refundedSim > 0 && refundedSandbox > 0 ? ` (${money(refundedSandbox)} sandbox, ${money(refundedSim)} simulated)` : ""}. The hours figure is an estimate
        from your policy settings, not a measurement.
      </p>

      <h2 className="mb-3 mt-8 text-2xl font-bold">Closed cases</h2>
      {closed.length === 0 ? (
        <Empty title="No closed cases yet">When PayPal resolves a case, it shows up here with the outcome PayPal reported.</Empty>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-rule bg-surface">
          {closed.map(({ c, s }) => (
            <li key={c.id} className="flex flex-col gap-2 border-b border-rule px-4 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <Link href={`/cases/${encodeURIComponent(c.id)}`} className="font-bold hover:underline">
                  {c.itemSummary ?? c.reasonLabel}
                </Link>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted">
                  {c.reasonLabel} <SourceBadge source={c.source} />
                  {s.sandboxAdjudication && <AdjudicationBadge source={c.source} />}
                </p>
                <p className="mt-0.5 break-words text-xs text-muted">{s.detail}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <StatusPill status={s} />
                <span className="num text-lg font-bold">{money(c.amount, c.currency)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Stat({ label, value, tone = "", children }: { label: string; value: string; tone?: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className={`num mt-1 text-[2.2rem] font-extrabold leading-none ${tone}`}>{value}</p>
      <p className="mt-2 text-sm text-muted">{children}</p>
    </div>
  );
}
