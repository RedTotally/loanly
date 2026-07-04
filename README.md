# Loanly

**Tagline:** *Feeling Loanly? Find Your Sugar Daddies or Mommies.*

Loanly is a peer-to-peer lending experience built like a social video feed. Borrowers pitch their story (with a YouTube Short as proof-of-vibe), AI structures the loan terms, and lenders swipe through applicants the way they scroll Reels — accept or decline with a flick of the wrist.

---

## TL;DR

Loanly is **Tinder meets TikTok for loans**. Borrowers submit a name, story, and YouTube Short; AI drafts loan terms; lenders scroll a vertical feed of applicants, watch their Short, then swipe right to fund or left to pass. Every decision is logged in a browser-side hash chain (a lightweight blockchain prototype).

---

## The Problem It Solves

Traditional loan applications are forms, PDFs, and waiting rooms. Loanly reframes lending as a **discovery and decision flow** — fast, visual, and mobile-native. Borrowers get a structured pitch without filling out a 20-page application. Lenders get a scannable feed with credit scores, repayment plans, and a short video to humanize each request.

---

## How It Works

### Borrower Mode

1. Enter your **name** and **story** — why you need money and how you'll pay it back.
2. Paste a **YouTube Short URL** — a quick video pitch or context clip.
3. Hit **Submit** — Loanly's AI (GPT-4o-mini) reads your pitch and returns:
   - A polished **story summary**
   - A suggested **loan product** (e.g. "Game Development Loan", "Small Business Expansion Loan")
   - A recommended **amount** and **interest rate**
4. Review the plan, then **Submit** to publish your application to the lender feed.

### Lender Mode

1. **Scroll vertically** through loan applications — one full-screen card at a time, Reels-style.
2. Each card opens with the borrower's **YouTube Short** playing automatically.
3. **Tap** the video to dismiss it and reveal the full loan details:
   - Story
   - Loan product
   - Amount requested
   - Interest rate
   - Proposed repayment schedule
4. **Swipe right** to accept · **Swipe left** to decline (with throw-velocity detection, like a dating app).
5. A **credit score** (0–100) is shown as a green bar beside the feed — the higher the score, the more of the bar fills.

When you've reviewed everyone, the feed shows: *"No more reels — check back later."*

---

## Key Features

| Feature | Description |
|--------|-------------|
| **Reels-style feed** | Vertical snap-scroll between applicants; wheel, touch, and drag navigation |
| **YouTube Shorts integration** | Embedded video with scrub bar; auto-plays only when the card is settled in view |
| **Swipe-to-decide** | Horizontal drag on the story card — right = accept, left = decline |
| **AI loan structuring** | `/api/ai` turns freeform borrower pitches into structured loan terms |
| **Credit score gauge** | Visual 0–100 score per applicant, displayed as a side bar |
| **Audit log ("Blockchain Prototype")** | Every accept/decline is appended to a local hash chain (SHA-256 + ROT13-encrypted payload) viewable in **Open Logs** |
| **Dual roles** | Toggle between **Borrower** and **Lender** mode from the footer |

---

## Sample Applicants (Demo Data)

The app ships with three seeded profiles:

- **Alexey** — Soviet programmer pitching a Tetris port ($5,000, 8% APR, score 67)
- **Jesse** — Albuquerque small-business expansion ($3,000, 18% APR, score 55)
- **Sherry** — Taipei apartment down-payment bridge loan ($8,500, 12% APR, score 99)

---

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS 4
- **AI:** Vercel AI SDK + OpenAI GPT-4o-mini (structured JSON output via Zod)
- **Video:** YouTube IFrame API
- **Persistence:** `localStorage` for the audit chain (client-side only)

---

## Architecture Notes

```
Borrower form  →  POST /api/ai  →  GPT-4o-mini  →  structured loan plan
                                                        ↓
Lender feed  ←  panels state  ←  borrower submits
     ↓
Swipe decision  →  SHA-256 hash chain  →  localStorage (loanly-audit-chain)
```

- **No backend database** — applicant panels live in React state; audit logs persist in the browser.
- **AI route** accepts `name`, `story`, and optional `youtubeUrl`; system prompt is overridable via `SYSTEM_PROMPT` env var.
- **Blockchain prototype** chains blocks where each block's hash = `SHA-256(previousHash + stableStringify(payload))`, with the payload Caesar-encrypted (shift 13) for display.

---

## Who It's For

- **Hackathon / demo audiences** — a memorable, interactive take on fintech UX
- **Borrowers** who want to pitch in plain language instead of paperwork
- **Lenders / investors** who prefer scanning short video pitches over reading long applications

---

## Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Set your OpenAI API key (and optional `SYSTEM_PROMPT`) in `.env.local` for the AI loan planner to work.
