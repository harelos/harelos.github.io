# TigerBrands Meta + Shopify Dashboard — Update Protocol

This folder is the temporary source of truth for account-performance reporting until a direct API integration replaces manual sync.

## User preference / operating rule

- Do **not** dump raw Meta/Shopify account data into chat.
- When account data is requested, update `data.json` first.
- Keep the chat reply short: interpretation/decision + dashboard link only.
- Keep numerical detail, campaign tables, funnel data, comparisons and conclusions in the dashboard.
- Dashboard design: black / purple / red, RTL-first, mobile-friendly.

## Files

- `index.html` — dashboard shell and renderer.
- `data.json` — current source-of-truth snapshot; page polls this file every 30 seconds.
- `history/YYYY-MM-DD.json` — daily snapshots when useful.
- Git commit history — full audit trail of each manual sync/change.

## Update flow

1. Pull fresh Meta account, campaign and ad-set performance.
2. Pull fresh Shopify sessions/funnel/sales data.
3. Replace the current values in `data.json`.
4. Update conclusions and Decision Guard only when the evidence changes.
5. Add/update a daily history snapshot when materially useful.
6. Commit with a concise timestamp/date-oriented message.

## Decision discipline

The dashboard is also an anti-reactivity layer. Structural Meta changes should be made from written rules and scheduled review windows rather than repeated intraday reactions. Record each meaningful budget/status change in `decisionLog`.
