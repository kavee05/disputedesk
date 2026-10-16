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

function Mark() {
  // Scale glyph inside a rounded square: the brand's one symbol.
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-turmeric text-night shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)]">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
      <Link href="/" onClick={onNavigate} className="flex items-center gap-3 px-5 pt-6">
        <Mark />
        <span className="min-w-0">
          <span className="block font-[family-name:var(--font-display)] text-[1.2rem] font-bold leading-tight text-white">DisputeDesk</span>
          <span className="block text-xs text-white/55">Defence for small sellers</span>
        </span>
      </Link>

      <div className="mx-5 mt-6 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5">
        <p className="flex items-center gap-2 text-[0.8rem] font-semibold text-white">
          <span className={`h-2 w-2 rounded-full ${mode === "sandbox" ? "bg-sky-300" : "bg-turmeric"}`} aria-hidden />
          {mode === "sandbox" ? "PayPal Sandbox" : "Demo mode"}
        </p>
        <p className="mt-0.5 text-xs leading-snug text-white/55">{mode === "sandbox" ? "Live test data from PayPal" : "Simulated PayPal, fictional cases"}</p>
      </div>

      <nav aria-label="Main" className="mt-5 flex flex-col gap-0.5 px-3">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const on = active(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={on ? "page" : undefined}
              className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.92rem] font-medium transition-colors ${
                on ? "bg-white/[0.09] text-white" : "text-white/65 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              {on && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-turmeric" aria-hidden />}
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3 px-5 pb-6 pt-8">
        {readOnly && (
          <Link href="/unlock" onClick={onNavigate} className="flex items-center gap-2 text-xs text-white/70 hover:text-white">
            <Lock className="h-3.5 w-3.5" aria-hidden /> Read-only. Enter passcode
          </Link>
        )}
        <div className="flex items-start gap-2.5 rounded-lg bg-white/[0.04] px-3 py-2.5">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-turmeric" aria-hidden />
          <p className="min-w-0 text-xs leading-snug text-white/60">
            Reasoning by
            <span className="block break-words text-white/85">{aiLabel}</span>
          </p>
        </div>
      </div>
    </div>
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
    <div className="lg:flex">
      {/* Desktop sidebar */}
      <aside className="batik sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto lg:block">
        <SidebarBody mode={mode} aiLabel={aiLabel} readOnly={readOnly} />
      </aside>

      {/* Mobile top bar */}
      <div className="batik sticky top-0 z-30 flex items-center justify-between px-4 py-3 lg:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <Mark />
          <span className="font-[family-name:var(--font-display)] text-lg font-bold text-white">DisputeDesk</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-white/10"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-night/50 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="batik absolute inset-y-0 left-0 w-[17rem] max-w-[85vw] shadow-[var(--shadow-lift)]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-5 flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            <SidebarBody mode={mode} aiLabel={aiLabel} readOnly={readOnly} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <main className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-6 sm:px-6 lg:px-10 lg:pt-10">{children}</main>
      </div>
    </div>
  );
}
