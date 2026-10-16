import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Bot, Cog, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";
import { listAudit, type AuditKind } from "@/lib/audit";
import { dateTime, Empty, PageHeader, Panel } from "@/components/ui";

const KINDS: { key: AuditKind | "all"; label: string }[] = [
  { key: "all", label: "Everything" },
  { key: "agent_decision", label: "Agent decisions" },
  { key: "policy_gate", label: "Policy Gate" },
  { key: "paypal_response", label: "PayPal responses" },
  { key: "paypal_request", label: "PayPal requests" },
  { key: "guardrail", label: "Guardrails" },
  { key: "seller_action", label: "Your actions" },
];

const KIND_STYLE: Record<string, { icon: typeof Bot; tone: string }> = {
  agent_decision: { icon: Bot, tone: "bg-sky-soft text-sky" },
  policy_gate: { icon: SlidersHorizontal, tone: "bg-ink/[0.07] text-ink" },
  paypal_response: { icon: ArrowDownLeft, tone: "bg-pandan-soft text-pandan" },
  paypal_request: { icon: ArrowUpRight, tone: "bg-paper text-muted" },
  guardrail: { icon: ShieldCheck, tone: "bg-chili-soft text-chili" },
  seller_action: { icon: UserRound, tone: "bg-turmeric-soft text-turmeric-ink" },
  system: { icon: Cog, tone: "bg-paper text-muted" },
};

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ kind?: string; case?: string }> }) {
  const { kind = "all", case: caseId } = await searchParams;
  const entries = listAudit({ caseId, limit: 400 }).filter((e) => kind === "all" || e.kind === kind);
  const qs = (k: string) => {
    const p = new URLSearchParams();
    if (k !== "all") p.set("kind", k);
    if (caseId) p.set("case", caseId);
    const s = p.toString();
    return s ? `/audit?${s}` : "/audit";
  };

  return (
    <>
      <PageHeader
        title="Audit log"
        intro="Every agent decision, every Policy Gate result and every call to PayPal, with PayPal's responses stored exactly as received. Credentials are never logged."
      />
      {caseId && (
        <p className="mb-4 text-sm">
          Showing one case: <span className="break-all font-semibold">{caseId}</span>.{" "}
          <Link href={kind === "all" ? "/audit" : `/audit?kind=${kind}`} className="font-medium underline underline-offset-4">
            Show all cases
          </Link>
        </p>
      )}

      <Panel>
        <div className="border-b border-rule px-4 py-3 sm:px-5">
          <div role="tablist" aria-label="Filter entries" className="flex flex-wrap gap-1 rounded-lg bg-paper p-1">
            {KINDS.map((k) => (
              <Link
                key={k.key}
                role="tab"
                aria-selected={kind === k.key}
                href={qs(k.key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  kind === k.key ? "bg-surface text-ink shadow-[0_1px_2px_rgba(24,33,74,0.12)]" : "text-muted hover:text-ink"
                }`}
              >
                {k.label}
              </Link>
            ))}
          </div>
        </div>
        {entries.length === 0 ? (
          <div className="p-5">
            <Empty title="Nothing logged yet">Run the agent on a dispute and every step shows up here.</Empty>
          </div>
        ) : (
          <ol className="divide-y divide-rule">
            {entries.map((e) => {
              const style = KIND_STYLE[e.kind] ?? KIND_STYLE.system;
              const Icon = style.icon;
              return (
                <li key={e.id} className="flex gap-3 px-4 py-3.5 sm:px-5">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.tone}`} title={KINDS.find((k) => k.key === e.kind)?.label ?? e.kind}>
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                      <p className="break-words text-[0.92rem] font-medium">{e.summary}</p>
                      <span className="shrink-0 text-xs text-faint">{dateTime(e.at)}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span className="text-muted">{KINDS.find((k) => k.key === e.kind)?.label ?? "System"}</span>
                      {e.caseId && !caseId && (
                        <Link href={`/cases/${encodeURIComponent(e.caseId)}`} className="break-all text-muted underline underline-offset-2 hover:text-ink">
                          {e.caseId}
                        </Link>
                      )}
                    </div>
                    {e.data !== null && typeof e.data === "object" && Object.keys(e.data).length > 0 && (
                      <details className="mt-1.5">
                        <summary className="cursor-pointer text-xs font-medium text-ink-soft">Details</summary>
                        <pre className="mt-1.5 max-h-72 overflow-auto rounded-lg bg-paper p-3 text-xs">{JSON.stringify(e.data, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Panel>
    </>
  );
}
