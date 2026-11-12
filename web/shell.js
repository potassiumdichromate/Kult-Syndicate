'use strict';
// The Switchyard's KULT World-style shell: the dock opens glass pages over
// the 3D world, the Agent console slides in for a job, and the minimap
// follows the player. app.js stays in charge of state and every action; its
// tabs (setTab) are the pages, and "district" means the world with no page.
(() => {
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const pages = $('#pages'), jobs = $('#jobs-page'), consoleEl = $('#agent-console'), launch = $('#open-agent-console');
  const api = () => window.KultDistrictAPI;
  let jobsOpen = false, consoleWanted = false, lastReceipts = null, lastMission = null;

  // ---------------------------------------------------------------- pages
  function showPage(section, button) {
    pages.hidden = !section;
    document.body.classList.toggle('world-view', !section);
    $$('#dock button').forEach((b) => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
    if (!section) return;
    $('#page-title').textContent = section.dataset.title || '';
    $('#page-eyebrow').textContent = section.dataset.eyebrow || '';
    const ico = $('#page-ico'); ico.innerHTML = button?.querySelector('.dk-ico svg')?.outerHTML || ''; ico.style.setProperty('--c', button?.style.getPropertyValue('--c') || '#ff6a3d');
    pages.querySelector('.page-body').scrollTop = 0;
  }
  function sync() {
    const tab = api()?.getTab?.() || 'district';
    if (tab !== 'district') jobsOpen = false;
    jobs.hidden = !jobsOpen;
    const section = jobsOpen ? jobs : tab === 'district' ? null : document.getElementById(tab);
    showPage(section, jobsOpen ? $('#dock [data-page="jobs"]') : $(`#dock [data-tab="${tab}"]`));
  }
  // #district-tab-proxy is a hidden [data-tab="district"] button app.js wires
  // like the others: clicking it returns to the world.
  const toWorld = () => $('#district-tab-proxy').click();
  function openJobs() { if (api()?.getTab() !== 'district') toWorld(); jobsOpen = true; closeConsole(); sync(); }
  function closePages() { jobsOpen = false; if (api()?.getTab() !== 'district') toWorld(); else sync(); }
  $('#dock [data-page="jobs"]').addEventListener('click', () => (jobsOpen ? closePages() : openJobs()));
  $('#page-close').addEventListener('click', closePages);
  pages.addEventListener('click', (e) => { if (e.target === pages) closePages(); });
  window.addEventListener('kult:view', () => { jobsOpen = false; sync(); });
  // A dock button for the page already open closes it.
  $$('#dock [data-tab]').forEach((b) => b.addEventListener('click', (e) => { if (!pages.hidden && b.classList.contains('active') && !jobsOpen) { e.stopImmediatePropagation(); closePages(); } }, true));

  // ---------------------------------------------------------------- console
  function openConsole() { consoleWanted = true; consoleEl.hidden = false; document.body.classList.add('console-open'); launch.hidden = true; }
  function closeConsole() { consoleWanted = false; consoleEl.hidden = true; document.body.classList.remove('console-open'); refreshLaunch(); }
  function refreshLaunch() {
    const s = api()?.getState?.(), m = s?.mission;
    launch.hidden = !s || !consoleEl.hidden || !(m || api()?.getSelected?.());
    $('#mobile-agent-label').textContent = m ? (m.status === 'PENDING' ? 'View mission result' : `Continue · decision ${m.step + 1} of 3`) : api()?.getSelected?.() ? 'Review the job' : 'Open mission console';
    launch.classList.toggle('live', !!m);
  }
  $('#close-agent-console').addEventListener('click', closeConsole);
  launch.addEventListener('click', openConsole);
  $('#dock [data-act="console"]').addEventListener('click', () => (consoleEl.hidden ? openConsole() : closeConsole()));
  window.addEventListener('kult:state', () => {
    const s = api()?.getState?.(); if (!s) return;
    // Open for an active mission, a newly chosen job, or a fresh result.
    const fresh = lastReceipts !== null && s.receipts.length > lastReceipts;
    if ((s.mission && s.mission.id !== lastMission) || fresh) openConsole();
    lastMission = s.mission?.id || null; lastReceipts = s.receipts.length;
    refreshLaunch();
  });
  window.KultWorldUI = { openConsole: () => { openConsole(); if (!pages.hidden) closePages(); }, closeConsole };

  // ---------------------------------------------------------------- help, keys
  const help = $('#map-help-dialog');
  $('#map-help').addEventListener('click', () => help.showModal());
  $('#close-map-help').addEventListener('click', () => help.close());
  const KEYS = { 1: '[data-page="jobs"]', 2: '[data-tab="social"]', 3: '[data-tab="passport"]', 4: '[data-tab="crew"]', 5: '[data-tab="policy"]', c: '[data-act="console"]' };
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName) || $('dialog[open]')) return;
    if (e.key === 'Escape') { if (!pages.hidden) closePages(); else if (!consoleEl.hidden) closeConsole(); return; }
    const sel = KEYS[e.key.toLowerCase()];
    if (sel && api()?.getState?.()) { e.preventDefault(); $('#dock ' + sel)?.click(); }
  });

  // ---------------------------------------------------------------- minimap
  const mm = $('#minimap'), g = mm.getContext('2d'), N = 12, C = mm.width / N;
  const COLOR = { plaza: '#2e2257', road: '#171230', junction: '#171230', rail: '#3a2c4a', canal: '#2bb8d8', bridge: '#9c8cc8' };
  const KIND = { home: '#ffb27a', scout: '#4fd8ff', negotiate: '#6ff0a6', heist: '#ff6a3d', defend: '#a98bff', territory: '#ffc94d' };
  let ground = null;
  function drawGround(d) {
    ground = document.createElement('canvas'); ground.width = mm.width; ground.height = mm.height; const q = ground.getContext('2d');
    q.fillStyle = '#120b28'; q.fillRect(0, 0, mm.width, mm.height);
    for (let gx = -1; gx <= 10; gx++) for (let gy = -1; gy <= 10; gy++) { q.fillStyle = COLOR[d.tileAt(gx, gy)[0]] || '#2e2257'; q.fillRect((gx + 1) * C + 1, (gy + 1) * C + 1, C - 2, C - 2); }
  }
  function drawMinimap(t) {
    const d = window.kultDistrict, s = api()?.getState?.(); if (!d || !s) return;
    if (!ground) drawGround(d);
    g.drawImage(ground, 0, 0);
    for (const b of s.blocks) {
      const x = (b.x + 1) * C, y = (b.y + 1) * C;
      g.fillStyle = KIND[b.kind]; g.globalAlpha = 0.9; g.fillRect(x + 4, y + 4, C - 8, C - 8); g.globalAlpha = 1;
      if (b.id === d.nextId) { g.strokeStyle = '#ff6a3d'; g.lineWidth = 3; g.beginPath(); g.arc(x + C / 2, y + C / 2, C * (0.62 + Math.sin(t / 300) * 0.08), 0, Math.PI * 2); g.stroke(); }
    }
    const p = d.player, px = (p.x + 1.5) * C, py = (p.y + 1.5) * C;
    g.save(); g.translate(px, py); g.rotate(-p.yaw + Math.PI);
    g.fillStyle = '#fff'; g.shadowColor = '#ff6a3d'; g.shadowBlur = 12; g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 8); g.lineTo(0, 4); g.lineTo(-8, 8); g.closePath(); g.fill(); g.restore();
    const near = s.blocks.reduce((best, b) => { const k = Math.hypot(b.x - p.x, b.y - p.y); return k < best.k ? { b, k } : best; }, { b: null, k: 2.2 }).b;
    const place = near ? near.name : 'District 01'; if ($('#mm-place').textContent !== place) $('#mm-place').textContent = place;
  }
  window.addEventListener('kult:frame', (e) => { if (e.detail % 4 === 0) drawMinimap(performance.now()); });
  mm.addEventListener('click', (e) => { const r = mm.getBoundingClientRect(); window.kultDistrict?.walkTo((e.clientX - r.left) / r.width * N - 1.5, (e.clientY - r.top) / r.height * N - 1.5); });

  sync();
})();
