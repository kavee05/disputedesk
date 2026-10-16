# DisputeDesk progress

Deadline: Nov 12, 2026, 12:00pm PST.

## Done
- Phase 0 scaffold: git repo, MIT LICENSE, `.gitignore` (all `.env*` except the example), `.env.example`.
- Sandbox probe scripts in `scripts/feasibility/`:
  - `auth.ts` gets a token and lists the app's relevant scopes
  - `orders.ts` creates 5 goods-and-services checkout orders (D1 to D4 plus C1), captures them, adds tracking to D1 and D2, reads it back
  - `disputes.ts` list, map disputes to orders, inspect, and link-gated steps (final-state actions need `--final`)
  - `chargeback.ts` tries the sandbox-only chargeback endpoint on C1
  - `toolkit.ts` calls the PayPal Agent Toolkit dispute tools directly, without an LLM
- Desk research: the Agent Toolkit (v1.11.0) has only `list_disputes`, `get_dispute`, `accept_dispute_claim` for disputes, so evidence, offers and messages must go through REST.

- First sandbox app (non-US seller) left every capture PENDING with `RECEIVING_PREFERENCE_MANDATES_MANUAL_ACTION`. Switched to a new US Business + US Personal pair and a new Merchant app (`APP-3MW60764R97604927`, has dispute, tracking, invoicing and transaction search scopes).
- 5 goods-and-services orders captured on the US app, all `COMPLETED` per `GET /v2/payments/captures/{id}`. Tracking added to D1 and D2 and read back via both `/v2/checkout/orders/{id}` and `/v1/shipping/trackers`.

| Case | Amount | Order | Capture (transaction) | Tracking |
|---|---|---|---|---|
| D1 | $48.00 | 4P95273424320082B | 62U865259J177000P | USPS 9400111899223197428490 |
| D2 | $32.00 | 0RW29247BH657370J | 92777357PE885964Y | USPS 9400111899223197428506 |
| D3 | $15.00 | 4JW9086092499472F | 5AC91803V9139624P | none |
| D4 | $27.00 | 8GW19372YB480913V | 4E760678YD342835N | none |
| C1 | $20.00 | 50H90340LE833200X | 98X219887P2678732 | none, reserved for chargeback probe |

## Next
4. Kavee opens disputes D1 to D4 in the sandbox Resolution Center. Run `probe:chargeback` on C1.
5. Run `probe:disputes -- map`, then the link-gated steps per case, then `probe:toolkit`.
6. Write FEASIBILITY.md and stop for review.

## Open questions
- Does the seller app have permission to call `process-chargeback`? (probe will tell)
- Does the sandbox accept a made-up USPS tracking number, and does a Resolution Center dispute reach `UNDER_REVIEW` so `adjudicate` shows up?
- Rules agreed: anything settled by the sandbox `adjudicate` endpoint is labelled "Sandbox adjudication". Money counts as defended only when PayPal confirms it.
