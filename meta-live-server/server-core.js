const http = require('http');

const PORT = process.env.PORT || 10000;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || '';
const META_AD_ACCOUNT_ID = String(process.env.META_AD_ACCOUNT_ID || '').replace(/^act_/, '');
const META_API_VERSION = process.env.META_API_VERSION || 'v23.0';
const DASHBOARD_SOURCE = process.env.DASHBOARD_SOURCE || 'https://harelos.github.io/meta-dashboard/hebrew/';
const HKD_TO_USD = Number(process.env.HKD_TO_USD || '0.127496');
const TARGET_CURRENCY = process.env.TARGET_CURRENCY || 'USD';
const CACHE_MS = 30_000;

let metaCache = null;
let metaCacheAt = 0;
let lastError = null;

function json(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
}

function text(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

function jerusalemDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const get = t => parts.find(p => p.type === t)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function actionValue(list, type, fallbackType = null) {
  if (!Array.isArray(list)) return 0;
  const hit = list.find(x => x.action_type === type) || (fallbackType ? list.find(x => x.action_type === fallbackType) : null);
  return Number(hit?.value || 0);
}

function parseInsight(row = {}) {
  const spend = Number(row.spend || 0);
  const impressions = Number(row.impressions || 0);
  const clicks = Number(row.clicks || 0);
  const lpv = actionValue(row.actions, 'landing_page_view', 'omni_landing_page_view');
  const atc = actionValue(row.actions, 'add_to_cart', 'omni_add_to_cart');
  const checkout = actionValue(row.actions, 'initiate_checkout', 'omni_initiated_checkout');
  const addPayment = actionValue(row.actions, 'add_payment_info');
  const purchases = actionValue(row.actions, 'omni_purchase', 'purchase');
  const purchaseValue = actionValue(row.action_values, 'omni_purchase', 'purchase');
  return {
    spend,
    impressions,
    reach: Number(row.reach || 0),
    clicks,
    ctr: impressions ? clicks / impressions * 100 : Number(row.ctr || 0),
    cpc: clicks ? spend / clicks : Number(row.cpc || 0),
    cpm: impressions ? spend / impressions * 1000 : Number(row.cpm || 0),
    linkClicks: actionValue(row.actions, 'link_click'),
    landingPageViews: lpv,
    addToCarts: atc,
    initiateCheckouts: checkout,
    addPaymentInfo: addPayment,
    purchases,
    purchaseValue,
    roas: spend > 0 ? purchaseValue / spend : 0,
    costPerLandingPageView: lpv ? spend / lpv : null,
    costPerAddToCart: atc ? spend / atc : null,
    costPerCheckout: checkout ? spend / checkout : null,
    costPerPurchase: purchases ? spend / purchases : null,
  };
}

function moneyFactor(currency) {
  if (currency === TARGET_CURRENCY) return 1;
  if (currency === 'HKD' && TARGET_CURRENCY === 'USD') return HKD_TO_USD;
  return 1;
}

function convertMoneyMetrics(metrics, factor) {
  const out = { ...metrics };
  for (const key of ['spend', 'cpc', 'cpm', 'purchaseValue', 'costPerLandingPageView', 'costPerAddToCart', 'costPerCheckout', 'costPerPurchase']) {
    if (out[key] != null && Number.isFinite(Number(out[key]))) out[key] = Number(out[key]) * factor;
  }
  return out;
}

async function graph(path, params = {}) {
  if (!META_ACCESS_TOKEN) throw new Error('META_ACCESS_TOKEN is not configured');
  if (!META_AD_ACCOUNT_ID) throw new Error('META_AD_ACCOUNT_ID is not configured');
  const u = new URL(`https://graph.facebook.com/${META_API_VERSION}/${path.replace(/^\//, '')}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) u.searchParams.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  }
  const r = await fetch(u, {
    headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}` },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.error) {
    const err = body?.error?.message || `Meta API HTTP ${r.status}`;
    throw new Error(err);
  }
  return body;
}

async function fetchMetaLive(date = jerusalemDate()) {
  const accountPath = `act_${META_AD_ACCOUNT_ID}`;
  const timeRange = { since: date, until: date };
  const insightFields = 'spend,impressions,reach,clicks,ctr,cpc,cpm,actions,action_values,purchase_roas';

  const [account, accountInsights, campaignInsights, campaigns, adsets] = await Promise.all([
    graph(accountPath, { fields: 'id,name,currency,timezone_name,account_status' }),
    graph(`${accountPath}/insights`, { level: 'account', time_range: timeRange, fields: insightFields, limit: 50 }),
    graph(`${accountPath}/insights`, { level: 'campaign', time_range: timeRange, fields: `campaign_id,campaign_name,${insightFields}`, limit: 100 }),
    graph(`${accountPath}/campaigns`, { fields: 'id,name,status,effective_status,daily_budget,lifetime_budget,objective', limit: 100 }),
    graph(`${accountPath}/adsets`, { fields: 'id,name,status,effective_status,daily_budget,campaign_id,optimization_goal,promoted_object', limit: 100 }),
  ]);

  const currency = account.currency || 'USD';
  const factor = moneyFactor(currency);
  const totalsNative = parseInsight(accountInsights.data?.[0] || {});
  const totals = convertMoneyMetrics(totalsNative, factor);
  const campaignStatus = new Map((campaigns.data || []).map(c => [c.id, c]));
  const insightByCampaign = new Map((campaignInsights.data || []).map(r => [r.campaign_id, r]));

  const campaignRows = (campaigns.data || []).map(c => {
    const native = parseInsight(insightByCampaign.get(c.id) || {});
    const m = convertMoneyMetrics(native, factor);
    const dailyBudgetNative = c.daily_budget != null ? Number(c.daily_budget) / 100 : null;
    return {
      id: c.id,
      name: c.name,
      status: c.effective_status || c.status,
      configuredStatus: c.status,
      objective: c.objective,
      dailyBudgetNative,
      dailyBudget: dailyBudgetNative == null ? null : dailyBudgetNative * factor,
      ...m,
      checkouts: m.initiateCheckouts,
      advisor: (c.effective_status || c.status) === 'ACTIVE' ? 'KEEP / LIVE META' : 'WATCH / LIVE META',
    };
  }).filter(c => c.status === 'ACTIVE' || c.spend > 0 || c.purchases > 0);

  const adsetRows = (adsets.data || []).map(a => ({
    id: a.id,
    name: a.name,
    status: a.effective_status || a.status,
    campaignId: a.campaign_id,
    dailyBudgetNative: a.daily_budget != null ? Number(a.daily_budget) / 100 : null,
    dailyBudget: a.daily_budget != null ? Number(a.daily_budget) / 100 * factor : null,
    optimizationGoal: a.optimization_goal,
    promotedObject: a.promoted_object || null,
  })).filter(a => a.status === 'ACTIVE');

  const live = {
    ok: true,
    generatedAt: new Date().toISOString(),
    date,
    account: {
      id: account.id,
      name: account.name,
      currency,
      timezone: account.timezone_name,
      status: account.account_status,
      displayCurrency: TARGET_CURRENCY,
      fxFactor: factor,
    },
    totals,
    totalsNative,
    campaigns: campaignRows,
    activeAdsets: adsetRows,
  };

  metaCache = live;
  metaCacheAt = Date.now();
  lastError = null;
  return live;
}

async function getMetaLive(force = false, date = jerusalemDate()) {
  if (!force && metaCache && metaCache.date === date && Date.now() - metaCacheAt < CACHE_MS) return metaCache;
  try {
    return await fetchMetaLive(date);
  } catch (e) {
    lastError = { at: new Date().toISOString(), message: e.message };
    if (metaCache && metaCache.date === date) return metaCache;
    throw e;
  }
}

async function fetchGitHub(path) {
  const base = DASHBOARD_SOURCE.endsWith('/') ? DASHBOARD_SOURCE : DASHBOARD_SOURCE + '/';
  const r = await fetch(new URL(path, base), { cache: 'no-store', signal: AbortSignal.timeout(12_000) });
  if (!r.ok) throw new Error(`Dashboard source HTTP ${r.status}`);
  return r;
}

function mergeLiveIntoData(base, live) {
  const out = structuredClone(base);
  out.meta = out.meta || {};
  out.meta.lastUpdated = live.generatedAt;
  out.meta.liveSource = 'Meta Graph API via secure server';
  out.meta.liveAccountId = live.account.id;
  out.meta.liveAccountName = live.account.name;
  out.meta.liveAccountCurrency = live.account.currency;
  out.meta.displayCurrency = live.account.displayCurrency;
  out.meta.fxFactor = live.account.fxFactor;
  out.meta.live = true;
  out.days = out.days || {};
  const day = out.days[live.date] || { date: live.date, shopify: {}, campaigns: [], advisor: {} };
  day.metaAds = live.totals;
  day.campaigns = live.campaigns;
  day.activeStructure = {
    account: live.account.name,
    accountId: live.account.id,
    activeAdsets: live.activeAdsets,
  };
  day.advisor = {
    ...(day.advisor || {}),
    verdict: live.totals.purchases > 0 ? 'KEEP / VERIFY' : 'KEEP / WAIT',
    body: `Meta live connected. ${live.totals.purchases || 0} purchases attributed today. Account native currency is ${live.account.currency}; dashboard money metrics are normalized to ${live.account.displayCurrency}.`,
  };
  out.days[live.date] = day;
  return out;
}

function patchDashboardHtml(html) {
  // Same UI, but it is now served from this backend so /api/state and /api/sync become real.
  const marker = '<meta name="theme-color" content="#050507">';
  const liveMeta = '<meta name="x-meta-live" content="secure-server">';
  if (!html.includes(liveMeta)) html = html.replace(marker, `${marker}\n${liveMeta}`);
  return html;
}

async function handler(req, res) {
  const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (u.pathname === '/health') {
      return json(res, 200, { ok: true, service: 'meta-live-dashboard', now: new Date().toISOString() });
    }

    if (u.pathname === '/api/state') {
      let live = null;
      try { live = await getMetaLive(false); } catch {}
      return json(res, 200, {
        ok: true,
        backend: true,
        metaConnected: Boolean(live),
        lastSync: live?.generatedAt || null,
        account: live ? { id: live.account.id, name: live.account.name, currency: live.account.currency, timezone: live.account.timezone } : null,
        lastError,
      });
    }

    if (u.pathname === '/api/sync' && req.method === 'POST') {
      const live = await getMetaLive(true);
      return json(res, 200, { ok: true, syncedAt: live.generatedAt, date: live.date });
    }

    if (u.pathname === '/api/meta') {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(u.searchParams.get('date') || '') ? u.searchParams.get('date') : jerusalemDate();
      const live = await getMetaLive(u.searchParams.get('force') === '1', date);
      return json(res, 200, live);
    }

    if (u.pathname === '/data.json') {
      const baseRes = await fetchGitHub('data.json?ts=' + Date.now());
      const base = await baseRes.json();
      try {
        const live = await getMetaLive(false);
        return json(res, 200, mergeLiveIntoData(base, live));
      } catch (e) {
        base.meta = base.meta || {};
        base.meta.live = false;
        base.meta.liveError = e.message;
        return json(res, 200, base);
      }
    }

    if (u.pathname === '/' || u.pathname === '/index.html') {
      const r = await fetchGitHub('index.html?ts=' + Date.now());
      const html = patchDashboardHtml(await r.text());
      return text(res, 200, html, 'text/html; charset=utf-8');
    }

    const safePath = u.pathname.replace(/^\/+/, '');
    if (!safePath.includes('..')) {
      const r = await fetchGitHub(safePath + (u.search || ''));
      const contentType = r.headers.get('content-type') || 'application/octet-stream';
      const buf = Buffer.from(await r.arrayBuffer());
      res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      return res.end(buf);
    }

    return json(res, 404, { ok: false, error: 'Not found' });
  } catch (e) {
    console.error('[meta-live-dashboard]', e.message);
    return json(res, 500, { ok: false, error: e.message });
  }
}

http.createServer(handler).listen(PORT, () => {
  console.log(`meta-live-dashboard listening on ${PORT}`);
});
