import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-xl rounded-lg border border-rule bg-surface p-6">
      <h1 className="text-2xl font-bold">That dispute is not here</h1>
      <p className="mt-2 text-ink-soft">It may have been cleared by a reset, or the link is wrong. Sync from PayPal to load the latest disputes.</p>
      <Link href="/" className="mt-4 inline-block font-bold underline underline-offset-4">
        Go to disputes
      </Link>
    </div>
  );
}
