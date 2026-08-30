const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join(__dirname, 'creative-import-2026-08-30.json');
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const TOKEN = process.env.META_ACCESS_TOKEN || '';
const ACCOUNT_ID = String(process.env.META_AD_ACCOUNT_ID || '').replace(/^act_/, '');
const API_VERSION = process.env.META_API_VERSION || 'v23.0';
const RUN_ID = process.env.CREATIVE_IMPORT_RUN_ID || '';

function log(event, payload = {}) {
  console.log('[creative-import]', JSON.stringify({ event, at: new Date().toISOString(), ...payload }));
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
    signal: AbortSignal.timeout(45000),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.error) throw new Error(body?.error?.message || `POST ${node} HTTP ${r.status}`);
  return body;
}

async function downloadDriveImage(fileId) {
  const candidates = [
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&authuser=0&confirm=t`,
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`,
  ];
  let last = null;
  for (const url of candidates) {
    try {
      const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(45000) });
      const ct = (r.headers.get('content-type') || '').toLowerCase();
      const buf = Buffer.from(await r.arrayBuffer());
      if (r.ok && buf.length > 1000 && !ct.includes('text/html')) return { buf, contentType: ct || 'application/octet-stream' };
      last = new Error(`Drive download returned ${r.status} ${ct} ${buf.length} bytes`);
    } catch (e) { last = e; }
  }
  throw last || new Error('Drive download failed');
}

async function uploadMetaImage(buf, filename) {
  const form = new FormData();
  form.set('access_token', TOKEN);
  form.set('bytes', buf.toString('base64'));
  form.set('name', filename);
  const r = await fetch(`https://graph.facebook.com/${API_VERSION}/act_${ACCOUNT_ID}/adimages`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(60000),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.error) throw new Error(body?.error?.message || `adimages HTTP ${r.status}`);
  const image = Object.values(body.images || {})[0];
  if (!image?.hash) throw new Error('Meta image upload returned no image hash');
  return image.hash;
}

function cloneJson(v) { return JSON.parse(JSON.stringify(v)); }

function buildCreativeStory(templateStory, imageHash) {
  const story = cloneJson(templateStory);
  if (!story?.page_id) throw new Error('Template creative has no page_id');
  if (!story?.link_data) throw new Error('Template creative is not a link image creative');
  story.link_data.image_hash = imageHash;
  delete story.link_data.image_url;
  delete story.link_data.picture;
  delete story.link_data.image_crops;
  if (Array.isArray(story.link_data.child_attachments)) delete story.link_data.child_attachments;
  return story;
}

async function ensurePausedAdset(folderName, template) {
  const existing = (await graphGetList(`act_${ACCOUNT_ID}/adsets`, 'id,name,status,effective_status,daily_budget,campaign_id', 300))
    .find(a => a.campaign_id === manifest.campaignId && a.name === folderName);
  if (existing) {
    await graphPost(existing.id, { status: 'PAUSED', daily_budget: String(manifest.dailyBudgetMinor) });
    log('adset_existing_normalized', { name: folderName, id: existing.id });
    return existing.id;
  }
  const params = {
    name: folderName,
    campaign_id: manifest.campaignId,
    daily_budget: String(manifest.dailyBudgetMinor),
    billing_event: template.billing_event,
    optimization_goal: template.optimization_goal,
    bid_strategy: template.bid_strategy,
    targeting: template.targeting,
    promoted_object: template.promoted_object,
    attribution_spec: template.attribution_spec,
    destination_type: template.destination_type,
    status: 'PAUSED',
  };
  const created = await graphPost(`act_${ACCOUNT_ID}/adsets`, params);
  if (!created?.id) throw new Error(`No adset id returned for ${folderName}`);
  log('adset_created', { name: folderName, id: created.id, budgetMinor: manifest.dailyBudgetMinor, status: 'PAUSED' });
  return created.id;
}

async function ensurePausedAd(adsetId, file, templateCreative) {
  const ads = await graphGetList(`${adsetId}/ads`, 'id,name,status,effective_status,creative{id}', 200);
  const existing = ads.find(a => a.name === file.name);
  if (existing) {
    if (existing.status !== 'PAUSED') await graphPost(existing.id, { status: 'PAUSED' });
    log('ad_existing_skipped', { adsetId, name: file.name, id: existing.id });
    return { id: existing.id, skipped: true };
  }

  const { buf } = await downloadDriveImage(file.driveFileId);
  log('drive_downloaded', { name: file.name, bytes: buf.length });
  const imageHash = await uploadMetaImage(buf, file.name);
  log('meta_image_uploaded', { name: file.name, imageHash });

  const objectStorySpec = buildCreativeStory(templateCreative.object_story_spec, imageHash);
  const creativeParams = {
    name: file.name,
    object_story_spec: objectStorySpec,
    url_tags: templateCreative.url_tags || undefined,
  };
  const creative = await graphPost(`act_${ACCOUNT_ID}/adcreatives`, creativeParams);
  if (!creative?.id) throw new Error(`No creative id returned for ${file.name}`);

  const ad = await graphPost(`act_${ACCOUNT_ID}/ads`, {
    name: file.name,
    adset_id: adsetId,
    creative: { creative_id: creative.id },
    status: 'PAUSED',
  });
  if (!ad?.id) throw new Error(`No ad id returned for ${file.name}`);
  log('ad_created', { adsetId, name: file.name, adId: ad.id, creativeId: creative.id, status: 'PAUSED' });
  return { id: ad.id, creativeId: creative.id, skipped: false };
}

async function runImport() {
  if (global.__creativeImportStarted) return;
  global.__creativeImportStarted = true;
  if (!RUN_ID || RUN_ID !== manifest.runId) {
    log('disabled', { reason: 'CREATIVE_IMPORT_RUN_ID does not match manifest' });
    return;
  }
  if (!TOKEN) throw new Error('META_ACCESS_TOKEN missing');
  if (!ACCOUNT_ID) throw new Error('META_AD_ACCOUNT_ID missing');
  if (ACCOUNT_ID !== manifest.accountId) throw new Error(`Account mismatch: env ${ACCOUNT_ID}, manifest ${manifest.accountId}`);

  const account = await graphGet(`act_${ACCOUNT_ID}`, 'id,name,currency,timezone_name,account_status');
  log('account_verified', { id: account.id, name: account.name, currency: account.currency, timezone: account.timezone_name });
  if (String(account.currency || '').toUpperCase() !== 'USD') {
    throw new Error(`Meta Graph reports account currency ${account.currency}; refusing to create $5 ad sets until currency is USD`);
  }

  const campaign = await graphGet(manifest.campaignId, 'id,name,status,effective_status,objective');
  if (campaign.id !== manifest.campaignId) throw new Error('Campaign mismatch');
  log('campaign_verified', { id: campaign.id, name: campaign.name, status: campaign.effective_status || campaign.status });

  const templateAdset = await graphGet(manifest.templateAdsetId,
    'id,name,campaign_id,billing_event,optimization_goal,bid_strategy,targeting,promoted_object,attribution_spec,destination_type');
  if (templateAdset.campaign_id !== manifest.campaignId) throw new Error('Template ad set is not in target campaign');

  const templateAd = await graphGet(manifest.templateAdId, 'id,name,adset_id,creative{id}');
  const creativeId = templateAd?.creative?.id;
  if (!creativeId) throw new Error('Template ad has no creative id');
  const templateCreative = await graphGet(creativeId, 'id,name,object_story_spec,url_tags');
  if (!templateCreative.object_story_spec?.link_data?.link) throw new Error('Template creative destination link could not be read');
  log('template_verified', {
    adsetId: templateAdset.id,
    adId: templateAd.id,
    creativeId,
    pageId: templateCreative.object_story_spec.page_id,
    destination: templateCreative.object_story_spec.link_data.link,
  });

  const summary = { foldersTotal: manifest.folders.length, filesTotal: 0, adsetsCreatedOrFound: 0, adsCreated: 0, adsSkipped: 0, failures: [] };
  summary.filesTotal = manifest.folders.reduce((n, f) => n + f.files.length, 0);
  log('import_start', { runId: manifest.runId, folders: summary.foldersTotal, files: summary.filesTotal, excludedFolders: manifest.excludedFolders });

  for (const folder of manifest.folders) {
    let adsetId;
    try {
      adsetId = await ensurePausedAdset(folder.name, templateAdset);
      summary.adsetsCreatedOrFound++;
    } catch (e) {
      summary.failures.push({ folder: folder.name, error: e.message });
      log('folder_failed', { folder: folder.name, error: e.message });
      continue;
    }

    for (const file of folder.files) {
      try {
        const r = await ensurePausedAd(adsetId, file, templateCreative);
        if (r.skipped) summary.adsSkipped++; else summary.adsCreated++;
      } catch (e) {
        summary.failures.push({ folder: folder.name, file: file.name, error: e.message });
        log('file_failed', { folder: folder.name, file: file.name, error: e.message });
      }
    }
  }

  log('IMPORT_COMPLETE', summary);
}

setTimeout(() => {
  runImport().catch(e => log('IMPORT_FATAL', { error: e.message, stack: e.stack?.split('\n').slice(0, 4).join(' | ') }));
}, 1500);

module.exports = { runImport };
