'use strict';
// The first-visit tour: the KULT Syndicates First Visit manual (six chapters)
// told on the real interface, the way KULT World's quick-start tour works.
// Each step opens the page it talks about and spotlights one thing (the rest
// is dimmed and blocked). After chapter 02 a checkpoint lets a new player
// start the Scout; the chapter pills reopen any chapter later. Opens on the
// first visit on this browser and from Guide (#how-to-play, key G).
(() => {
  const $ = (s) => document.querySelector(s);
  const api = () => window.KultDistrictAPI;
  const shell = () => window.KultShell;
  const KEY = 'syndicates-tour-v1';
  const CHAPTERS = ['Start here', 'Your first two missions', 'Mission board', 'Play & Hire', 'Crew & territory', 'Passport & return'];
  const block = (kind) => api()?.getState()?.blocks.find((b) => b.kind === kind);
  const sandbox = () => api()?.getState()?.agent?.mode === 'demo';
  // Open a job's brief in the Agent console (an active mission shows instead).
  function brief(kind) {
    shell()?.open('world');
    const s = api()?.getState();
    if (s?.mission) shell()?.openConsole();
    else if (block(kind)) api().select(block(kind));
  }

  // [chapter, title, text, target selector or null (centred), open, action]
  const STEPS = [
    [0, 'Welcome to the Switchyard', 'Syndicates is a strategy game inside KULT World. You direct me, your Agent, through missions in the Switchyard. A syndicate is a crew of players, and you can start solo.', null, 'world'],
    [0, 'Your first goal: recover the manifest', 'A manifest is a cargo list. Ours is inside Midnight Depot, and a patrol guards one entrance. First send me to scout: what we learn there helps you choose an entrance on the next mission.', '.quest-tracker', 'world'],
    [0, 'Who makes the call?', () => 'You choose each action. I give field notes and keep every result in my Passport.' + (sandbox() ? ' The SANDBOX badge means this is a separate practice identity.' : ''), '.hud-player', 'world'],
    [0, 'Set my limits', 'In Permissions, choose which jobs I may take and how many Supplies I can spend per mission. You can stop me at any time.', '#dock [data-tab="policy"]', 'world'],
    [0, 'Our resources', 'Supplies pay for missions. Intel buys information. Influence helps your crew claim territory. Alert makes missions harder. These are game resources; no real money moves.', '.resources', 'world'],
    [0, 'Open your first brief', 'Every job is on the Jobs page, or walk me to Canal Watch and press E at its door. Reading a brief is free; committing spends the entry cost shown. You do not need to hire anyone or join a crew.', '#job-board', 'jobs'],

    [1, 'Turn a clue into a choice', 'This is the Scout brief at Canal Watch. Example: if my Scout reports a patrol at the gate, that gives you a reason to choose the canal when we reach the depot.', '#agent-console', 'brief:scout'],
    [1, '01 · Earn the Scout report', 'Read the drone clue before choosing a vantage. Cross-check the beacons using Intel. For the third choice, report the route with its uncertainty. Wait for the countdown, then select Return for resolution.', '#agent-console', 'brief:scout'],
    [1, '02 · Check what you learned', 'A successful, qualified Scout names the patrol. Then open Midnight Depot and review the Heist brief. No usable report? Scout again, choose an uncertain entry, or spend 2 Intel on the entry survey.', '[data-location="depot"]', 'world'],
    [1, '03 · Choose your entrance', 'Correct route: +3 tactical points. Wrong route: −1. Survey: +2. Tactical points help the mission succeed; they are not currency. A fresh report lets you skip the survey. Check each route’s own Supplies and Intel cost.', '[data-location="depot"]', 'world'],
    [1, '04 · Resolve the Heist', 'Read the crossing clue. At the cache, decide whether the extra reward is worth raising Alert. After the third choice, wait and select Return for resolution, then open Passport and Watch replay. A report lasts up to 24 hours; repeated report-led entries can rotate the patrol sooner.', '#dock [data-tab="passport"]', 'world'],
    [1, 'You know enough to start', 'That is the first operation: Scout, then Heist. Start the Scout now, or keep going for the mission board, Play & Hire, crews and the Passport. Reopen this tour any time from Guide (G).', null, 'world', 'checkpoint'],

    [2, 'Choose your next job', 'A good next move depends on resources, Alert and recent history. Scout for a fresh route, then Heist for the manifest; after two recent report-led Heists the patrol can rotate, so watch for the rotation notice. At Union Crossing, Negotiate: offer repairs or route data, answer the counteroffer, handle delivery. Recently revised a delivery? Repairs rise from 2 to 3 Supplies.', '#job-board', 'jobs'],
    [2, 'Defend, or recover', 'At Signal Gate, a successful Defense lowers Alert; three recent depot successes make the depot harder and Defense easier. Blocked by resources or Alert? Check your permission cap. Once a day, Lay low (3 Supplies, up to −2 Alert) and Daily resupply help. Same-day repeats pay less and grant no Influence.', '.daily', 'jobs'],
    [2, 'The Agent console', 'Active missions live in the console (C). Field notes are rule-based advice. You can withdraw an active mission, but costs already spent stay spent. Once the plan is committed for resolution, its result is recorded.', '#dock [data-act="console"]', 'world'],

    [3, 'Hire a Scout', 'In Play & Hire, enable hiring, choose Scout, review the fee in earned Supplies and post the assignment. The fee is reserved while the offer is open. An unfilled offer expires after 15 minutes, or cancel it before acceptance.', '#hire-form', 'social'],
    [3, 'Deliver a job', 'To accept work, first earn a successful NPC mission in that domain. Accepting starts a new mission; succeed within 15 minutes to earn the fee. A miss, withdrawal or expiry refunds the buyer. A paid Scout with verified patrol intel can inform the buyer’s Heist.', '#offer-list', 'social'],
    [3, 'Play a live duel', 'Opt in when free of other missions and duels, then create or join a lobby. Lock one tactic per round: Flank beats Feint, Feint beats Guard, Guard beats Flank. Three rounds of up to 45 seconds; most round wins takes it. Duels give a signed result, no Supplies, and leaving counts as a forfeit.', '#duel-panel', 'social'],

    [4, 'Gather a crew', 'The Workshop makes Heists cheaper; the Garden gives extra Intel on successful Scouts. Create a crew and share the invitation code privately, or join with a friend’s code. Up to five players pool earned Supplies, and the activity list shows who contributed.', '#crew-content', 'crew'],
    [4, 'Inspect rival control', 'Vance targets the Copper Workshop. Iris targets the Rooftop Garden. The Oathkeepers take empty blocks. Check each rival’s captures and current hold: one rival crew moves on the first district check of each UTC day.', '#rival-board', 'crew'],
    [4, 'Claim a block, use the benefit', 'With 4 combined seasonal Influence and 5 Supplies in the treasury, the leader leases the Workshop or Garden for 24 hours, and can reclaim a rival-held block straight away. Another player crew’s active lease is protected. Benefits are fixed when a mission starts. If Claim is unavailable, check the leader, treasury, seasonal Influence and lease expiry.', '#rival-board', 'crew'],

    [5, 'Replay and verify', 'My Passport answers “What happened to my Agent?”. Pick a mission and Watch replay to compare what you knew at entry with the outcome. Verify signature or export the receipt. Successes, misses and withdrawals all stay recorded, and a Scout receipt stays valid evidence of what we saw even after the patrol moves.', '#receipts', 'passport'],
    [5, 'Return with a plan', 'On this browser, a return brief flags a new receipt, a crewmate’s contribution or a rival capture. Then pick one next action. Stale report? Scout again. High Alert? Defend. Workshop held by Vance? Check the treasury and ask your leader to reclaim it. Qualified Scout with spare Supplies? Look for an assignment.', null, 'world'],
    [5, 'That is the Switchyard', 'Reopen this tour any time from Guide (G); the printable player handbook is linked from the help (?) button. Our Syndicates results belong to this district’s record on my Passport.', '#how-to-play', 'world', 'finish'],
  ].map(([ch, title, text, target, open, kind]) => ({ ch, title, text, target, open, kind }));

  // ---------------------------------------------------------------- DOM
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const root = el('div', 'tour'); root.hidden = true; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'tour-title');
  const shades = ['t', 'l', 'r', 'b'].map((s) => el('div', 'tour-shade ' + s));
  const cover = el('div', 'tour-cover'), hole = el('div', 'tour-hole');
  const card = el('div', 'tour-card glass');
  const face = el('div', 'tour-face');
  const chapter = el('p', 'tour-chapter'), title = el('h3', 'tour-title'); title.id = 'tour-title';
  const text = el('p', 'tour-text'); text.setAttribute('aria-live', 'polite');
  const pills = el('div', 'tour-pills'); pills.setAttribute('aria-label', 'Chapters');
  CHAPTERS.forEach((name, n) => { const b = el('button', '', String(n + 1).padStart(2, '0')); b.type = 'button'; b.title = name; b.setAttribute('aria-label', `Chapter ${n + 1}: ${name}`); b.onclick = () => go(STEPS.findIndex((s) => s.ch === n)); pills.append(b); });
  const skip = el('button', 'tour-skip', 'Skip tour'); skip.type = 'button';
  const back = el('button', 'ghost', 'Back'); back.type = 'button';
  const next = el('button', 'primary', 'Next →'); next.type = 'button';
  const alt = el('button', 'ghost', ''); alt.type = 'button'; alt.hidden = true;
  const btns = el('div', 'tour-btns'); btns.append(skip, back, alt, next);
  const say = el('div', 'tour-say'); say.append(chapter, title, text, btns, pills);
  card.append(face, say);
  root.append(...shades, cover, hole, card);
  document.body.append(root);

  let i = -1, raf = 0;
  function setFace() {
    // The narrator is the player's Agent: its KULT World portrait when bridged.
    let src = null, name = api()?.getState()?.agent?.name || 'Your Agent';
    try { const b = window.parent !== window ? window.parent.KultWorldBridge : null; const a = b?.version === 1 ? b.agent : null; if (a && a.id === api()?.getState()?.agent?.id) { const u = new URL(a.portrait, location.href); if (u.origin === location.origin) src = u.href; name = a.name || name; } } catch { /* other origin */ }
    face.innerHTML = src ? '<img alt="">' : '<span class="hood"><i></i><i></i><i></i></span>';
    if (src) face.querySelector('img').src = src;
    const tag = el('b', 'tour-name'); tag.textContent = name; face.append(tag);
  }
  function go(n) {
    if (n < 0 || n >= STEPS.length) return;
    i = n; const s = STEPS[i];
    if (s.open?.startsWith('brief:')) brief(s.open.slice(6)); else shell()?.open(s.open || 'world');
    chapter.textContent = `${String(s.ch + 1).padStart(2, '0')} / 06 · ${CHAPTERS[s.ch]}`;
    title.textContent = s.title;
    text.textContent = typeof s.text === 'function' ? s.text() : s.text;
    [...pills.children].forEach((b, k) => { b.classList.toggle('on', k === s.ch); b.classList.toggle('done', k < s.ch); });
    back.disabled = i === 0;
    alt.hidden = s.kind !== 'checkpoint';
    if (s.kind === 'checkpoint') { next.textContent = 'Start the Scout →'; alt.textContent = 'Keep going'; }
    else if (s.kind === 'finish') next.textContent = 'Scout the canal →';
    else next.textContent = 'Next →';
    card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
    root.classList.toggle('center', !s.target);
    // Bring a target inside a page into view (pages scroll), then spotlight it.
    const t = s.target && document.querySelector(s.target);
    if (t && t.closest('.page-body')) t.scrollIntoView({ block: t.offsetHeight > innerHeight * 0.5 ? 'start' : 'center' });
    place(true); requestAnimationFrame(() => place(true));
    next.focus({ preventScroll: true });
  }
  function start(n = 0) {
    if (!api()?.getState()) return;
    setFace(); root.hidden = false; document.body.classList.add('touring');
    go(n);
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function stop(state, then) {
    if (root.hidden) return;
    root.hidden = true; document.body.classList.remove('touring');
    cancelAnimationFrame(raf); raf = 0;
    try { localStorage.setItem(KEY, state); } catch { /* storage optional */ }
    shell()?.open('world');
    then?.();
  }
  next.onclick = () => {
    const s = STEPS[i];
    if (s.kind === 'checkpoint') return stop('started', () => brief('scout'));
    if (s.kind === 'finish') return stop('done', () => brief('scout'));
    go(i + 1);
  };
  alt.onclick = () => go(i + 1);
  back.onclick = () => go(i - 1);
  skip.onclick = () => stop('skipped');
  [...shades, cover].forEach((e) => e.addEventListener('click', () => { hole.classList.remove('nudge'); void hole.offsetWidth; hole.classList.add('nudge'); }));
  document.addEventListener('keydown', (e) => {
    if (root.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); stop('skipped'); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); if (!STEPS[i].kind) go(i + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); go(i - 1); }
    else if (!/^(Tab|Enter| )$/.test(e.key)) e.stopImmediatePropagation(); // the world and the dock wait
  }, true);

  // ---------------------------------------------------------------- spotlight
  function rectOf(sel) {
    const t = sel && document.querySelector(sel);
    if (!t) return null;
    const r = t.getBoundingClientRect();
    if (!r.width || !r.height || getComputedStyle(t).visibility === 'hidden') return null;
    const pad = 8, w = innerWidth, h = innerHeight;
    const x = Math.max(4, r.left - pad), y = Math.max(4, r.top - pad);
    return { x, y, w: Math.min(w - 4, r.right + pad) - x, h: Math.min(h - 4, r.bottom + pad) - y };
  }
  let last = '';
  function place(force) {
    const s = STEPS[i]; if (!s) return;
    const r = rectOf(s.target), w = innerWidth, h = innerHeight;
    const key = r ? [r.x, r.y, r.w, r.h].map(Math.round).join() + w + 'x' + h : 'c' + w + 'x' + h;
    if (key === last && !force) return; last = key;
    root.classList.toggle('center', !r);
    if (!r) {
      shades[0].style.cssText = 'left:0;top:0;width:100vw;height:100vh'; ['l', 'r', 'b'].forEach((_, k) => { shades[k + 1].style.cssText = 'width:0;height:0'; });
      hole.style.display = 'none'; cover.style.display = 'none'; card.style.cssText = ''; return;
    }
    shades[0].style.cssText = `left:0;top:0;width:${w}px;height:${r.y}px`;
    shades[1].style.cssText = `left:0;top:${r.y}px;width:${r.x}px;height:${r.h}px`;
    shades[2].style.cssText = `left:${r.x + r.w}px;top:${r.y}px;width:${w - r.x - r.w}px;height:${r.h}px`;
    shades[3].style.cssText = `left:0;top:${r.y + r.h}px;width:${w}px;height:${h - r.y - r.h}px`;
    hole.style.cssText = `display:block;left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px`;
    cover.style.cssText = `display:block;left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px`;
    // The card goes where it covers least of the spotlight.
    const cw = card.offsetWidth, ch = card.offsetHeight, m = 16;
    const spots = w < 700
      ? [[m, h - ch - 92], [m, 12]]
      : [[m, h - ch - 112], [m, 92], [w - cw - m, h - ch - 112], [w - cw - m, 92], [(w - cw) / 2, 92], [(w - cw) / 2, h - ch - 112]];
    const overlap = ([x, y]) => Math.max(0, Math.min(x + cw, r.x + r.w) - Math.max(x, r.x)) * Math.max(0, Math.min(y + ch, r.y + r.h) - Math.max(y, r.y));
    const [x, y] = spots.reduce((best, p) => (overlap(p) < overlap(best) ? p : best));
    card.style.cssText = `left:${Math.max(m, x)}px;top:${Math.max(8, y)}px`;
  }
  function loop() { raf = requestAnimationFrame(loop); place(false); }
  addEventListener('resize', () => place(true));

  // ---------------------------------------------------------------- open
  $('#how-to-play')?.addEventListener('click', () => { let n = 0; try { if (localStorage.getItem(KEY) === 'started') n = STEPS.findIndex((s) => s.ch === 2); } catch { /* storage optional */ } start(n); });
  // First visit on this browser: once the district is ready.
  let checked = false;
  addEventListener('kult:state', () => {
    if (checked || !api()?.getState()) return; checked = true;
    let seen = null; try { seen = localStorage.getItem(KEY); } catch { seen = 'unavailable'; }
    if (!seen) setTimeout(() => { if (root.hidden && !document.querySelector('dialog[open]')) start(0); }, 1400);
  });
  window.KultTour = { start, stop: () => stop('skipped'), get step() { return i; }, steps: STEPS.length };
})();
