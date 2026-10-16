"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Disputes" },
  { href: "/impact", label: "Impact" },
  { href: "/policy", label: "Policy" },
  { href: "/audit", label: "Audit log" },
  { href: "/demo", label: "Demo cases" },
];

export function Nav({ aiLabel, readOnly }: { aiLabel: string; readOnly: boolean }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/cases") : path.startsWith(href));
  return (
    <aside className="border-b border-rule bg-paper md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 md:block md:px-6 md:pt-8">
        <Link href="/" className="block">
          <span className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight text-ink">DisputeDesk</span>
          <span className="mt-0.5 hidden text-sm text-muted md:block">Your dispute lawyer, on call</span>
        </Link>
        {readOnly && (
          <Link href="/unlock" className="rounded-full border border-rule-strong px-3 py-1 text-xs text-muted md:mt-4 md:inline-block">
            Read-only
          </Link>
        )}
      </div>
      <nav aria-label="Main" className="mt-3 flex gap-1 overflow-x-auto px-3 pb-3 md:mt-8 md:flex-col md:overflow-visible md:px-3">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active(l.href) ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-[0.95rem] ${
              active(l.href) ? "bg-ink text-white" : "text-ink-soft hover:bg-surface"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <p className="hidden px-6 pt-6 text-xs leading-relaxed text-muted md:block">
        Reasoning by
        <br />
        <span className="text-ink-soft">{aiLabel}</span>
      </p>
    </aside>
  );
}
