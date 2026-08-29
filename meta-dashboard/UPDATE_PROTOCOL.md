# TigerBrands Meta + Shopify Dashboard — Update Protocol

This folder is the temporary source of truth for account-performance reporting until a direct API integration replaces manual sync.

## Reporting rule

- Do **not** dump raw Meta/Shopify account data into chat.
- When account data is requested, update `data.json` first.
- Keep the chat reply short: interpretation/decision + dashboard link only.
- Keep numerical detail, campaign tables, funnel data, comparisons and conclusions in the dashboard.
- Dashboard design: black / purple / red, RTL-first, mobile-friendly.
- Maintain daily snapshots in `history/YYYY-MM-DD.json` and Git commit history.

## Advisor rule: do not mirror the user's proposal

A persuasive proposal is still only a proposal. Before recommending or executing an account change, classify it as **KEEP / CHANGE / STOP**, check the strongest argument against it, and compare it with the operating guardrails.

If a requested write breaks the agreed guardrails, say so. Do not execute it until the user explicitly says **OVERRIDE**.

## Change budget

- Maximum 2 meaningful account-level interventions per day.
- Maximum 1 budget/status/structure change per campaign per rolling 24 hours.
- Normal budget change: 20–30% maximum, once per 24 hours.
- If the business needs spend to stop immediately, use PAUSE. Reducing the daily budget is not a hard stop and Meta can continue spending after the edit.
- Never launch a new winner structure and reactivate an old structure on the same day.
- Review windows: 12:00 and 18:00 Israel time.
- Winner decisions should use a rolling 3-day view rather than one intraday result.

## Evaluation rule

- Diagnose in order: traffic cost → LPV → ATC → checkout → purchase → economics.
- Funnel colors use account-specific operating thresholds, not universal ecommerce claims.
- Low sample sizes must display as low-confidence rather than good/bad.
- Hard stop-loss should ultimately use target CPA and break-even ROAS derived from contribution margin.

## Update flow

1. Pull fresh Meta account, campaign and ad-set performance.
2. Pull fresh Shopify sessions/funnel/sales data.
3. Update `data.json` and the selected day's history snapshot.
4. Recalculate funnel health and advisor verdicts.
5. Record every meaningful budget/status/structure action in `decisionLog`.
6. Commit with a concise date/time-oriented message.
