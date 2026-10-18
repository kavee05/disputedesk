import type { ExpectedValue } from "@/lib/agent/ev";
import { money } from "./ui";

// The fight-or-refund balance. The beam tips toward the option that leaves
// the seller with more money, by an angle proportional to the difference.
export function Scale({ ev, currency }: { ev: ExpectedValue; currency: string }) {
  const ratio = ev.amount > 0 ? Math.max(-1, Math.min(1, ev.advantage / ev.amount)) : 0;
  const angle = ratio * 14; // fight is on the right; a positive angle tips the right pan down
  const fightBetter = ev.favours === "FIGHT";
  return (
    <figure className="rounded-2xl bg-paper p-4 ring-1 ring-rule/80 sm:p-5">
      <svg viewBox="0 20 320 110" className="mx-auto block h-auto w-full max-w-[420px]" role="img" aria-label={`Fighting ${fightBetter ? "is worth more" : "is worth less"} than refunding`}>
        <polygon points="160,62 146,110 174,110" fill="#111a3a" />
        <rect x="120" y="108" width="80" height="6" rx="3" fill="#111a3a" />
        <g className="scale-beam" style={{ transform: `rotate(${angle}deg)`, transformOrigin: "160px 59px" }}>
          <rect x="30" y="56" width="260" height="6" rx="3" fill="#111a3a" />
          <circle cx="160" cy="59" r="7" fill="#5b4fe9" />
          <line x1="44" y1="59" x2="44" y2="78" stroke="#111a3a" strokeWidth="2" />
          <line x1="276" y1="59" x2="276" y2="78" stroke="#111a3a" strokeWidth="2" />
          <path d="M14 78 h60 a30 12 0 0 1 -60 0z" fill={fightBetter ? "#dcdfe9" : "#e0464b"} />
          <path d="M246 78 h60 a30 12 0 0 1 -60 0z" fill={fightBetter ? "#12946a" : "#dcdfe9"} />
        </g>
      </svg>
      <figcaption className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted">Refund now</p>
          <p className="num text-lg font-bold sm:text-xl">{money(ev.refundOutcome, currency)}</p>
          <p className="text-muted">You lose the full amount.</p>
        </div>
        <div className="text-right">
          <p className="text-muted">Fight, on average</p>
          <p className={`num text-lg font-bold sm:text-xl ${fightBetter ? "text-pandan" : ""}`}>{money(ev.fightOutcome, currency)}</p>
          <p className="text-muted">
            {Math.round(ev.winProbability * 100)}% chance to keep {money(ev.amount, currency)}, minus about {ev.reviewMinutes} minutes of your time ({money(ev.timeCost, currency)}).
          </p>
        </div>
      </figcaption>
    </figure>
  );
}
