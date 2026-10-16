import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-xl rounded-xl border border-rule bg-surface p-6 shadow-[var(--shadow-panel)]">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-paper text-ink-soft">
        <SearchX className="h-5 w-5" aria-hidden />
      </span>
      <h1 className="mt-4 text-xl font-semibold">That dispute is not here</h1>
      <p className="mt-1.5 text-ink-soft">It may have been cleared by a reset, or the link is wrong. Sync from PayPal to load the latest disputes.</p>
      <Link href="/" className="mt-5 inline-flex min-h-9 items-center rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink-soft">
        Go to disputes
      </Link>
    </div>
  );
}
