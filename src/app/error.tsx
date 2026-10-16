"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const paypal = /PayPal|sandbox/i.test(error.message);
  return (
    <div className="max-w-xl rounded-lg border border-chili/40 bg-surface p-6">
      <h1 className="text-2xl font-bold">This page could not load</h1>
      <p className="mt-2 text-ink-soft">
        {paypal ? "DisputeDesk could not reach PayPal Sandbox. Check the keys in your environment and that the sandbox is up, then try again." : error.message}
      </p>
      {paypal && <p className="mt-2 break-words text-sm text-muted">{error.message}</p>}
      <button type="button" onClick={reset} className="mt-4 min-h-10 rounded-md bg-ink px-4 py-2 font-bold text-white">
        Try again
      </button>
    </div>
  );
}
