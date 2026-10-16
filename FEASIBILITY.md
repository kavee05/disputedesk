# DisputeDesk: PayPal Sandbox feasibility (Phase 0)

Checked on Oct 16 and 17, 2026 against `api-m.sandbox.paypal.com`. Every "yes" below comes from a real sandbox response, saved locally under `scripts/feasibility/results/` (gitignored because it holds sandbox buyer details). The probe scripts in `scripts/feasibility/` reproduce each row.

## Setup that worked

- **US** sandbox Business account (seller) and **US** sandbox Personal account (buyer).
- A Merchant REST app linked to the Business account with Customer disputes, Transaction search and Invoicing enabled. Its token carries `disputes/read-seller`, `disputes/update-seller`, `shipping/trackers/readwrite`, `invoicing`, `reporting/search/read`, `payments/refund`.
- Our first attempt used a non-US seller account. Every capture stayed `PENDING` with `RECEIVING_PREFERENCE_MANDATES_MANUAL_ACTION` and showed as "Unclaimed". Switching to a US seller fixed it at once. The README will say: use US sandbox accounts.

## Results

| Capability | Works in sandbox | Notes | Fallback |
|---|---|---|---|
| OAuth client credentials | yes | 200, token valid 9h | none needed |
| Create checkout order (goods and services) | yes | `POST /v2/checkout/orders` 200, buyer approves via `checkoutnow` link | none needed |
| Capture order | yes | 201. Capture `COMPLETED` once the seller is a US account. Read back with `GET /v2/payments/captures/{id}` | none needed |
| Add shipment tracking | yes | `POST /v2/checkout/orders/{id}/track` 201 (USPS) | none needed |
| Read tracking back | yes | Shows up on the order (`shipping.trackers`, status SHIPPED) and on `GET /v1/shipping/trackers?transaction_id=` | none needed |
| Capture hold while disputed | yes | After the buyer opens a case, captures flip to `PENDING` with reason `BUYER_COMPLAINT`. Useful real signal for the UI | n/a |
| Create dispute (buyer, Resolution Center UI) | yes, manual | 5 cases opened by hand, all visible to the seller API within a few minutes. IDs look like `PP-R-XXX-########` (not `PP-D-`) and are the same on both sides | Seed runs reuse a pool of hand-opened cases |
| Create dispute (API) | not tested | Needs a buyer-side `PayPal-Auth-Assertion` and Log in with PayPal consent. Our app does have the `disputes/create` scope | Manual case pool above |
| Simulated chargeback (`process-chargeback`) | not run yet | Needs a fresh payment with no dispute on it. Waiting for approval to create one | Manual case pool |
| List disputes | yes | `GET /v1/customer/disputes` 200. **New cases can take a few minutes to appear**: D3 and D4 were missing from the first list and showed up later | Poll, and look up by `disputed_transaction_id` |
| Filter by transaction | yes | `?disputed_transaction_id={capture id}` returns exactly one case per capture | n/a |
| Get dispute | yes | 200, includes status, stage, messages, evidences and HATEOAS links | n/a |
| Send message | yes | 200 on D2. Message shows in `messages[]` as SELLER. Status moved `WAITING_FOR_SELLER_RESPONSE` to `WAITING_FOR_BUYER_RESPONSE` | n/a |
| Make offer | PENDING | | |
| Escalate to claim | PENDING | | |
| Require evidence (sandbox only) | PENDING | | |
| Provide evidence | PENDING | | |
| Adjudicate (sandbox only) | PENDING | | |
| Accept claim | PENDING | | |
| Agent Toolkit `@paypal/agent-toolkit` 1.11.0 | partial | `list_disputes` and `get_dispute` return real data in sandbox. Only 3 dispute tools exist: list, get, accept claim. No evidence, offer, message or escalate tools. Output contains buyer name and email | Use the toolkit for reads, call REST for writes through our own allowlisted executor |

## Things the product has to handle

- **State changes are asynchronous.** After send-message, escalate or require-evidence the call returns 200 at once, but the dispute sits at `UNDER_REVIEW` with only a `self` link for a while before settling. The executor must re-fetch and show "Processing at PayPal" until it settles, never assume the end state.
- **Links change with every step.** On D2, sending a message removed the `make_offer` link because the case moved to waiting for the buyer. The agent must plan from the live links, not from a fixed script.
- **A buyer can file straight into the claim stage.** D1 arrived as `UNDER_REVIEW` in stage `CHARGEBACK` (PayPal's name for the claim stage) with no inquiry step, so `provide_evidence` was not offered until we asked for seller evidence.
- **Personal data.** Dispute payloads include buyer name and email. These stay in our database and are stripped from the model context.
