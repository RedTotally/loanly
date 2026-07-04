# Loanly

Tagline: Feeling Loanly? Find Your Sugar Daddies or Mommies.

**SEA Hacks · Hong Kong · July 4–5, 2026**  
**Industry Challenge:** KCash Limited (Konew FinTech Group)

Loanly replaces Konew’s static lead form with an AI prompt-based interface. Customers describe their financial needs in natural language; the system understands intent, maps needs to Konew’s loan products, and delivers real-time Approval-in-Principle (AIP) options — then hands a clean summary to the sales team for follow-up.

Our micro-loan flow takes inspiration from the film *Yes Man* — quick, low-friction approvals where lenders can say yes to small asks in the moment.

---

## The Problem

Konew captures website leads through traditional forms. At first contact there is limited understanding of the customer’s actual needs, so follow-up calls become lengthy Q&A sessions — and leads drop off before any real-time offer is presented.

**Key issues we address:**

- Limited understanding of customer needs at first contact
- Slow, manual follow-up via sales calls
- No real-time offer → higher drop-off before engagement

---

## Our Solution

Loanly turns the pre-loan journey into a fast, intuitive, personalized conversation:

1. **Customer** describes their need in plain language (prompt UI).
2. **AI** understands intent, stays within Konew’s product scope, and structures a tailored offer.
3. **AIP** is presented instantly with amount and tenure options.
4. **Sales team** receives a customer profile summary and full activity log — no callback required to understand the lead.

---

## Judging Criteria — How Loanly Delivers

### 1. Shorter journey

> Does the solution deliver a relevant offer in real time, without requiring a callback?

- Customers start with a **natural-language prompt** instead of a multi-field form.
- **GPT-4o-mini** (via `/api/ai`) returns a structured loan plan in seconds: product, amount, rate, and repayment summary.
- The customer sees a concrete offer **before** any sales call — reducing time-to-clarity from days to under a minute.

### 2. Quality of the offer

> Do the generated loan products and AIP align with the customer’s stated needs?

- The AI system prompt is **configurable via `SYSTEM_PROMPT`** and designed to ingest **Konew product metadata** (personal loans, mortgages, SME financing) so recommendations stay on-catalog.
- Intent is **restricted to Konew products** — the model does not reference banks, competitors, or off-market alternatives.
- Output is **structured JSON** (Zod-validated): story summary, loan product name, amount, and interest rate — grounded in what the customer actually said.

### 3. Clean handoff

> Does it provide a useful customer summary and activity log for follow-up?

- Every customer interaction and decision is recorded in an **append-only activity log** (SHA-256 hash chain, viewable via **Open Logs**).
- The **sales view** (Lender mode) surfaces each lead as a scannable card: story, product, amount, rate, repayment plan, and credit score.
- Sales can **accept or decline** in-app; each action is timestamped (GMT+8) and persisted for audit and follow-up.

### 4. HK-ready

> Is it a solution suitable for the Hong Kong context (Chinese + English)?

- Built for **Hong Kong licensed money lending** workflows (Konew / KCash / PayKool product families).
- Timestamps and demo scenarios use **GMT+8** and HK-relevant use cases (e.g. property down payment, SME cash flow).
- UI and copy are structured for **bilingual extension** (English + 中文) as a near-term deliverable.

---

## How It Works

### Customer journey (Borrower mode)

1. Enter **name** and describe your **financial need** in natural language.
2. Optionally attach a **YouTube Short** for additional context.
3. Hit **Submit** — AI returns:
   - A polished **need summary**
   - A **Konew-aligned loan product**
   - Suggested **amount**, **interest rate**, and repayment terms
4. Review the plan and **submit** — the lead is queued for sales immediately.

### Sales journey (Lender mode)

1. **Scroll** through incoming leads — one full-screen card at a time.
2. Review each customer’s story, product match, amount, rate, and repayment plan.
3. **Swipe right** to accept · **Swipe left** to decline.
4. Every decision is logged with timestamp and hash for audit.

---

## Key Features

| Feature | Judging alignment |
|--------|-------------------|
| **Prompt-based intake** | Shorter journey — conversation replaces static form |
| **AI loan structuring** (`/api/ai`) | Quality of offer — needs → structured Konew product |
| **Configurable system prompt** | Konew product metadata + intent guardrails |
| **Instant lead queue** | Shorter journey — no callback to see an offer |
| **Sales feed + swipe decisions** | Clean handoff — scannable profiles for follow-up |
| **Activity log (hash chain)** | Clean handoff — tamper-evident audit trail |
| **Credit score gauge** | Quality of offer — at-a-glance risk signal for sales |

---

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS 4
- **AI:** Vercel AI SDK + OpenAI GPT-4o-mini (structured JSON output via Zod)
- **Video:** YouTube IFrame API (optional customer context)
- **Persistence:** `localStorage` for activity log (client-side prototype)

---

## Architecture

```
Customer prompt  →  POST /api/ai  →  GPT-4o-mini  →  structured loan plan (Konew-aligned)
                                                          ↓
Sales feed  ←  lead queue  ←  customer confirms
     ↓
Accept / decline  →  SHA-256 hash chain  →  localStorage (loanly-audit-chain)
```

- **No backend database** in the prototype — leads live in React state; activity logs persist in the browser.
- **AI route** accepts `name`, `story`, and optional `youtubeUrl`; override behavior with `SYSTEM_PROMPT` in `.env.local`.
- **Activity log** chains blocks where each hash = `SHA-256(previousHash + stableStringify(payload))`, with Caesar-encrypted payloads for display.

---

## Try It

**Live demo:** [https://loanly-six.vercel.app/](https://loanly-six.vercel.app/)
