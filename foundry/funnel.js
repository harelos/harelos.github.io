(function () {
  'use strict';
  const config = window.FOUNDRY_FUNNEL_CONFIG || {};
  const angle = document.body.dataset.angle || 'unknown';
  const actions = new Set(['plan', 'pilot']);
  // Local event hook is available for QA. It does not send data without a separate Foundry endpoint.
  window.FOUNDRY_FUNNEL_EVENTS = [];
  function record(action) {
    if (!actions.has(action)) return;
    const event = { action, angle, at: Date.now() };
    window.FOUNDRY_FUNNEL_EVENTS.push(event);
    if (!config.analyticsEndpoint) return;
    try {
      const endpoint = new URL(config.analyticsEndpoint);
      if (endpoint.protocol !== 'https:' || endpoint.origin !== location.origin) return;
      navigator.sendBeacon(endpoint.pathname, new Blob([JSON.stringify(event)], { type: 'application/json' }));
    } catch {}
  }
  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-funnel-action]');
    if (link) record(link.dataset.funnelAction);
  });
  // Pixel installation requires a separate Foundry dataset and a reviewed notice/consent flow.
  // A configured ID alone never activates a tracker in this pre-release build.
})();
