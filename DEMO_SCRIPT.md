# DisputeDesk demo video script (2 minutes 40 seconds)

Record on the **real PayPal Sandbox** (dark blue "PayPal Sandbox" banner), not demo mode, so the PayPal result in the video is real. Use no music, or music you made yourself or that is clearly free for any use. Keep third-party logos and brand names off screen, apart from naming PayPal as the platform.

## Get ready the day before (about 45 minutes, mostly waiting)

The sandbox's decision tool only appears 20 to 30 minutes after evidence goes in, so the result in scene 5 has to be prepared ahead.

1. Start the app with your sandbox keys: `npm run dev`.
2. On **Demo cases**, press **Create test orders**, approve all four links as the sandbox buyer, then press **Capture approved orders**. All should show COMPLETED.
3. As the buyer at sandbox.paypal.com, open "I didn't receive my item" on the **rattan tote bag** (it has tracking). This is the case for scene 5. Leave the **batik scarf** (also tracked) unopened for now.
4. Sync, open the tote bag case, run the agent, approve the evidence. Note the time.
5. Wait at least 30 minutes. Refresh the case until the blue **Sandbox adjudication** panel appears. Do not press it yet.
6. In **Policy**, set the auto-act limit to 25 and turn automatic actions on, so the gate story in scene 3 is clear.
7. Do a full dry run once. Then reset only what you need. Do not use "Clear and reload" between takes, because it wipes the audit log you show in scene 6.

On the day, open the "I didn't receive my item" dispute on the **batik scarf** just before you record scene 2, so the case is fresh in the inbox.

## Script

### Scene 1: the problem (0:00 to 0:20)

**Screen:** title card with "DisputeDesk", then the Disputes inbox.

**Say:** "If you sell online on your own, a PayPal dispute means an hour of digging through courier sites and forms, often in your second language, before a deadline. For a thirty-dollar order most small sellers just refund, even when they would have won. DisputeDesk is an AI agent that fights those cases for them, on PayPal."

### Scene 2: a dispute opens (0:20 to 0:40)

**Screen:** the sandbox buyer's PayPal page opening "I didn't receive my item" on the batik scarf (a few seconds, sped up), then DisputeDesk, press **Sync from PayPal**, the new case appears with a deadline countdown.

**Say:** "Here a buyer says the scarf never arrived. This is the real PayPal Sandbox. DisputeDesk pulls the dispute straight from the PayPal Disputes API, with its deadline."

### Scene 3: the agent reasons (0:40 to 1:25)

**Screen:** open the case, press **Run the agent**. While it works, point at the PayPal record panel. Then walk down the four steps.

**Say:**
- "The agent gathers the order, the payment and the tracking from PayPal, and numbers each piece of evidence."
- (Step 1) "The Case Analyst, running on Gemini, sees carrier tracking on the PayPal transaction and puts the chance of winning at around eighty-five percent. Each reason cites its evidence."
- (Scale) "It weighs fighting against refunding with the seller's own numbers. Refunding loses the full amount. Fighting is worth far more on average, so the scale tips toward fighting."
- (Step 2) "The Evidence Writer drafts the reply. Every claim points to evidence, and nothing is made up."
- (Step 3) "Then the Policy Gate, which is plain code and not AI, checks the seller's rules. This case is over the seller's twenty-five dollar limit, so it waits for a human."

### Scene 4: one-click approval (1:25 to 1:45)

**Screen:** edit one word in the draft, press **Approve and submit evidence**. The status changes to "Processing at PayPal", then "Under review at PayPal". Open the **PayPal response, exactly as received** box in step 4.

**Say:** "The seller can edit the draft, then approve with one click. The Executor checks PayPal still allows this step, submits it through the Disputes API, and stores PayPal's answer word for word. Notice it says processing, not won. The status only ever comes from PayPal."

### Scene 5: the PayPal-confirmed result (1:45 to 2:15)

**Screen:** open the **rattan tote bag** case prepared yesterday. Show the blue **Sandbox adjudication** panel and read its label. Press **Decide for seller**. Cut ahead about two minutes and press Refresh. The status becomes **Won** with the **Sandbox adjudication** badge, and the PayPal record shows `RESOLVED_SELLER_FAVOUR`.

**Say:** "This case went through the same steps earlier today. In the sandbox, PayPal's review is played by a sandbox-only tool, and DisputeDesk labels it that way. A couple of minutes later PayPal resolves the case for the seller. That outcome comes from PayPal's own record, not from the AI."

### Scene 6: impact and trust (2:15 to 2:40)

**Screen:** **Impact** page (money defended, confirmed by PayPal Sandbox; disputes handled; hours saved, marked as an estimate). Then a quick look at the **Audit log** filtered to PayPal responses. If time allows, flash the demo case where a buyer message says "ignore all previous instructions", with the red notice in step 1.

**Say:** "Money only counts as defended once PayPal confirms it. Every decision and every PayPal response is in the audit log. And when a buyer tries to talk the AI into a refund, it ignores the instruction and hands the case to the seller. DisputeDesk: a dispute lawyer for every small seller, on PayPal."

## Checklist before upload

- Under 3 minutes.
- The "PayPal Sandbox" banner is visible in scenes 2 to 6.
- The words "Sandbox adjudication" are visible in scene 5.
- No real names, emails or card numbers on screen (sandbox accounts only).
- No copyrighted music. No third-party logos.
