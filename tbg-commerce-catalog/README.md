# TBG Commerce Atlas

Live catalog: https://harelos.github.io/tbg-commerce-catalog/

A single-page Hebrew RTL visual decision catalog with 34 original interactive feature demonstrations across six categories. This directory is independent of all other GitHub Pages content and does not change a Shopify theme or store.

## What this is

An interactive feature-selection tool: preview a behavior, expand a feature to read implementation requirements and source references, and save/export a shortlist.

The previews are original, intentionally simplified HTML/CSS/JavaScript demonstrations. They are **not screenshots, running installations, or extracted implementations of the linked repositories**. The pages and dashboard previews are concepts, not ready-to-import Shopify templates. UGC cards have no real video attached; the before/after uses an abstract texture, not a product result. Review text is placeholder material. All prices, figures, scores, cash-flow inputs, thresholds and inventory quantities are illustrative and not a live business report.

## Files

- `index.html`: page shell, disclosures, filters, detail dialog and selection controls.
- `catalog.css`: responsive RTL styles, focus indicators and reduced-motion support.
- `data.js`: feature registry, recommendation levels, source links, risks and required integrations.
- `catalog.js`: original UI previews and local-only behavior.
- `TEST-RESULTS.json`: local smoke-test results and limitations.

No framework, dependencies, build service or API credential is needed. Serve these files together as static assets. GitHub Pages already serves this repository; this catalog is an additive subdirectory, not a replacement for its root page.

## Features

Cart and offers (6), product and proof (9), pages and leads (6), speed and quality (6), email and workflows (3), measurement and operations (4).

Search, category and priority filters; native detail dialogs; local shortlist; text-file export and clipboard copy; mobile-first layout; no automatic installation.

## Privacy and safety

- No analytics scripts, pixels, fetch/XHR, payment endpoint, mail endpoint or customer database.
- Only selected feature IDs are stored in localStorage, when the browser permits storage. Selection is local to the browser/device, not synced or sent to an agent.
- Demo email forms validate and reset locally without transmitting or storing the entered address.
- Selecting a star **does not authorize a production change**.
- Product images reference existing public merchant CDN URLs. Browsers may contact that CDN when images become visible. External images have an accessible fallback; actual CDN rendering was not browser-tested in this environment.
- The page is public. `noindex,nofollow` is a search-engine request, not access control. No credentials or non-public merchant/customer data were published.

## Source and license policy

Source links are research/implementation references, not blanket permission to copy. The underlying source code must be reviewed at a pinned version before reuse. Preserve any required notices. Shopify Horizon has a Shopify-specific restricted license, not an ordinary MIT license. Some larger products mix permissive and commercial code. No linked third-party implementation was vendored into these demos.

The source registry distinguishes what a project provides from what still requires integration. For example, React Email constructs email content but does not provide free delivery; React Flow draws node editors but is not a scheduling/sending engine; Chart.js draws charts but is not a complete CFO/inventory model; PostHog should be evaluated in the existing account rather than adding a duplicate measurement system.

## Testing performed

Node syntax checks for both JavaScript files and 11 Playwright smoke-test groups passed. Tests exercised all-card rendering, quantities, mix-and-match capacity, shipping and bump totals, comparison range, two-step quiz, local-only email form, illustrative finance/inventory formulas, filters, in-page shortlist, file export, detail dialogs and Escape dismissal. There was no horizontal overflow at 1440px desktop or 390px mobile, and no JavaScript exceptions during those tests.

Because browser navigation to local URLs was restricted, the tests rendered the files through `page.set_content` with scripts/styles inlined. External images were intentionally blocked to test fallbacks. Cross-reload localStorage persistence, clipboard permissions, real CDN image delivery, full accessibility, Safari and Shopify integration were **not** verified by those tests. This is not a production-readiness certificate for the cataloged store features.

## Implementation gate

For any selected feature: inspect existing store code first, validate the upstream license/version, implement only the missing behavior on staging, preserve events and bundle/variant semantics, test price/inventory/checkout, assess performance, then obtain explicit approval before production deployment.
