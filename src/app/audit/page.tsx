import Link from "next/link";
import { listAudit, type AuditKind } from "@/lib/audit";
import { dateTime, Empty, PageHeader } from "@/components/ui";

const KINDS: { key: AuditKind | "all"; label: string }[] = [
  { key: "all", label: "Everything" },
  { key: "agent_decision", label: "Agent decisions" },
  { key: "policy_gate", label: "Policy Gate" },
  { key: "paypal_response", label: "PayPal responses" },
  { key: "paypal_request", label: "PayPal requests" },
  { key: "guardrail", label: "Guardrails" },
  { key: "seller_action", label: "Your actions" },
];

const KIND_STYLE: Record<string, string> = {
  agent_decision: "bg-sky-soft text-sky",
  policy_gate: "bg-paper text-ink-soft border border-rule",
  paypal_response: "bg-pandan-soft text-pandan",
  paypal_request: "bg-paper text-muted border border-rule",
  guardrail: "bg-chili-soft text-chili",
  seller_action: "bg-turmeric-soft text-turmeric-ink",
  system: "bg-paper text-muted border border-rule",
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
        <p className="mb-3 text-sm">
          Showing one case: <span className="break-all font-bold">{caseId}</span>.{" "}
          <Link href={kind === "all" ? "/audit" : `/audit?kind=${kind}`} className="underline underline-offset-4">
            Show all cases
          </Link>
        </p>
      )}
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter entries">
        {KINDS.map((k) => (
          <Link
            key={k.key}
            role="tab"
            aria-selected={kind === k.key}
            href={qs(k.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm ${kind === k.key ? "bg-ink text-white" : "border border-rule bg-surface text-ink-soft hover:border-ink"}`}
          >
            {k.label}
          </Link>
        ))}
      </div>
      {entries.length === 0 ? (
        <Empty title="Nothing logged yet">Run the agent on a dispute and every step will show up here.</Empty>
      ) : (
        <ol className="overflow-hidden rounded-lg border border-rule bg-surface">
          {entries.map((e) => (
            <li key={e.id} className="border-b border-rule px-4 py-3 last:border-0">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                <span className="shrink-0 text-xs text-muted sm:w-28">{dateTime(e.at)}</span>
                <span className={`w-fit shrink-0 rounded px-1.5 py-px text-xs ${KIND_STYLE[e.kind] ?? ""}`}>{KINDS.find((k) => k.key === e.kind)?.label ?? e.kind}</span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-[0.95rem]">{e.summary}</p>
                  {e.caseId && !caseId && (
                    <Link href={`/cases/${encodeURIComponent(e.caseId)}`} className="break-all text-xs text-muted underline underline-offset-2">
                      {e.caseId}
                    </Link>
                  )}
                  {e.data !== null && typeof e.data === "object" && Object.keys(e.data).length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-ink-soft">Details</summary>
                      <pre className="mt-1 max-h-72 overflow-auto rounded bg-paper p-2 text-xs">{JSON.stringify(e.data, null, 2)}</pre>
                    </details>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
