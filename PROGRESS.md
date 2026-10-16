# DisputeDesk progress

Deadline: Nov 12, 2026, 12:00pm PST.

## Done

**Phase 0: feasibility** ([FEASIBILITY.md](FEASIBILITY.md))
- Probed the real PayPal Sandbox: orders, captures, tracking, all dispute actions, Agent Toolkit.
- Learned: use US sandbox accounts; the sandbox only accepts evidence type OTHER; actions settle asynchronously; the refund record updates before the dispute record; the adjudicate link appears 18 to 28 minutes after evidence.
- Real results: D1 won and D4 lost through sandbox adjudication, D3 refunded through accept-claim. D2 and C1 left open.

**Phase 1: core engine**
- PayPal client with retries and redacted request logging. Sandbox gateway and a labelled simulator that copies measured sandbox behaviour.
- Case model, sync, evidence collector with personal data scrubbing, demo seed of eight cases.

**Phase 2: agent pipeline**
- Case Analyst and Evidence Writer on Gemini (`gemini-3.5-flash-lite` with `gemini-3.8-flash` as fallback, thinking level low, a few seconds per step), Claude optional. Schema-constrained JSON, validated with zod.
- Expected value in code. Citation checks. Deterministic Policy Gate. Allowlisted, link-gated Executor that stores PayPal responses verbatim.
- Time budget with a labelled offline fallback when the AI is slow or down.

**Phase 3: product UI**
- Disputes inbox, case page with the four steps and the fight-or-refund scale, editable draft with approve and reject, Policy, Audit log, Impact, Demo cases (reset, sandbox test-order kit, guide), passcode unlock, error and empty states.
- Checked 11 pages at 320, 375, 768, 1024, 1280 and 1440 pixels with an overlap and overflow script, plus screenshots at phone width. No issues left.
- Tested end to end in demo mode and against the real sandbox (sync, real AI run on C1 that stopped at the gate, nothing sent).

**Phase 4: submission package**
- README (setup, architecture diagram, real vs simulated, AI tools, responsible design, limitations), DEVPOST.md, DEMO_SCRIPT.md, SUBMISSION_CHECKLIST.md, render.yaml.

**Tests:** 33 passing (`npm test`).

## Next (needs Kavee)

1. Push to a public GitHub repo.
2. Deploy to Render with a Gemini key (steps in SUBMISSION_CHECKLIST.md), then fill in the two URL placeholders.
3. Prepare the sandbox cases and record the video from DEMO_SCRIPT.md.
4. Fill in the Devpost form.

## Notes and open questions

- The local sandbox policy currently has automatic actions **off** (set during testing so nothing was sent to PayPal by accident). Turn it back on in Policy before recording scene 3 if you want the AUTO path visible.
- The chargeback simulation probe (`process-chargeback`) was never run. It needs a fresh payment and your approval. It is not needed for the submission.
- Evidence file uploads (photos) are a known gap, listed under Limitations.
