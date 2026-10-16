import type { DisplayStatus } from "@/lib/cases/status";
import type { CaseSource } from "@/lib/cases/model";

export function money(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);
}

export function shortDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

// Pages render on the server, so times are shown in UTC and labelled as such
// rather than in whatever zone the host happens to use.
export function dateTime(iso?: string) {
  if (!iso) return "";
  return `${new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`;
}

const TONES: Record<DisplayStatus["tone"], string> = {
  amber: "bg-turmeric-soft text-turmeric-ink",
  blue: "bg-sky-soft text-sky",
  slate: "bg-paper text-ink-soft border border-rule",
  green: "bg-pandan-soft text-pandan",
  red: "bg-chili-soft text-chili",
};

export function StatusPill({ status }: { status: DisplayStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-bold ${TONES[status.tone]}`}>
      {status.key === "processing" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden />}
      {status.label}
    </span>
  );
}

// Every case and result carries where it came from.
export function SourceBadge({ source }: { source: CaseSource }) {
  return source === "sandbox" ? (
    <span className="rounded border border-ink/30 px-1.5 py-px text-xs text-ink-soft">Sandbox</span>
  ) : (
    <span className="rounded border border-turmeric/50 bg-turmeric-soft px-1.5 py-px text-xs text-turmeric-ink">Simulated</span>
  );
}

export function AdjudicationBadge({ source }: { source: CaseSource }) {
  return (
    <span className="rounded border border-sky/40 bg-sky-soft px-1.5 py-px text-xs text-sky">
      {source === "sandbox" ? "Sandbox adjudication" : "Simulated PayPal decision"}
    </span>
  );
}

export function Deadline({ due, open }: { due?: string; open: boolean }) {
  if (!due || !open) return <span className="text-muted">None</span>;
  const ms = new Date(due).getTime() - Date.now();
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  if (ms <= 0) return <span className="font-bold text-chili">Overdue</span>;
  const urgent = ms < 3 * 86_400_000;
  return (
    <span className={urgent ? "font-bold text-turmeric-ink" : "text-ink-soft"} title={dateTime(due)}>
      {days > 0 ? `${days}d ${hours}h left` : `${hours}h left`}
    </span>
  );
}

export function PageHeader({ title, intro, children }: { title: string; intro?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-[62ch]">
        <h1 className="text-3xl font-extrabold md:text-[2.4rem]">{title}</h1>
        {intro && <p className="mt-2 text-muted">{intro}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </header>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-rule-strong bg-surface px-6 py-10 text-center">
      <p className="font-[family-name:var(--font-display)] text-xl font-bold">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-[52ch] text-muted">{children}</div>}
    </div>
  );
}
