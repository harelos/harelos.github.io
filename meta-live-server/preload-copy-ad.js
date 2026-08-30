const TOKEN = process.env.META_ACCESS_TOKEN || '';
const ACCOUNT_ID = String(process.env.META_AD_ACCOUNT_ID || '').replace(/^act_/, '');
const API_VERSION = process.env.META_API_VERSION || 'v23.0';

const TARGET_ACCOUNT_ID = '676516688178386';
const TARGET_ADSET_ID = '120247751170250077';
const TARGET_ADSET_NAME = 'TEST | Direct Offer Statics | IL Women 18-65 | $10';
const AD_NAME = 'TEST | Salon Cost V2 | Direct Offer | 4x5 | 2026-08-28';
const SOURCE_IMAGE_URL = 'https://cdn.shopify.com/s/files/1/0719/2628/4583/files/novahair-salon-cost-v2-4x5-2026-08-28.jpg?v=1787900912';
const DESTINATION_URL = 'https://tigerbrandsglobal.com/pages/novahair-sales-staging?utm_source=facebook&utm_medium=paid_social&utm_campaign=novahair_direct_offer_challengers_20260828&utm_content=salon_cost_v2_4x5&utm_term=direct_offer';
const PAGE_ID = '620240831165337';
const PRIMARY_TEXT = `למה לשרוף שוב 350 ש"ח וחצי יום במספרה?\n\nNovaHair מכסה שורשים לבנים בבית ב-10 דקות בלבד במקלחת - בלי אמוניה ובלי לכלוך.\n\nמארז 4 בקבוקים עכשיו ב-₪239 בלבד (פחות מ-₪60 לבקבוק!) עם משלוח מהיר חינם ו-60 יום אחריות.\n\nבדקי את הגוונים עכשיו באתר.`;
const HEADLINE = 'למה לשלם שוב למספרה? 4 בקבוקים ב-₪239';
const DESCRIPTION = 'NovaHair | פחות מ-₪60 לבקבוק במבצע';

function log(event, payload = {}) {
  console.log('[copy-ad]', JSON.stringify({ event, at: new Date().toISOString(), ...payload }));
}

async function graphGet(node, fields) {
  const u = new URL(`https://graph.facebook.com/${API_VERSION}/${node}`);
  if (fields) u.searchParams.set('fields', fields);
  u.searchParams.set('access_token', TOKEN);
  const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.error) throw new Error(body?.error?.message || `GET ${node} HTTP ${r.status}`);
  return body;
}

async function graphGetList(node, fields, limit = 200) {
  const u = new URL(`https://graph.facebook.com/${API_VERSION}/${node}`);
  if (fields) u.searchParams.set('fields', fields);
  u.searchParams.set('limit', String(limit));
  u.searchParams.set('access_token', TOKEN);
  const out = [];
  let next = u.toString();
  while (next) {
    const r = await fetch(next, { signal: AbortSignal.timeout(30000) });
    const body = await r.json().catch(() => ({}));
    if (!r.ok || body.error) throw new Error(body?.error?.message || `GET list ${node} HTTP ${r.status}`);
    out.push(...(body.data || []));
    next = body?.paging?.next || null;
    if (out.length > 1000) break;
  }
  return out;
}

async function graphPost(node, params) {
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null || v === '') continue;
    form.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  }
  form.set('access_token', TOKEN);
  const r = await fetch(`https://graph.facebook.com/${API_VERSION}/${node}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
    signal: AbortSignal.timeout(60000),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.error) throw new Error(body?.error?.message || `POST ${node} HTTP ${r.status}`);
  return body;
}

async function downloadImage(url) {
  const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(45000) });
  const ct = (r.headers.get('content-type') || '').toLowerCase();
  const buf = Buffer.from(await r.arrayBuffer());
  if (!r.ok || buf.length < 1000 || ct.includes('text/html')) {
    throw new Error(`Source image download failed: ${r.status} ${ct} ${buf.length} bytes`);
  }
  return buf;
}

async function uploadMetaImage(buf, filename) {
  const form = new FormData();
  form.set('access_token', TOKEN);
  form.set('bytes', buf.toString('base64'));
  form.set('name', filename);
  const r = await fetch(`https://graph.facebook.com/${API_VERSION}/act_${ACCOUNT_ID}/adimages`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(90000),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.error) throw new Error(body?.error?.message || `adimages HTTP ${r.status}`);
  const image = Object.values(body.images || {})[0];
  if (!image?.hash) throw new Error('Meta image upload returned no image hash');
  return image.hash;
}

async function runCopy() {
  if (global.__copyAdStarted) return;
  global.__copyAdStarted = true;
  if (!TOKEN) throw new Error('META_ACCESS_TOKEN missing');
  if (!ACCOUNT_ID) throw new Error('META_AD_ACCOUNT_ID missing');
  if (ACCOUNT_ID !== TARGET_ACCOUNT_ID) throw new Error(`Target account mismatch: ${ACCOUNT_ID}`);

  const account = await graphGet(`act_${ACCOUNT_ID}`, 'id,name,currency,timezone_name,account_status');
  log('account_verified', { id: account.id, name: account.name, currency: account.currency, timezone: account.timezone_name });
  if (String(account.currency || '').toUpperCase() !== 'USD') throw new Error(`Direct Meta Graph reports ${account.currency}; expected USD`);

  const adset = await graphGet(TARGET_ADSET_ID, 'id,name,status,effective_status,campaign_id');
  if (adset.name !== TARGET_ADSET_NAME) throw new Error(`Target ad set name mismatch: ${adset.name}`);
  log('target_adset_verified', { id: adset.id, name: adset.name, status: adset.effective_status || adset.status });

  const existingAds = await graphGetList(`${TARGET_ADSET_ID}/ads`, 'id,name,status,effective_status,creative{id}', 200);
  const existing = existingAds.find(a => a.name === AD_NAME);
  if (existing) {
    await graphPost(existing.id, { status: 'PAUSED' });
    log('COPY_COMPLETE', { skippedDuplicate: true, adId: existing.id, creativeId: existing?.creative?.id || null, status: 'PAUSED' });
    return { adId: existing.id, creativeId: existing?.creative?.id || null, skippedDuplicate: true };
  }

  const buf = await downloadImage(SOURCE_IMAGE_URL);
  log('source_image_downloaded', { bytes: buf.length });
  const imageHash = await uploadMetaImage(buf, 'novahair-salon-cost-v2-4x5-2026-08-28.jpg');
  log('target_image_uploaded', { imageHash });

  const objectStorySpec = {
    page_id: PAGE_ID,
    link_data: {
      link: DESTINATION_URL,
      message: PRIMARY_TEXT,
      name: HEADLINE,
      description: DESCRIPTION,
      image_hash: imageHash,
      call_to_action: { type: 'SHOP_NOW', value: { link: DESTINATION_URL } },
    },
  };

  const creative = await graphPost(`act_${ACCOUNT_ID}/adcreatives`, {
    name: `${AD_NAME} | copied from Shopify Store 3`,
    object_story_spec: objectStorySpec,
  });
  if (!creative?.id) throw new Error('No target creative id returned');

  const ad = await graphPost(`act_${ACCOUNT_ID}/ads`, {
    name: AD_NAME,
    adset_id: TARGET_ADSET_ID,
    creative: { creative_id: creative.id },
    status: 'PAUSED',
  });
  if (!ad?.id) throw new Error('No target ad id returned');

  await graphPost(ad.id, { status: 'PAUSED' });
  const verify = await graphGet(ad.id, 'id,name,status,effective_status,adset_id,creative{id}');
  if (verify.name !== AD_NAME || verify.adset_id !== TARGET_ADSET_ID || verify.status !== 'PAUSED') {
    throw new Error(`Verification failed: ${JSON.stringify(verify)}`);
  }
  log('COPY_COMPLETE', { skippedDuplicate: false, adId: verify.id, creativeId: verify?.creative?.id || creative.id, adsetId: verify.adset_id, status: verify.status, effectiveStatus: verify.effective_status });
  return { adId: verify.id, creativeId: verify?.creative?.id || creative.id, skippedDuplicate: false };
}

module.exports = { runCopy };
