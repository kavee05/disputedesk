"use client";

import { TriangleAlert } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const paypal = /PayPal|sandbox/i.test(error.message);
  return (
    <div className="max-w-xl rounded-[20px] bg-surface p-7 shadow-[var(--shadow-soft)] ring-1 ring-chili/20">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-chili-soft text-chili">
        <TriangleAlert className="h-5 w-5" aria-hidden />
      </span>
      <h1 className="mt-4 text-xl font-semibold">This page could not load</h1>
      <p className="mt-1.5 text-ink-soft">
        {paypal ? "DisputeDesk could not reach PayPal Sandbox. Check the keys in your environment and that the sandbox is up, then try again." : error.message}
      </p>
      {paypal && <p className="mt-2 break-words text-sm text-muted">{error.message}</p>}
      <button type="button" onClick={reset} className="mt-5 inline-flex min-h-9 items-center rounded-xl brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-brand)] hover:brightness-[1.06]">
        Try again
      </button>
    </div>
  );
}
