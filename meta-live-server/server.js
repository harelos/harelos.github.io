const { runImport } = require('./preload-import');
const { runCopy } = require('./preload-copy-ad');
require('./server-core');

setTimeout(async () => {
  try {
    await runImport();
    await runCopy();
    console.log('[one-time-jobs]', JSON.stringify({ event: 'ALL_COMPLETE', at: new Date().toISOString() }));
  } catch (e) {
    console.error('[one-time-jobs]', JSON.stringify({ event: 'FAILED', at: new Date().toISOString(), error: e.message, stack: e.stack?.split('\n').slice(0, 5).join(' | ') }));
  }
}, 1500);
