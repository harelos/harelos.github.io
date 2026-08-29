# TigerBrands Meta + Shopify Dashboard — Update Protocol

This folder is the temporary source of truth for account-performance reporting until a direct API integration replaces manual sync.

## Reporting rule

- Do **not** dump raw Meta/Shopify account data into chat.
- When account data is requested, update `data.json` first.
- Keep the chat reply short: interpretation/decision + dashboard link only.
- Keep numerical detail, campaign tables, funnel data, comparisons and conclusions in the dashboard.
- Dashboard design: black / purple / red, RTL-first, mobile-friendly.
- Maintain daily snapshots in `history/YYYY-MM-DD.json`, the append-only decision ledger, and Git commit history.

## Advisor rule: do not mirror the user's proposal

A persuasive proposal is still only a proposal. Before recommending or executing an account change, classify it as **KEEP / CHANGE / STOP / INVESTIGATE**, check the strongest argument against it, and compare it with the operating guardrails.

If a requested write breaks the agreed guardrails, say so. Do not execute it until the user explicitly says **OVERRIDE**.

## Change budget

- Maximum 2 meaningful account-level interventions per day.
- Maximum 1 budget/status/structure change per campaign per rolling 24 hours.
- Normal budget change: 20–30% maximum, once per 24 hours.
- If the business needs spend to stop immediately, use PAUSE. Reducing the daily budget is not a hard stop and Meta can continue spending after the edit.
- Never launch a new winner structure and reactivate an old structure on the same day.
- Deliberate review windows: 15:00, 22:00, 03:00 and optional 06:00 Israel time.
- Outside review windows, interrupt only for hard alerts: spend ceiling, tracking failure, checkout/payment failure, or extreme deviation.
- Winner decisions should use a rolling 3-day view rather than one intraday result.

## Evaluation rule

- Diagnose in order: auction/creative cost → LPV → ATC → checkout → purchase → unit economics.
- CPM must always be visible with a numeric target and historical comparison.
- Funnel colors use account-specific operating thresholds, not universal ecommerce claims.
- Every KPI label such as “good / medium / weak” must show the actual numeric target, warning range, historical average and reason for that target.
- Low sample sizes must display as low-confidence rather than good/bad.
- Hard stop-loss should ultimately use target CPA and break-even ROAS derived from contribution margin.
- When funnel evidence points outside ads, explicitly recommend the relevant store action (landing page, cart, checkout, payment, offer, tracking, email) instead of forcing an ads change.

## AI context / memory rule

The future AI advisor must **not** receive the full raw database on every request. Build a bounded context pack containing:

1. Account goals and hard constraints.
2. Current state and current campaigns.
3. Rolling 3-day and 7-day summaries.
4. Latest 10–20 meaningful decision events.
5. Relevant historical analogs retrieved for the current problem.
6. Unit economics / break-even targets when available.
7. Cash constraints summarized as spend ceiling/runway, not full bank statements.

The database remains source of truth. The AI receives a compact decision context. Store each advisor run and its context version so future decisions can be audited.

## Security boundary

- GitHub Pages is public client code. Never place OpenAI, Meta, Shopify, Wise, Revolut or database secrets in `index.html`, `data.json` or frontend JavaScript.
- Privileged reads/writes go through a server-side API using environment variables.
- Meta budget/status changes require deterministic policy validation plus human approval initially.
- The frontend API contract and DB schema live under `backend/`; real credentials do not.

## Update flow

1. Pull fresh Meta account, campaign and ad-set performance.
2. Pull fresh Shopify sessions/funnel/sales data.
3. Update `data.json` and the selected day's history snapshot.
4. Recalculate KPI target status, funnel health and advisor verdicts.
5. Record every meaningful budget/status/structure action in `decisionLog` and the persistent decision ledger.
6. When unit economics changes, version it rather than overwriting history.
7. Commit with a concise date/time-oriented message.
