"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FlaskConical, Gauge, Inbox, Lock, Menu, ScrollText, SlidersHorizontal, Sparkles, X } from "lucide-react";

const LINKS = [
  { href: "/", label: "Disputes", icon: Inbox },
  { href: "/impact", label: "Impact", icon: Gauge },
  { href: "/policy", label: "Policy", icon: SlidersHorizontal },
  { href: "/audit", label: "Audit log", icon: ScrollText },
  { href: "/demo", label: "Demo cases", icon: FlaskConical },
];

export function Mark({ size = "md" }: { size?: "md" | "sm" }) {
  // Scale glyph on the brand gradient: the product's one symbol.
  const box = size === "md" ? "h-10 w-10 rounded-[12px]" : "h-9 w-9 rounded-[11px]";
  return (
    <span className={`brand-gradient grain flex shrink-0 items-center justify-center text-white shadow-[var(--shadow-brand)] ${box}`}>
      <svg viewBox="0 0 24 24" className="relative z-10 h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3.5 3.5 0 0 0 6 0L5 7zm14 0-3 7a3.5 3.5 0 0 0 6 0l-3-7z" />
      </svg>
    </span>
  );
}

function SidebarBody({ mode, aiLabel, readOnly, onNavigate }: { mode: "sandbox" | "demo"; aiLabel: string; readOnly: boolean; onNavigate?: () => void }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/cases") : path.startsWith(href));
  return (
    <div className="flex h-full flex-col">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-3 px-6 pt-7">
        <Mark />
        <span className="min-w-0">
          <span className="block text-[1.12rem] font-bold leading-tight tracking-[-0.02em] text-ink">DisputeDesk</span>
          <span className="block text-xs text-muted">Defence for small sellers</span>
        </span>
      </Link>

      <div className="mx-6 mt-7 flex items-start gap-2.5 rounded-xl bg-well px-3 py-2.5">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${mode === "sandbox" ? "bg-sky" : "bg-turmeric"}`} aria-hidden />
        <span className="min-w-0">
          <span className="block text-[0.8rem] font-semibold text-ink">{mode === "sandbox" ? "PayPal Sandbox" : "Demo mode"}</span>
          <span className="block text-[0.72rem] leading-snug text-muted">{mode === "sandbox" ? "Test money only, status from PayPal" : "Simulated PayPal, no real money moves"}</span>
        </span>
      </div>

      <nav aria-label="Main" className="mt-7 flex flex-col gap-1.5 px-4">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const on = active(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={on ? "page" : undefined}
              className={`group flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-[0.9rem] font-medium transition-all duration-200 active:scale-[0.98] ${
                on ? "bg-brand-soft text-brand-ink" : "text-muted hover:bg-well hover:text-ink"
              }`}
            >
              <Icon className={`h-[18px] w-[18px] shrink-0 transition-colors ${on ? "text-brand" : "text-faint group-hover:text-muted"}`} strokeWidth={1.75} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3 px-6 pb-7 pt-8">
        {readOnly && (
          <Link href="/unlock" onClick={onNavigate} className="flex items-center gap-2 text-xs text-muted hover:text-ink">
            <Lock className="h-3.5 w-3.5" aria-hidden /> Read only. Enter passcode
          </Link>
        )}
        <div className="flex items-start gap-2.5 rounded-xl bg-well px-3 py-2.5">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} aria-hidden />
          <p className="min-w-0 text-[0.72rem] leading-snug text-muted">
            Reasoning by
            <span className="block break-words font-medium text-ink-soft">{aiLabel}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function CreditFooter() {
  return (
    <footer className="mt-16 flex flex-col gap-1 border-t border-rule pt-6 text-[0.8rem] text-muted sm:flex-row sm:items-center sm:justify-between">
      <p>
        Built by <span className="font-semibold text-ink-soft">Kaveetiran A/L Sitambaram</span>
      </p>
      <p>Coding assistant: Claude Code (Anthropic)</p>
    </footer>
  );
}

export function AppShell({ mode, aiLabel, readOnly, children }: { mode: "sandbox" | "demo"; aiLabel: string; readOnly: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:p-4">
      {/* The app frame: one deeply rounded container on desktop. */}
      <div className="min-h-dvh bg-paper lg:flex lg:min-h-[calc(100dvh-2rem)] lg:overflow-clip lg:rounded-[28px] lg:shadow-[var(--shadow-frame)]">
        <aside className="hidden w-64 shrink-0 border-r border-rule bg-surface lg:block lg:rounded-l-[28px]">
          <div className="sticky top-4 h-[calc(100dvh-2rem)] overflow-y-auto">
            <SidebarBody mode={mode} aiLabel={aiLabel} readOnly={readOnly} />
          </div>
        </aside>

        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-rule bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/" className="flex items-center gap-2.5">
            <Mark size="sm" />
            <span className="text-lg font-bold tracking-[-0.02em] text-ink">DisputeDesk</span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[0.68rem] font-semibold leading-none ${mode === "sandbox" ? "bg-sky-soft text-sky" : "bg-turmeric-soft text-turmeric-ink"}`}
              title={mode === "sandbox" ? "PayPal Sandbox: test accounts and test money only" : "Demo mode: simulated PayPal and fictional cases, no money moves"}
            >
              {mode === "sandbox" ? "Sandbox" : "Demo"}
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-well active:scale-[0.97]"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-[17rem] max-w-[85vw] rounded-r-[24px] bg-surface shadow-[var(--shadow-lift)]">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="absolute right-3 top-6 flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-well hover:text-ink"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
              <SidebarBody mode={mode} aiLabel={aiLabel} readOnly={readOnly} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <main id="main" className="mx-auto w-full max-w-[1160px] px-4 pb-10 pt-6 sm:px-6 lg:px-10 lg:pt-10">
            {children}
            <CreditFooter />
          </main>
        </div>
      </div>
    </div>
  );
}
