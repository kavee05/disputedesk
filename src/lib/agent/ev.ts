// Expected value of fighting versus refunding, computed in code from the
// analyst's win probability and the seller's own numbers.
//
// Refund now: the seller loses the disputed amount.
// Fight: the seller loses the amount only if they lose (1 - p), and spends
// review time either way (minutes with DisputeDesk, valued at their hourly rate).

export type ExpectedValue = {
  winProbability: number;
  amount: number;
  reviewMinutes: number;
  timeCost: number;
  fightOutcome: number; // expected money change if they fight
  refundOutcome: number; // money change if they refund now
  advantage: number; // fightOutcome - refundOutcome
  favours: "FIGHT" | "REFUND";
};

export function expectedValue(p: number, amount: number, hourlyValue: number, reviewMinutes = 10): ExpectedValue {
  const timeCost = (reviewMinutes / 60) * hourlyValue;
  const fightOutcome = -(1 - p) * amount - timeCost;
  const refundOutcome = -amount;
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    winProbability: p,
    amount,
    reviewMinutes,
    timeCost: round(timeCost),
    fightOutcome: round(fightOutcome),
    refundOutcome: round(refundOutcome),
    advantage: round(fightOutcome - refundOutcome),
    favours: fightOutcome > refundOutcome ? "FIGHT" : "REFUND",
  };
}
