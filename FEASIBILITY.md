# DisputeDesk: PayPal Sandbox feasibility (Phase 0)

Checked on Oct 16, 2026 against `api-m.sandbox.paypal.com`. Every "yes" below comes from a real sandbox response, saved locally under `scripts/feasibility/results/` (gitignored because it holds sandbox buyer details). The probe scripts in `scripts/feasibility/` reproduce each row. Every dispute action was link-gated: we fetched the dispute first and only called an action when PayPal offered its HATEOAS link.

## Setup that worked

- **US** sandbox Business account (seller) and **US** sandbox Personal account (buyer).
- A Merchant REST app linked to the Business account with Customer disputes, Transaction search and Invoicing enabled. Its token carries `disputes/read-seller`, `disputes/update-seller`, `disputes/create`, `shipping/trackers/readwrite`, `invoicing`, `reporting/search/read` and `payments/refund`.
- Our first attempt used a non-US seller account. Every capture stayed `PENDING` with `RECEIVING_PREFERENCE_MANDATES_MANUAL_ACTION` and showed as "Unclaimed" in the sandbox UI. Switching to a US seller fixed it straight away. The README will say: use US sandbox accounts.

## Test cases

| Case | Amount | Capture (transaction) | Dispute ID | Reason as filed | Purpose |
|---|---|---|---|---|---|
| D1 | $48.00 | 62U865259J177000P | PP-R-BFQ-10193073 | Not received, filed straight into the claim stage | Evidence with tracking, then seller-favor outcome |
| D2 | $32.00 | 92777357PE885964Y | PP-R-STL-10193074 | Not as described | Message, offer, escalate, evidence |
| D3 | $15.00 | 5AC91803V9139624P | PP-R-UDE-10193075 | Not received | Accept claim and refund |
| D4 | $27.00 | 4E760678YD342835N | PP-R-ZKR-10193076 | Not received | Escalate, evidence, buyer-favor outcome |
| C1 | $20.00 | 98X219887P2678732 | PP-R-ZPW-10193072 | Not received (opened by accident) | Spare, untouched |

## Results

| Capability | Works in sandbox | Notes | Fallback |
|---|---|---|---|
| OAuth client credentials | yes | 200, token valid 9h | none needed |
| Create checkout order (goods and services) | yes | `POST /v2/checkout/orders` 200. The buyer approves through the `checkoutnow` link | none needed |
| Capture order | yes | 201. Capture is `COMPLETED` once the seller is a US account. Read back with `GET /v2/payments/captures/{id}` | none needed |
| Add shipment tracking | yes | `POST /v2/checkout/orders/{id}/track` 201 (USPS) | none needed |
| Read tracking back | yes | On the order (`shipping.trackers`, status SHIPPED) and on `GET /v1/shipping/trackers?transaction_id=` | none needed |
| Capture hold while disputed | yes | Once a case is open the capture flips to `PENDING` with reason `BUYER_COMPLAINT` | n/a |
| Create dispute (buyer, Resolution Center UI) | yes, manual | 5 cases opened by hand, all visible to the seller API. IDs look like `PP-R-XXX-########` (not `PP-D-`) and match on both sides | Demo runs on a pool of hand-opened cases |
| Create dispute (API) | not attempted | Needs a buyer-side `PayPal-Auth-Assertion` and Log in with PayPal consent, which a seller app cannot do on its own | Manual case pool |
| Simulated chargeback (`process-chargeback`) | not run | Needs a fresh payment with no dispute on it. C1 got a real dispute by accident, so the probe is waiting for your approval to create a new $20 payment | Manual case pool |
| List disputes | yes | `GET /v1/customer/disputes` 200. New cases can take a few minutes to appear: D3 and D4 were missing from the first list and showed up later | Look up by `disputed_transaction_id` and poll |
| Filter by transaction | yes | `?disputed_transaction_id={capture id}` returns exactly the matching case | n/a |
| Get dispute | yes | 200, with status, `dispute_state`, stage, messages, evidences, `allowed_response_options`, `refund_details`, `fund_movements` and links | n/a |
| Send message | yes | D2: 200. The message shows in `messages[]` as SELLER. Status went from `WAITING_FOR_SELLER_RESPONSE` to `WAITING_FOR_BUYER_RESPONSE` | n/a |
| Make offer | not available | D2: the link was present before the message, then gone after it (status `WAITING_FOR_BUYER_RESPONSE`). Recorded as "not available at this stage", not forced. C1 and D3 still showed the link while untouched | Offer must be sent before any message, or not at all |
| Escalate to claim | yes | D2 and D4: 200. About 2 to 4 minutes later both were in stage `CHARGEBACK` (the claim stage), `WAITING_FOR_SELLER_RESPONSE`, with links `accept_claim` and `provide_evidence` | n/a |
| Require evidence (sandbox only) | yes | D1: 200 while `UNDER_REVIEW`. The case moved to `WAITING_FOR_SELLER_RESPONSE` and PayPal listed the evidence it wanted from the seller | n/a |
| Provide evidence | yes, type `OTHER` only | See the evidence table below | Put tracking and other facts in the `OTHER` notes |
| Accept claim (full refund) | yes | D3: 200. Refund confirmed by PayPal, see the refund section below | n/a |
| Adjudicate (sandbox only) | yes, after a wait | **Sandbox adjudication.** The link only appears 18 to 28 minutes after seller evidence puts a case into review. D1 SELLER_FAVOR and D4 BUYER_FAVOR both returned 200 and resolved about 2.5 minutes later. Timings below | Show "Under review at PayPal" until the link appears |
| Agent Toolkit `@paypal/agent-toolkit` 1.11.0 | partial | `list_disputes` and `get_dispute` return real sandbox data. Only 3 dispute tools exist: list, get, accept claim. No evidence, offer, message or escalate tools. Output includes buyer name and email | Toolkit for reads, REST for writes through our own allowlisted executor |

## Evidence types per dispute

| Case | Stage when submitted | Evidence type | Result |
|---|---|---|---|
| D1 | Claim, `WAITING_FOR_SELLER_RESPONSE` (PayPal had requested `PROOF_OF_FULFILLMENT`, `PROOF_OF_REFUND`, `PROOF_OF_DELIVERY_SIGNATURE`) | `PROOF_OF_FULFILLMENT` with `evidence_info.tracking_info` (USPS 9400111899223197428490) | **Rejected.** HTTP 400 `INVALID_REQUEST`, details `[{"issue":"EVIDENCE_TYPE_IS_NOT_ALLOWED"}]`, debug_id f42211193605d. Dispute unchanged |
| D1 | same | `OTHER`, carrier and tracking number in `notes` | **Accepted**, 200. Moved to `UNDER_REVIEW` |
| D2 | Claim, after escalation | `OTHER` with notes | **Accepted**, 200. Moved to `UNDER_REVIEW` |
| D4 | Claim, after escalation | `OTHER` with notes | **Accepted**, 200. Moved to `UNDER_REVIEW` |
| D3 | n/a | none submitted (accepted the claim instead) | n/a |

This matches PayPal's sandbox test guide, which says to use `OTHER` for internal-dispute test conditions. In the sandbox the product sends `OTHER` and writes the tracking details into the notes. The `PROOF_OF_FULFILLMENT` path stays in the code behind the same adapter so it can be switched on for live use, and the UI says which type was sent.

## Refunds: the refund resource is the source of truth

D3 timeline (UTC, Oct 16):

| Time | Source | What it said |
|---|---|---|
| 16:52:00 | `GET dispute` | `WAITING_FOR_SELLER_RESPONSE`, no refund |
| 16:52:03.664 | `fund_movements` | Seller DEBIT and buyer CREDIT of $15.00, reason `DISPUTE_SETTLEMENT` |
| 16:52:04 | `POST accept-claim` | 200, body is only a link to the dispute |
| 16:52:06 | `GET dispute` | `UNDER_REVIEW`, **no outcome**, but `refund_details.transactions` already lists refund `7TH269592C008470N` |
| 16:53:57 | dispute `update_time` | Dispute record moves to `RESOLVED` |
| 16:54:04 | `GET /v2/payments/captures/5AC91803V9139624P` | `REFUNDED` |
| 16:54:25 | `GET /v2/payments/refunds/7TH269592C008470N` | **`COMPLETED`, $15.00 USD** |
| 16:58:45 | `GET dispute` (first read after resolving) | `RESOLVED`, outcome `RESOLVED_BUYER_FAVOUR`, reason `SELLER_ISSUED_REFUND` |

Rules for the product:
1. Show "Refunded" only after `GET /v2/payments/refunds/{id}` returns `COMPLETED` (the refund ID comes from the dispute's `refund_details`). The capture showing `REFUNDED` is a second check.
2. The `accept-claim` 200 response is not proof of anything. It contains only a link.
3. For about two minutes the dispute record said `UNDER_REVIEW` with no outcome while the money had already moved. The dispute outcome is used for the case status, never for money.

## Things the product has to handle

- **State changes are asynchronous.** After send-message, escalate, require-evidence, evidence or accept-claim, the call returns 200 at once, but the dispute sits in `UNDER_REVIEW` with only a `self` link for 1 to 4 minutes before settling. The executor re-fetches and shows "Processing at PayPal" until it settles.
- **Links change with every step.** Sending a message on D2 removed the `make_offer` link. The agent plans from the live links, never from a fixed script.
- **A buyer can file straight into the claim stage.** D1 arrived in stage `CHARGEBACK` (PayPal's name for the claim stage) with no inquiry step.
- **Personal data.** Dispute payloads include buyer name and email. These stay in our database and are stripped before anything reaches the model.

## Sandbox adjudication (seller-favor and buyer-favor outcomes)

`adjudicate` is a sandbox-only endpoint that stands in for PayPal's own decision. Anything settled this way is labelled **"Sandbox adjudication"** in the app and README, so nobody mistakes it for a real PayPal ruling.

**What makes the link appear.** PayPal's docs give only two preconditions: status `UNDER_REVIEW`, and the `adjudicate` link present on the dispute. They say nothing about reason, stage or evidence type. What we saw is that the link shows up only after a delay once a case enters review:

| Case | Entered review | `adjudicate` link first seen | Wait |
|---|---|---|---|
| D1 (first time, straight after the buyer filed) | 10:27 filed, 10:33 under review without the link | by 10:51 | 18 to 24 min |
| D1 (after our evidence) | 16:52:43 evidence accepted | 17:11:32 (dispute `update_time` 17:10:52) | about 18 min |
| D2 (after our evidence) | 16:51:32 evidence accepted | 17:19:49 (`update_time` 17:19:33) | about 28 min |
| D4 (after our evidence) | 16:52:50 evidence accepted | 17:21:53 (`update_time` 17:20:53) | about 28 min |

While waiting, each case showed `UNDER_REVIEW`, `dispute_state` `UNDER_PAYPAL_REVIEW`, links `self` and `provide_supporting_info` only. When the link arrived it came with `accept_claim`, `require_evidence` and `provide_supporting_info`. We concluded too early that it never appears: our first watch window was only about 8 minutes.

**Results** (each confirmed with a fresh GET showing the link immediately before the call):

| Case | Call (UTC) | PayPal response | Outcome from PayPal |
|---|---|---|---|
| D1 $48 | 17:37:11 `adjudicate` SELLER_FAVOR | 200, body is only a self link | 17:38:34 hold of $45.83 released. 17:39:43 dispute `RESOLVED`, `RESOLVED_SELLER_FAVOUR`, reason `INELIGIBLE_BUYER_PROTECTION_POLICY`. Capture back to `COMPLETED` |
| D4 $27 | 17:37:17 `adjudicate` BUYER_FAVOR | 200, body is only a self link | 17:38:35 `DISPUTE_SETTLEMENT` $27.00. Refund `26E53292PX322524L` `COMPLETED` $27.00. Capture `REFUNDED`. 17:39:43 dispute `RESOLVED`, `RESOLVED_BUYER_FAVOUR`, reason `INELIGIBLE_SELLER_PROTECTION_POLICY` |
| D2 $32 | not adjudicated on purpose | n/a | Left in review with the link available, as an unfinished case for the demo |
| C1 $20 | untouched on purpose | n/a | Still `WAITING_FOR_SELLER_RESPONSE`, a fresh case for the demo |

**Recommendation for the demo.** We can show a real, PayPal-confirmed seller win, but only with planning. Submit evidence on a case at least 30 minutes before recording, then press the "Sandbox adjudication" tool once the link is offered. The app shows "Under review at PayPal" until then, never a guessed result. Money counts as "defended" only when the dispute record says `RESOLVED_SELLER_FAVOUR` and the capture shows the hold released (`COMPLETED`).

## Summary: safe to build or needs a fallback

| Area | Verdict |
|---|---|
| Orders, captures, tracking | Safe to build. All real |
| Reading disputes (list, get, filter by transaction) | Safe to build. Poll for a few minutes after a case is opened |
| Evidence submission | Safe to build with `OTHER`. Typed evidence is behind an adapter and labelled |
| Messages and escalation | Safe to build. Link-gated |
| Offers | Safe to build, but only offered while the link is present (before any message) |
| Accept claim and refund status | Safe to build. Status comes from the refund resource |
| Seller-favor outcome | Safe to build as "Sandbox adjudication", with a 20 to 30 minute wait after evidence. Fallback while waiting: "Under review at PayPal" |
| Creating disputes for the demo | Needs a fallback: a pool of hand-opened sandbox cases, refreshed before recording. Chargeback API untested |
| Agent Toolkit | Use for reads only. Writes go through our REST executor |
