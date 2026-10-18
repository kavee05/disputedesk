import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-xl rounded-[20px] bg-surface p-7 shadow-[var(--shadow-soft)] ring-1 ring-rule/70">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <SearchX className="h-5 w-5" aria-hidden />
      </span>
      <h1 className="mt-4 text-xl font-semibold">That dispute is not here</h1>
      <p className="mt-1.5 text-ink-soft">It may have been cleared by a reset, or the link is wrong. Sync from PayPal to load the latest disputes.</p>
      <Link href="/" className="mt-5 inline-flex min-h-9 items-center rounded-xl brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-brand)] hover:brightness-[1.06]">
        Go to disputes
      </Link>
    </div>
  );
}
