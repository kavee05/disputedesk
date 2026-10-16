"use client";

import { TriangleAlert } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const paypal = /PayPal|sandbox/i.test(error.message);
  return (
    <div className="max-w-xl rounded-xl border border-chili/30 bg-surface p-6 shadow-[var(--shadow-panel)]">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-chili-soft text-chili">
        <TriangleAlert className="h-5 w-5" aria-hidden />
      </span>
      <h1 className="mt-4 text-xl font-semibold">This page could not load</h1>
      <p className="mt-1.5 text-ink-soft">
        {paypal ? "DisputeDesk could not reach PayPal Sandbox. Check the keys in your environment and that the sandbox is up, then try again." : error.message}
      </p>
      {paypal && <p className="mt-2 break-words text-sm text-muted">{error.message}</p>}
      <button type="button" onClick={reset} className="mt-5 inline-flex min-h-9 items-center rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink-soft">
        Try again
      </button>
    </div>
  );
}
