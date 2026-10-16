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

## Next
1. Kavee adds `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV=sandbox` to `.env.local`.
2. Run `probe:auth`, then `probe:orders -- create`. Kavee approves the 5 links as the sandbox buyer.
3. Run `probe:orders -- capture` and `-- status`, then `probe:chargeback`.
4. Kavee opens disputes D1 to D4 in the sandbox Resolution Center.
5. Run `probe:disputes -- map`, then the link-gated steps per case, then `probe:toolkit`.
6. Write FEASIBILITY.md and stop for review.

## Open questions
- Does the seller app have permission to call `process-chargeback`? (probe will tell)
- Does the sandbox accept a made-up USPS tracking number, and does a Resolution Center dispute reach `UNDER_REVIEW` so `adjudicate` shows up?
- Rules agreed: anything settled by the sandbox `adjudicate` endpoint is labelled "Sandbox adjudication". Money counts as defended only when PayPal confirms it.
