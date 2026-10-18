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

// Soft UI surface: white, a diffused navy-tinted shadow and a hairline edge so
// it stays crisp on low-contrast screens.
export function Panel({ children, className = "", as: Tag = "section" }: { children: React.ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return <Tag className={`rounded-[20px] border border-white bg-surface shadow-[var(--shadow-soft)] ring-1 ring-rule/70 ${className}`}>{children}</Tag>;
}

export function PanelHeader({ title, description, children }: { title: string; description?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-rule px-6 py-4.5">
      <div className="min-w-0 flex-1">
        <h2 className="text-[1rem] font-semibold tracking-[-0.015em]">{title}</h2>
        {description && <p className="mt-0.5 text-[0.82rem] text-muted">{description}</p>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

const TONES: Record<DisplayStatus["tone"], { pill: string; dot: string }> = {
  amber: { pill: "bg-turmeric-soft text-turmeric-ink", dot: "bg-turmeric" },
  blue: { pill: "bg-sky-soft text-sky", dot: "bg-sky" },
  slate: { pill: "bg-well text-ink-soft", dot: "bg-faint" },
  green: { pill: "bg-pandan-soft text-pandan", dot: "bg-pandan" },
  red: { pill: "bg-chili-soft text-chili", dot: "bg-chili" },
};

export function StatusPill({ status }: { status: DisplayStatus }) {
  const t = TONES[status.tone];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[0.76rem] font-semibold leading-none ${t.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot} ${status.key === "processing" ? "animate-pulse" : ""}`} aria-hidden />
      {status.label}
    </span>
  );
}

// Every case and result carries where it came from.
export function SourceBadge({ source }: { source: CaseSource }) {
  return source === "sandbox" ? (
    <span className="inline-flex items-center rounded-md bg-sky-soft px-1.5 py-0.5 text-[0.68rem] font-semibold leading-none text-sky">Sandbox</span>
  ) : (
    <span className="inline-flex items-center rounded-md bg-turmeric-soft px-1.5 py-0.5 text-[0.68rem] font-semibold leading-none text-turmeric-ink">Simulated</span>
  );
}

export function AdjudicationBadge({ source }: { source: CaseSource }) {
  return (
    <span className="inline-flex items-center rounded-md bg-brand-soft px-1.5 py-0.5 text-[0.68rem] font-semibold leading-none text-brand-ink">
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
  const color = d.overdue ? "bg-chili" : d.urgent ? "bg-turmeric" : "bg-brand/70";
  return (
    <div className="w-28">
      <Deadline due={due} open={open} />
      <div className="mt-1.5 h-1 rounded-full bg-well" aria-hidden>
        <div className={`h-1 rounded-full ${color}`} style={{ width: `${d.overdue ? 100 : pct}%` }} />
      </div>
    </div>
  );
}

export function PageHeader({ title, intro, children }: { title: string; intro?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-[64ch]">
        <h1 className="text-[1.85rem] font-bold md:text-[2.2rem]">{title}</h1>
        {intro && <p className="mt-2 text-[0.95rem] text-muted">{intro}</p>}
      </div>
      {children && <div className="flex flex-wrap items-start gap-2">{children}</div>}
    </header>
  );
}

export function Stat({ label, value, tone = "", icon, children }: { label: string; value: string; tone?: string; icon?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-[20px] bg-surface p-5 shadow-[var(--shadow-soft)] ring-1 ring-rule/70 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.82rem] font-medium text-muted">{label}</p>
        {icon && <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-well text-muted">{icon}</span>}
      </div>
      <p className={`num mt-3 text-[1.45rem] font-bold leading-none sm:text-[1.75rem] 2xl:text-[1.95rem] ${tone || "text-ink"}`}>{value}</p>
      {children && <p className="mt-2.5 text-[0.78rem] leading-snug text-muted">{children}</p>}
    </div>
  );
}

// The one gradient card: money PayPal has confirmed as kept, styled like a
// payment card. Used once per screen at most.
export function GradientStat({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="brand-gradient grain relative min-w-0 overflow-hidden rounded-[20px] p-5 text-white shadow-[var(--shadow-brand)] sm:p-6">
      <span className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full border border-white/15" aria-hidden />
      <span className="pointer-events-none absolute -right-2 -top-6 h-24 w-24 rounded-full border border-white/10" aria-hidden />
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[0.82rem] font-medium text-white/80">{label}</p>
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25" aria-hidden><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span>
        </div>
        <p className="num mt-3 text-[1.45rem] font-bold leading-none sm:text-[1.75rem] 2xl:text-[1.95rem]">{value}</p>
        {children && <p className="mt-2.5 text-[0.78rem] leading-snug text-white/75">{children}</p>}
      </div>
    </div>
  );
}

export function Empty({ title, children, icon }: { title: string; children?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="rounded-[20px] bg-paper px-6 py-14 text-center">
      {icon && <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-brand shadow-[var(--shadow-soft)]">{icon}</div>}
      <p className="text-[1.05rem] font-semibold">{title}</p>
      {children && <div className="mx-auto mt-1.5 max-w-[52ch] text-sm text-muted">{children}</div>}
    </div>
  );
}

// A soft squircle with the item's initials, so rows are easy to scan.
const TILE_TONES = ["bg-[#efedff] text-[#4338ca]", "bg-[#fff1e0] text-[#9a5b00]", "bg-[#e5f6ee] text-[#0f7a57]", "bg-[#fdebf3] text-[#a3245e]", "bg-[#e7f3fb] text-[#1e6a96]"];
export function ItemTile({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const words = name.replace(/[^A-Za-z ]/g, " ").split(/\s+/).filter(Boolean);
  const initials = ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "?";
  const tone = TILE_TONES[[...name].reduce((s, ch) => s + ch.charCodeAt(0), 0) % TILE_TONES.length];
  const box = size === "lg" ? "h-13 w-13 rounded-2xl text-base" : "h-10 w-10 rounded-xl text-[0.8rem]";
  return (
    <span className={`flex shrink-0 items-center justify-center font-bold tracking-[-0.02em] ${box} ${tone}`} aria-hidden>
      {initials}
    </span>
  );
}
