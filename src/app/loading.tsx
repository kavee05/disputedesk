export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-56 rounded bg-rule" />
      <div className="mt-3 h-4 w-96 max-w-full rounded bg-rule/70" />
      <div className="mt-8 h-40 rounded-lg bg-surface" />
    </div>
  );
}
