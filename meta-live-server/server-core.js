const http = require('http');

const PORT = process.env.PORT || 10000;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || '';
const META_AD_ACCOUNT_ID = String(process.env.META_AD_ACCOUNT_ID || '').replace(/^act_/, '');
const META_API_VERSION = process.env.META_API_VERSION || 'v23.0';
const DASHBOARD_SOURCE = process.env.DASHBOARD_SOURCE || 'https://raw.githubusercontent.com/harelos/harelos.github.io/main/meta-dashboard/hebrew/';
const CACHE_MS = Number(process.env.META_CACHE_MS || 60_000);
const FORCE_MIN_MS = Number(process.env.META_FORCE_MIN_MS || 15_000);
const RATE_LIMIT_BACKOFF_MS = Number(process.env.META_RATE_LIMIT_BACKOFF_MS || 120_000);

let metaCache = null;
let metaCacheAt = 0;
let inFlight = null;
let lastError = null;
let lastForceAt = 0;
let backoffUntil = 0;
let usageHeaders = {};

function json(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
}

function text(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

function dateInZone(zone = 'Asia/Jerusalem') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const get = t => parts.find(p => p.type === t)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function actionValue(list, type, fallbackType = null) {
  if (!Array.isArray(list)) return 0;
  const hit = list.find(x => x.action_type === type) || (fallbackType ? list.find(x => x.action_type === fallbackType) : null);
  return n(hit?.value);
}

function parseInsight(row = {}) {
  const spend = n(row.spend);
  const impressions = n(row.impressions);
  const clicks = n(row.clicks);
  const lpv = actionValue(row.actions, 'landing_page_view', 'omni_landing_page_view');
  const atc = actionValue(row.actions, 'add_to_cart', 'omni_add_to_cart');
  const checkout = actionValue(row.actions, 'initiate_checkout', 'omni_initiated_checkout');
  const addPayment = actionValue(row.actions, 'add_payment_info');
  const purchases = actionValue(row.actions, 'omni_purchase', 'purchase');
  const purchaseValue = actionValue(row.action_values, 'omni_purchase', 'purchase');
  const linkClicks = actionValue(row.actions, 'link_click');
  const videoViews = actionValue(row.actions, 'video_view');
  return {
    spend,
    impressions,
    reach: n(row.reach),
    clicks,
    linkClicks,
    ctr: impressions ? clicks / impressions * 100 : n(row.ctr),
    cpc: clicks ? spend / clicks : (row.cpc == null ? null : n(row.cpc)),
    cpm: impressions ? spend / impressions * 1000 : (row.cpm == null ? null : n(row.cpm)),
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
    lpvToAtc: lpv ? atc / lpv * 100 : null,
    atcToCheckout: atc ? checkout / atc * 100 : null,
    checkoutToPurchase: checkout ? purchases / checkout * 100 : null,
    lpvToPurchase: lpv ? purchases / lpv * 100 : null,
    videoViews,
    videoViewRate: impressions ? videoViews / impressions * 100 : null,
    costPerVideoView: videoViews ? spend / videoViews : null,
  };
}

function emptyMetrics() {
  return parseInsight({});
}

function isRateLimitMessage(msg = '') {
  return /too many api calls|request limit|rate limit|user request limit/i.test(msg);
}

function extractUsage(headers) {
  const out = {};
  for (const key of ['x-app-usage', 'x-ad-account-usage', 'x-business-use-case-usage']) {
    const v = headers.get(key);
    if (!v) continue;
    try { out[key] = JSON.parse(v); } catch { out[key] = v; }
  }
  if (Object.keys(out).length) usageHeaders = out;
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
    signal: AbortSignal.timeout(20_000),
  });
  extractUsage(r.headers);
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.error) {
    const message = body?.error?.message || `Meta API HTTP ${r.status}`;
    const e = new Error(message);
    e.code = body?.error?.code;
    e.subcode = body?.error?.error_subcode;
    e.status = r.status;
    throw e;
  }
  return body;
}

async function graphList(path, params = {}, maxPages = 3) {
  const first = await graph(path, params);
  const out = [...(first.data || [])];
  let next = first?.paging?.next || null;
  let pages = 1;
  while (next && pages < maxPages) {
    const r = await fetch(next, { signal: AbortSignal.timeout(20_000) });
    extractUsage(r.headers);
    const body = await r.json().catch(() => ({}));
    if (!r.ok || body.error) throw new Error(body?.error?.message || `Meta paging HTTP ${r.status}`);
    out.push(...(body.data || []));
    next = body?.paging?.next || null;
    pages += 1;
  }
  return out;
}

function rowIdentity(row, level) {
  if (level === 'ad') return row.ad_id;
  if (level === 'adset') return row.adset_id;
  if (level === 'campaign') return row.campaign_id;
  return null;
}

function rowName(row, level) {
  if (level === 'ad') return row.ad_name;
  if (level === 'adset') return row.adset_name;
  if (level === 'campaign') return row.campaign_name;
  return null;
}

function insightMap(rows, level) {
  return new Map((rows || []).map(r => [rowIdentity(r, level), { name: rowName(r, level), raw: r, metrics: parseInsight(r) }]));
}

function sumMetrics(rows) {
  let spend = 0, impressions = 0, clicks = 0, linkClicks = 0, lpv = 0, atc = 0, checkout = 0, addPayment = 0, purchases = 0, purchaseValue = 0, videoViews = 0;
  for (const m of rows) {
    spend += n(m.spend); impressions += n(m.impressions); clicks += n(m.clicks); linkClicks += n(m.linkClicks);
    lpv += n(m.landingPageViews); atc += n(m.addToCarts); checkout += n(m.initiateCheckouts); addPayment += n(m.addPaymentInfo);
    purchases += n(m.purchases); purchaseValue += n(m.purchaseValue); videoViews += n(m.videoViews);
  }
  return {
    spend, impressions, reach: null, clicks, linkClicks,
    ctr: impressions ? clicks / impressions * 100 : 0,
    cpc: clicks ? spend / clicks : null,
    cpm: impressions ? spend / impressions * 1000 : null,
    landingPageViews: lpv, addToCarts: atc, initiateCheckouts: checkout, addPaymentInfo: addPayment,
    purchases, purchaseValue, roas: spend ? purchaseValue / spend : 0,
    costPerLandingPageView: lpv ? spend / lpv : null,
    costPerAddToCart: atc ? spend / atc : null,
    costPerCheckout: checkout ? spend / checkout : null,
    costPerPurchase: purchases ? spend / purchases : null,
    lpvToAtc: lpv ? atc / lpv * 100 : null,
    atcToCheckout: atc ? checkout / atc * 100 : null,
    checkoutToPurchase: checkout ? purchases / checkout * 100 : null,
    lpvToPurchase: lpv ? purchases / lpv * 100 : null,
    videoViews,
    videoViewRate: impressions ? videoViews / impressions * 100 : null,
    costPerVideoView: videoViews ? spend / videoViews : null,
  };
}

async function fetchMetaLive(requestedDate = null) {
  const accountPath = `act_${META_AD_ACCOUNT_ID}`;
  const account = await graph(accountPath, { fields: 'id,name,currency,timezone_name,account_status' });
  const reportingDate = requestedDate || dateInZone(account.timezone_name || 'Asia/Jerusalem');
  const timeRange = { since: reportingDate, until: reportingDate };
  const insightFields = 'spend,impressions,reach,clicks,ctr,cpc,cpm,actions,action_values,purchase_roas';

  // Sequential reads on purpose: less bursty and kinder to Meta's account request budget.
  const campaigns = await graphList(`${accountPath}/campaigns`, {
    fields: 'id,name,status,effective_status,daily_budget,lifetime_budget,objective', limit: 200
  });
  const adsets = await graphList(`${accountPath}/adsets`, {
    fields: 'id,name,status,effective_status,daily_budget,campaign_id,optimization_goal,promoted_object,bid_strategy', limit: 200
  });
  const ads = await graphList(`${accountPath}/ads`, {
    fields: 'id,name,status,effective_status,adset_id,campaign_id,creative{id}', limit: 300
  });
  const accountInsights = await graphList(`${accountPath}/insights`, {
    level: 'account', time_range: timeRange, fields: insightFields, limit: 10
  });
  const adsetInsights = await graphList(`${accountPath}/insights`, {
    level: 'adset', time_range: timeRange,
    fields: `campaign_id,campaign_name,adset_id,adset_name,${insightFields}`, limit: 200
  });
  const adInsights = await graphList(`${accountPath}/insights`, {
    level: 'ad', time_range: timeRange,
    fields: `campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,${insightFields}`, limit: 300
  });

  const adsetPerf = insightMap(adsetInsights, 'adset');
  const adPerf = insightMap(adInsights, 'ad');
  const campaignMetrics = new Map();
  for (const a of adsets) {
    const m = adsetPerf.get(a.id)?.metrics;
    if (!m) continue;
    if (!campaignMetrics.has(a.campaign_id)) campaignMetrics.set(a.campaign_id, []);
    campaignMetrics.get(a.campaign_id).push(m);
  }

  const adRows = ads.map(a => {
    const perf = adPerf.get(a.id)?.metrics || emptyMetrics();
    return {
      type: 'ad', id: a.id, name: a.name,
      status: a.effective_status || a.status,
      configuredStatus: a.status,
      campaignId: a.campaign_id,
      adsetId: a.adset_id,
      creativeId: a.creative?.id || null,
      ...perf,
    };
  });

  const adsetRows = adsets.map(a => {
    const perf = adsetPerf.get(a.id)?.metrics || emptyMetrics();
    const adsInside = adRows.filter(x => x.adsetId === a.id);
    return {
      type: 'adset', id: a.id, name: a.name,
      status: a.effective_status || a.status,
      configuredStatus: a.status,
      campaignId: a.campaign_id,
      dailyBudget: a.daily_budget != null ? n(a.daily_budget) / 100 : null,
      optimizationGoal: a.optimization_goal || null,
      promotedObject: a.promoted_object || null,
      bidStrategy: a.bid_strategy || null,
      activeAds: adsInside.filter(x => x.status === 'ACTIVE').length,
      visibleAds: adsInside.length,
      ...perf,
    };
  });

  const campaignRows = campaigns.map(c => {
    const perf = sumMetrics(campaignMetrics.get(c.id) || []);
    const setsInside = adsetRows.filter(x => x.campaignId === c.id);
    return {
      type: 'campaign', id: c.id, name: c.name,
      status: c.effective_status || c.status,
      configuredStatus: c.status,
      objective: c.objective || null,
      dailyBudget: c.daily_budget != null ? n(c.daily_budget) / 100 : null,
      activeAdsets: setsInside.filter(x => x.status === 'ACTIVE').length,
      visibleAdsets: setsInside.length,
      ...perf,
    };
  });

  const totals = parseInsight(accountInsights[0] || {});
  const live = {
    ok: true,
    source: 'Meta Graph API (server-side)',
    generatedAt: new Date().toISOString(),
    date: reportingDate,
    stale: false,
    rateLimited: false,
    lastError: null,
    cacheTtlSeconds: Math.round(CACHE_MS / 1000),
    account: {
      id: account.id,
      name: account.name,
      currency: account.currency || 'USD',
      timezone: account.timezone_name || null,
      status: account.account_status,
    },
    totals,
    campaigns: campaignRows,
    adsets: adsetRows,
    ads: adRows,
    counts: {
      activeCampaigns: campaignRows.filter(x => x.status === 'ACTIVE').length,
      activeAdsets: adsetRows.filter(x => x.status === 'ACTIVE').length,
      activeAds: adRows.filter(x => x.status === 'ACTIVE').length,
    },
    apiUsage: usageHeaders,
  };

  metaCache = live;
  metaCacheAt = Date.now();
  lastError = null;
  return live;
}

function staleCopy(reason = null) {
  if (!metaCache) return null;
  return {
    ...metaCache,
    stale: true,
    rateLimited: reason ? isRateLimitMessage(reason.message || '') : false,
    cacheAgeSeconds: Math.floor((Date.now() - metaCacheAt) / 1000),
    lastError: reason || lastError,
  };
}

async function getMetaLive({ force = false, date = null } = {}) {
  const now = Date.now();
  if (now < backoffUntil) {
    const cached = staleCopy(lastError || { at: new Date().toISOString(), message: 'Meta rate-limit backoff active' });
    if (cached) return cached;
    const e = new Error('Meta rate-limit backoff active');
    e.status = 429;
    throw e;
  }

  if (!force && metaCache && (!date || metaCache.date === date) && now - metaCacheAt < CACHE_MS) {
    return { ...metaCache, cacheAgeSeconds: Math.floor((now - metaCacheAt) / 1000) };
  }
  if (force && now - lastForceAt < FORCE_MIN_MS && metaCache) {
    return { ...metaCache, cacheAgeSeconds: Math.floor((now - metaCacheAt) / 1000), forceThrottled: true };
  }
  if (inFlight) return inFlight;
  if (force) lastForceAt = now;

  inFlight = (async () => {
    try {
      return await fetchMetaLive(date);
    } catch (e) {
      lastError = { at: new Date().toISOString(), message: e.message, code: e.code || null, subcode: e.subcode || null };
      if (isRateLimitMessage(e.message)) backoffUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
      const cached = staleCopy(lastError);
      if (cached) return cached;
      throw e;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

async function fetchDashboardAsset(path) {
  const base = DASHBOARD_SOURCE.endsWith('/') ? DASHBOARD_SOURCE : DASHBOARD_SOURCE + '/';
  const u = new URL(path.replace(/^\//, ''), base);
  if (u.hostname === 'raw.githubusercontent.com') u.searchParams.set('_', String(Date.now()));
  const r = await fetch(u, { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`Dashboard source HTTP ${r.status}: ${u.pathname}`);
  return r;
}

async function handler(req, res) {
  const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });
  try {
    if (u.pathname === '/health') {
      return json(res, 200, {
        ok: true,
        service: 'meta-live-dashboard-v3',
        now: new Date().toISOString(),
        hasMetaToken: Boolean(META_ACCESS_TOKEN),
        accountId: META_AD_ACCOUNT_ID || null,
        cacheAgeSeconds: metaCache ? Math.floor((Date.now() - metaCacheAt) / 1000) : null,
        backoffUntil: backoffUntil || null,
        lastError,
      });
    }

    if (u.pathname === '/api/state') {
      const live = await getMetaLive({ force: false }).catch(() => null);
      return json(res, 200, {
        ok: true,
        backend: true,
        metaConnected: Boolean(live),
        lastSync: live?.generatedAt || null,
        stale: live?.stale || false,
        rateLimited: live?.rateLimited || false,
        account: live?.account || null,
        lastError: live?.lastError || lastError,
      });
    }

    if (u.pathname === '/api/sync' && req.method === 'POST') {
      const live = await getMetaLive({ force: true });
      return json(res, 200, live);
    }

    if (u.pathname === '/api/meta') {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(u.searchParams.get('date') || '') ? u.searchParams.get('date') : null;
      const live = await getMetaLive({ force: u.searchParams.get('force') === '1', date });
      return json(res, 200, live);
    }

    if (u.pathname === '/' || u.pathname === '/index.html') {
      const r = await fetchDashboardAsset('index.html');
      return text(res, 200, await r.text(), 'text/html; charset=utf-8');
    }

    const safePath = u.pathname.replace(/^\/+/, '');
    if (safePath && !safePath.includes('..')) {
      const r = await fetchDashboardAsset(safePath);
      const contentType = r.headers.get('content-type') || 'application/octet-stream';
      const buf = Buffer.from(await r.arrayBuffer());
      res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      return res.end(buf);
    }

    return json(res, 404, { ok: false, error: 'Not found' });
  } catch (e) {
    console.error('[meta-live-dashboard]', e.message);
    return json(res, e.status === 429 ? 429 : 500, { ok: false, error: e.message, lastError });
  }
}

http.createServer(handler).listen(PORT, () => {
  console.log(`meta-live-dashboard-v3 listening on ${PORT}`);
});
