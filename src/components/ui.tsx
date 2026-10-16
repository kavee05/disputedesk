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

export function Panel({ children, className = "", as: Tag = "section" }: { children: React.ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return <Tag className={`rounded-xl border border-rule bg-surface shadow-[var(--shadow-panel)] ${className}`}>{children}</Tag>;
}

export function PanelHeader({ title, description, children }: { title: string; description?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-rule px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-[1.05rem] font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}

const TONES: Record<DisplayStatus["tone"], { pill: string; dot: string }> = {
  amber: { pill: "bg-turmeric-soft text-turmeric-ink ring-turmeric/25", dot: "bg-turmeric" },
  blue: { pill: "bg-sky-soft text-sky ring-sky/20", dot: "bg-sky" },
  slate: { pill: "bg-paper text-ink-soft ring-rule-strong/70", dot: "bg-faint" },
  green: { pill: "bg-pandan-soft text-pandan ring-pandan/20", dot: "bg-pandan" },
  red: { pill: "bg-chili-soft text-chili ring-chili/20", dot: "bg-chili" },
};

export function StatusPill({ status }: { status: DisplayStatus }) {
  const t = TONES[status.tone];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.8rem] font-semibold ring-1 ring-inset ${t.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot} ${status.key === "processing" ? "animate-pulse" : ""}`} aria-hidden />
      {status.label}
    </span>
  );
}

// Every case and result carries where it came from.
export function SourceBadge({ source }: { source: CaseSource }) {
  return source === "sandbox" ? (
    <span className="inline-flex items-center rounded-md bg-ink/[0.06] px-1.5 py-px text-[0.72rem] font-semibold text-ink-soft">Sandbox</span>
  ) : (
    <span className="inline-flex items-center rounded-md bg-turmeric-soft px-1.5 py-px text-[0.72rem] font-semibold text-turmeric-ink">Simulated</span>
  );
}

export function AdjudicationBadge({ source }: { source: CaseSource }) {
  return (
    <span className="inline-flex items-center rounded-md bg-sky-soft px-1.5 py-px text-[0.72rem] font-semibold text-sky">
      {source === "sandbox" ? "Sandbox adjudication" : "Simulated PayPal decision"}
    </span>
  );
}

export function deadlineInfo(due?: string) {
  if (!due) return null;
  const ms = new Date(due).getTime() - Date.now();
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  return { ms, overdue: ms <= 0, urgent: ms > 0 && ms < 3 * 86_400_000, text: ms <= 0 ? "Overdue" : days > 0 ? `${days}d ${hours}h left` : `${hours}h left` };
}

export function Deadline({ due, open }: { due?: string; open: boolean }) {
  const d = open ? deadlineInfo(due) : null;
  if (!d) return <span className="text-faint">None</span>;
  return (
    <span className={d.overdue ? "font-semibold text-chili" : d.urgent ? "font-semibold text-turmeric-ink" : "text-ink-soft"} title={dateTime(due)}>
      {d.text}
    </span>
  );
}

// Time left out of PayPal's usual 10-day response window, as a thin bar.
export function DeadlineBar({ due, open }: { due?: string; open: boolean }) {
  const d = open ? deadlineInfo(due) : null;
  if (!d) return <span className="text-sm text-faint">None</span>;
  const pct = Math.max(4, Math.min(100, (d.ms / (10 * 86_400_000)) * 100));
  const color = d.overdue ? "bg-chili" : d.urgent ? "bg-turmeric" : "bg-ink-soft/60";
  return (
    <div className="w-28">
      <Deadline due={due} open={open} />
      <div className="mt-1 h-1 rounded-full bg-rule" aria-hidden>
        <div className={`h-1 rounded-full ${color}`} style={{ width: `${d.overdue ? 100 : pct}%` }} />
      </div>
    </div>
  );
}

export function PageHeader({ title, intro, children }: { title: string; intro?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-[64ch]">
        <h1 className="text-[1.9rem] font-bold md:text-[2.25rem]">{title}</h1>
        {intro && <p className="mt-1.5 text-muted">{intro}</p>}
      </div>
      {children && <div className="flex flex-wrap items-start gap-2">{children}</div>}
    </header>
  );
}

export function Stat({ label, value, tone = "", icon, children }: { label: string; value: string; tone?: string; icon?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-rule bg-surface p-4 shadow-[var(--shadow-panel)] sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted">{label}</p>
        {icon && <span className="text-faint">{icon}</span>}
      </div>
      <p className={`num mt-2 text-[1.45rem] font-bold leading-none sm:text-[1.75rem] 2xl:text-[2rem] ${tone}`}>{value}</p>
      {children && <p className="mt-2 text-[0.8rem] leading-snug text-muted">{children}</p>}
    </div>
  );
}

export function Empty({ title, children, icon }: { title: string; children?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-rule-strong bg-surface px-6 py-12 text-center">
      {icon && <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-paper text-ink-soft">{icon}</div>}
      <p className="font-[family-name:var(--font-display)] text-lg font-semibold">{title}</p>
      {children && <div className="mx-auto mt-1.5 max-w-[52ch] text-sm text-muted">{children}</div>}
    </div>
  );
}

// A small square tile with the item's initials, so rows are easy to scan.
const TILE_TONES = ["bg-[#e8ecfb] text-[#2b3a8c]", "bg-[#fbeedb] text-[#8a5a0c]", "bg-[#e3f2ea] text-[#24644a]", "bg-[#f6e6ef] text-[#8a2f5c]", "bg-[#e6f1f6] text-[#22607a]"];
export function ItemTile({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const words = name.replace(/[^A-Za-z ]/g, " ").split(/\s+/).filter(Boolean);
  const initials = ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "?";
  const tone = TILE_TONES[[...name].reduce((s, ch) => s + ch.charCodeAt(0), 0) % TILE_TONES.length];
  const box = size === "lg" ? "h-12 w-12 rounded-xl text-base" : "h-9 w-9 rounded-lg text-[0.8rem]";
  return (
    <span className={`flex shrink-0 items-center justify-center font-[family-name:var(--font-display)] font-bold ${box} ${tone}`} aria-hidden>
      {initials}
    </span>
  );
}
