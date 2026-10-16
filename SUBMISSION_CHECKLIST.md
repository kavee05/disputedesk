# Devpost submission checklist

Deadline: **Nov 12, 2026, 12:00pm PST.** Aim to submit a day early.

Legend: **Done** means it is in the repo. **You** means only you can do it.

## Required by the rules

| Item | Status | Where or how |
|---|---|---|
| Uses PayPal meaningfully | Done | Disputes, Orders, Payments and Tracking APIs on the PayPal Sandbox. See README and FEASIBILITY.md |
| Uses AI meaningfully | Done | Gemini runs the Case Analyst and Evidence Writer |
| Judges can run it | Done (local) / You (hosted) | Local: `npm install && npm run demo`. Hosted: deploy to Render, steps below |
| Public GitHub repo with all source and assets | You | Create the repo and push, steps below |
| Visible open source license | Done | `LICENSE` (MIT) at the repo root |
| Text description of features | Done | `DEVPOST.md`, ready to paste |
| List of AI tools used and how | Done | `DEVPOST.md` "AI tools used" and README "AI tools used, and how" |
| Demo video under 3 minutes, working end to end | You | Record from `DEMO_SCRIPT.md`, upload to YouTube or Vimeo as public or unlisted |
| No copyrighted music or third-party trademarks in the video | You | See the checklist at the end of `DEMO_SCRIPT.md` |

## Devpost form fields

| Field | Status | What to put |
|---|---|---|
| Project name | Done | DisputeDesk |
| Tagline | Done | From `DEVPOST.md` |
| Story (Inspiration, What it does, How we built it, Challenges, Accomplishments, What we learned, What's next) | Done | Paste each section from `DEVPOST.md` |
| Built with | Done | The list in `DEVPOST.md` |
| "Try it out" links | You | Your GitHub URL and your Render URL |
| Video demo link | You | Your YouTube or Vimeo URL |
| Image gallery | You | 3 to 5 screenshots: inbox, case page with the four steps and scale, approval, Impact page, audit log. Use the sandbox banner in shots |
| Thumbnail | You | One clean screenshot of the case page, or a simple title card |
| Special prize opt-ins | You | Tick Best Use of PayPal + AI, Best Use of Agentic Commerce, Best Demo Delivery if the form offers them |
| Team members | You | Invite teammates on Devpost if any |
| Any extra questions (country, eligibility, consent) | You | Answer on the form |

## Links to fill in after you have them

- [ ] Replace `HOSTED_URL_GOES_HERE` in `README.md` and `DEVPOST.md` with your Render URL
- [x] GitHub URL filled in: https://github.com/kavee05/disputedesk

## Steps only you can do

### 1. Put the code on GitHub (about 5 minutes)

1. On github.com, click **New repository**. Name it `disputedesk`, set it to **Public**, and do **not** add a README, license or .gitignore (the repo already has them).
2. In this folder, run the two commands GitHub shows under "push an existing repository", for example:

```bash
git remote add origin https://github.com/YOUR_NAME/disputedesk.git
```

```bash
git push -u origin main
```

3. On GitHub, check that `.env` is **not** in the file list and that `LICENSE` shows in the sidebar.

### 2. Host the public demo on Render (about 10 minutes)

Render's free web service runs Node apps and works with SQLite. Its disk is temporary, so DisputeDesk re-seeds the demo cases on each start. That is fine for a demo.

1. Sign up at render.com with your GitHub account.
2. Click **New**, then **Blueprint**, pick your `disputedesk` repo. Render reads `render.yaml`.
3. When it asks for values, set:
   - `GEMINI_API_KEY`: a Gemini key. Consider making a **separate** key for the public demo at aistudio.google.com, so you can delete it after judging.
   - `ADMIN_PASSCODE`: leave **empty** so judges can click around. Demo mode only touches simulated data, and the agent is limited to 60 runs an hour.
4. Click **Apply**. The first build takes about 5 minutes.
5. Open the URL Render gives you (like `https://disputedesk.onrender.com`). You should see the yellow striped "Demo mode" banner.
6. The free plan sleeps after 15 minutes without visitors and takes up to a minute to wake. Open the URL once before judging starts and before you record anything.

Do **not** put your PayPal sandbox keys on the public server. The hosted copy is the demo-mode version. The real sandbox path is shown in the video and documented in the README.

### 3. Record and upload the video

Follow `DEMO_SCRIPT.md`. Upload to YouTube (public or unlisted) and paste the link into Devpost.

### 4. Final check (15 minutes)

- [ ] Open the hosted URL in a private window. Load a case, run the agent, approve a draft, open Impact.
- [ ] Clone the GitHub repo into a new folder and run `npm install && npm run demo` to prove the instructions work.
- [ ] The video plays and is under 3 minutes.
- [ ] Every link in the Devpost form opens.
