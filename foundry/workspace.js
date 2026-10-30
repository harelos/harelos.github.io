(function () {
  'use strict';
  const ids = ['outcome', 'projectName', 'objective', 'evidence', 'reviewCriteria', 'constraints', 'deadline'];
  const form = document.getElementById('missionForm');
  const preview = document.getElementById('preview');
  const previewText = document.getElementById('previewText');
  const exportButton = document.getElementById('exportBtn');
  const saveState = document.getElementById('saveState');
  let mission = null;

  function values() {
    return Object.fromEntries(ids.map((id) => [id, document.getElementById(id).value.trim()]));
  }

  function saveDraft() {
    localStorage.setItem('foundry-mission-draft-v1', JSON.stringify(values()));
    saveState.textContent = 'Draft saved in this browser';
  }

  function buildMission() {
    const data = values();
    return {
      schema: 'foundry.mission.v1',
      exportedAt: new Date().toISOString(),
      project: { name: data.projectName, outcomeId: data.outcome },
      objective: data.objective,
      evidenceNotes: data.evidence,
      reviewCriteria: data.reviewCriteria.split(/\r?\n/).map((line) => line.trim().slice(0, 250)).filter(Boolean).slice(0, 5),
      constraints: data.constraints,
      deadline: data.deadline || null,
      attachments: [],
      execution: { requested: false, requiresDesktopApproval: true },
    };
  }

  ids.forEach((id) => document.getElementById(id).addEventListener('input', () => {
    saveState.textContent = 'Saving…';
    saveDraft();
    mission = null;
    exportButton.disabled = true;
  }));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    mission = buildMission();
    previewText.textContent = JSON.stringify(mission, null, 2);
    preview.hidden = false;
    exportButton.disabled = false;
    preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  exportButton.addEventListener('click', () => {
    if (!mission) return;
    const blob = new Blob([JSON.stringify(mission, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const safe = (mission.project.name || 'foundry-mission').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
    link.download = `${safe || 'foundry-mission'}.foundry-mission.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  });

  try {
    const saved = JSON.parse(localStorage.getItem('foundry-mission-draft-v1') || '{}');
    ids.forEach((id) => { if (saved[id]) document.getElementById(id).value = saved[id]; });
  } catch {}
})();
