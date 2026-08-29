# TigerBrands Control Room — backend architecture

## Purpose
Turn the static dashboard into a secure operating system for Meta + Shopify + unit economics + decisions, while keeping the frontend visual and low-noise.

## Security boundary
GitHub Pages is PUBLIC CLIENT CODE. Never embed OpenAI, Meta, Shopify, Wise, Revolut or database secrets in `index.html`, `data.json`, JavaScript, or any public repo file.

All privileged calls go through a server-side API. The browser calls our backend; the backend reads secrets from environment variables and talks to providers.

## Core endpoints
- `GET /api/state` — current compact account state for dashboard.
- `POST /api/sync` — pull Meta + Shopify, calculate metrics, store immutable snapshot, return new state.
- `GET /api/campaigns` — current campaign/ad-set status, budgets and compact metrics.
- `POST /api/meta/action` — pause/enable/change budget. Requires explicit human approval token and policy validation.
- `POST /api/advisor` — build context pack and ask AI for KEEP / CHANGE / STOP recommendations.
- `GET /api/decisions` — decision ledger.
- `POST /api/decisions` — record proposed/approved/executed action and reason.
- `GET/PUT /api/goals` — revenue, margin, budget ceiling and risk mode.
- `GET/PUT /api/unit-economics` — COGS/shipping/payment/returns assumptions.

## Historical memory model
Do NOT send the full database to the model. Build a bounded `context pack` on every advisor request:

1. **Account constitution** (always included, short): objectives, hard risk rules, testing/scaling strategy, review windows.
2. **Current state**: today's spend, revenue, funnel, current campaigns, budgets, statuses, active anomalies.
3. **Rolling windows**: 3-day and 7-day aggregates + trend deltas, not every raw event.
4. **Decision memory**: latest 10-20 meaningful changes plus unresolved hypotheses. Budget/status edits are higher priority than cosmetic edits.
5. **Relevant historical analogs**: retrieve only past days/campaigns similar to current problem (e.g. high ATC + low checkout).
6. **Unit economics**: break-even CPA/ROAS and contribution margin by offer when available.
7. **Cash constraints**: daily spend ceiling / defensive mode; bank data can be optional later.

The AI never needs the entire account history in one prompt. The database is source of truth; the context builder summarizes and retrieves only what is decision-relevant.

## AI response contract
The model must return structured JSON:
- `verdict`: KEEP | CHANGE | STOP | INVESTIGATE
- `confidence`: 0-100
- `primary_reason`
- `evidence[]`
- `counterargument`
- `recommended_actions[]`
- `non_ads_actions[]` (landing page, cart, checkout, offer, email, tracking)
- `do_not_touch[]`
- `next_review_at`

The UI renders this, not raw model prose.

## Human-in-the-loop control
Phase 1: AI recommends only.
Phase 2: AI prepares actions; user taps Approve.
Phase 3: low-risk actions may auto-execute only after explicit policy is configured.

Never allow unrestricted autonomous budget/status changes at first. Every write must pass deterministic policy checks before Meta receives it.

## Decision policy
- Default: 0 changes is valid.
- Max 2 meaningful account interventions/day.
- Max 1 budget/status/structure change per campaign/24h unless emergency override.
- A budget reduction is not a hard stop; pause is the hard stop.
- New winner structure and old structure should not both be launched as separate experiments on the same day.
- Winner decisions use rolling 3-day data unless a financial stop-loss or technical failure fires first.
- AI must produce the strongest argument AGAINST the user's proposed change before approval.

## Review cadence (Israel timezone)
Suggested decision windows aligned to the operator's active hours without constant checking:
- 15:00 Israel — first deliberate review.
- 22:00 Israel — second review.
- 03:00 Israel — late review.
- 06:00 Israel — optional end-of-day closeout.

Outside those windows the system may monitor continuously, but should only interrupt for hard alerts: spend ceiling, tracking failure, checkout failure, payment anomaly, or extreme performance deviation.

## Meta structure strategy represented in memory
- Testing sandbox stays separate from scaling/winner delivery.
- Long-run target can use an 80/20 winner/testing budget split, configurable rather than hard-coded.
- Winning creatives can be moved/duplicated into a CBO scaling structure.
- CBO duplicate count is a configurable strategy parameter (current concept: 5 duplicates).
- Do not force a low-budget CBO merely to preserve structure; minimum viable CBO budget remains configurable until enough account evidence exists.

## Non-ad diagnosis
Advisor should map funnel failures to likely work areas:
- High CPM / weak CTR / high CPC → creative, audience, auction pressure.
- Healthy clicks but weak LPV → page speed/tracking/landing mismatch.
- Weak LPV→ATC → offer/PDP/landing page.
- Healthy ATC but weak ATC→Checkout → cart, shipping, pricing surprise, UX.
- Healthy checkout starts but weak purchases → payment, trust, checkout friction.
- Ads healthy + storewide weak → investigate source mix, email/direct, technical issues.

## Cash / bank layer later
Wise/Revolut do not need to block v1. Add a `cash_transactions` ledger with adapters:
- API where available and appropriate.
- CSV upload fallback.
- Manual daily cash balance fallback.

AI receives only summarized cash signals (cash available, committed bills, runway, daily spend ceiling), not a full bank statement.
