export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-56 rounded-lg bg-rule" />
      <div className="mt-3 h-4 w-96 max-w-full rounded bg-rule/70" />
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl border border-rule bg-surface" />
        ))}
      </div>
      <div className="mt-6 h-72 rounded-xl border border-rule bg-surface" />
    </div>
  );
}
