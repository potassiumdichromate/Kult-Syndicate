'use strict';
// KULT Syndicates on cards.
//
// One card holds whatever matters right now: the next step of your goal, a
// mission brief, a decision, the countdown or the result. The mission deck sits
// below it. The server stays the authority on every rule, cost and outcome;
// this file only shows its state and sends the player's choices.
if (new URLSearchParams(location.search).get('embed') === '1') document.body.classList.add('embedded-world');
const appRoot = new URL('.', document.currentScript.src);
const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let state = null, csrf = '', tab = 'district', busy = false, receipt = null, replayTimer = null, selectedJob = null;
let resultToShow = null, showAllJobs = false, pendingTotal = { id: null, seconds: 1 };

// What each mission is, in a player's words. Costs and rewards come from the server.
const JOBS = {
  scout: { verb: 'Scout', place: 'Canal Watch', art: 'canal-watch', block: 'canal' },
  heist: { verb: 'Heist', place: 'Midnight Depot', art: 'midnight-depot', block: 'depot' },
  negotiate: { verb: 'Negotiate', place: 'Union Crossing', art: 'union-crossing', block: 'commons' },
  defend: { verb: 'Defend', place: 'Signal Gate', art: 'signal-gate', block: 'gate' },
};
const ORDER = ['scout', 'heist', 'negotiate', 'defend'];
const art = (name) => new URL('art/cards/' + name + '.webp', appRoot).href;
const img = (name, cls = '', alt = '') => `<img class="${cls}" src="${art(name)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
const plural = (n, one, many) => (Number(n) === 1 ? one : many);
const chip = (cls, n, word) => `<span class="chip ${cls}"><i></i><b>${n}</b> <span>${word}</span></span>`;
const supplyChip = (n) => chip('sup', n, plural(n, 'Supply', 'Supplies'));
const kindTag = (kind) => `<span class="kind-tag"><span>${JOBS[kind]?.verb || esc(kind)}</span> · <span>${JOBS[kind]?.place || ''}</span></span>`;

// ---------------------------------------------------------------- server
let noticeTimer = 0;
function notice(t, error = false) {
  const n = $('#notice');
  n.textContent = t;
  n.className = 'toast' + (error ? ' error' : '');
  clearTimeout(noticeTimer);
  if (t && !error) noticeTimer = setTimeout(() => { n.textContent = ''; }, 6000);
}
async function api(path, body) {
  let r;
  try {
    r = await fetch(new URL(path.replace(/^\//, ''), appRoot), {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, 'X-Request-ID': crypto.randomUUID() },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch { throw Error('Connection lost. Check your network, then retry.'); }
  let j;
  try { j = await r.json(); } catch { throw Error('The service returned an unreadable response. Please retry.'); }
  if (!r.ok) {
    if (r.status === 401 && state) {
      const demo = state.agent.mode === 'demo';
      state = null; csrf = '';
      $('#experience').classList.add('hidden');
      $('#login').classList.remove('hidden');
      $('#enter').classList.toggle('hidden', !demo);
      $('#login-text').textContent = demo ? 'Your sandbox session expired. Re-enter to continue with a new session.' : 'Your session expired. Return from KULT World to bind this same Agent again.';
    }
    throw Error(j.error || 'Request failed');
  }
  return j;
}
async function act(path, body = {}) {
  if (busy) return;
  busy = true;
  document.body.classList.add('busy');
  $('#mission-panel').setAttribute('aria-busy', 'true');
  try { await api(path, body); notice(''); await refresh(); } catch (e) { notice(e.message, true); } finally {
    busy = false;
    document.body.classList.remove('busy');
    $('#mission-panel').removeAttribute('aria-busy');
  }
}

// ---------------------------------------------------------------- what changed while away
function readSnapshot(id) { try { return JSON.parse(localStorage.getItem('syndicates-last-seen:' + id) || 'null'); } catch { return null; } }
function saveSnapshot() {
  try {
    localStorage.setItem('syndicates-last-seen:' + state.agent.id, JSON.stringify({
      rivalDay: state.rivals.latest.day, receipt: state.receipts[0]?.id || null, activity: state.crew?.activity?.[0]?.at || null,
      territory: state.crew?.territory?.map((x) => x.block + ':' + x.expires).sort() || [],
    }));
  } catch { /* private mode */ }
}
function showReturn(previous) {
  if (!previous) return;
  const next = state.crew?.activity?.find((x) => x.at > (previous.activity || 0) && x.agent !== state.agent.id);
  const newReceipt = state.receipts[0]?.id && state.receipts[0].id !== previous.receipt;
  const territory = JSON.stringify(state.crew?.territory?.map((x) => x.block + ':' + x.expires).sort() || []) !== JSON.stringify(previous.territory || []);
  const move = state.rivals.latest, rival = previous.rivalDay != null && move.day > previous.rivalDay && move.block;
  if (!next && !newReceipt && !territory && !rival) return;
  let destination = 'passport', title, detail;
  if (next) {
    destination = 'crew'; title = 'Your crew made a move.';
    detail = `${next.name} ${next.event === 'crew.deposit' ? 'contributed ' + next.detail.amount + ' Supplies' : next.event === 'territory.claimed' ? 'leased the ' + next.detail.block : next.event === 'receipt.issued' ? 'completed a recorded mission' : 'joined the crew'}.`;
  } else if (territory) { destination = 'crew'; title = 'Territory status changed.'; detail = 'Your crew’s held blocks are different from your last visit.'; }
  else if (rival) { destination = 'crew'; title = move.crew + ' occupied the ' + move.block + '.'; detail = 'A rival crew moved. Check who holds what before you plan a claim.'; }
  else { title = 'Your Agent has a new receipt.'; detail = 'Review the recorded outcome and the decisions behind it.'; }
  $('#return-title').textContent = title;
  $('#return-detail').textContent = detail;
  $('#return-brief').classList.remove('hidden');
  $('#return-action').onclick = () => { $('#return-brief').classList.add('hidden'); setTab(destination); };
}

async function refresh(checkAway = false) {
  const previous = state ? readSnapshot(state.agent.id) : null;
  const before = state;
  state = await api('/api/state');
  csrf = state.csrf;
  if (state.mission) { selectedJob = null; resultToShow = null; }
  // A mission that resolved during this visit gets its result card.
  const top = state.receipts[0];
  if (before && top && top.id !== before.receipts[0]?.id && JOBS[top.missionType]) resultToShow = top;
  render(before);
  if (checkAway) showReturn(previous || readSnapshot(state.agent.id));
  saveSnapshot();
}

// ---------------------------------------------------------------- tabs
function setTab(t) {
  tab = t;
  document.body.dataset.view = t;
  window.dispatchEvent(new Event('kult:view'));
  $$('.screen').forEach((e) => e.classList.toggle('hidden', e.id !== t || !state));
  $$('.nav').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === t);
    if (b.dataset.tab === t) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  if (state) render();
  window.scrollTo({ top: 0, behavior: 'auto' });
}
function showStage() {
  if (tab !== 'district') setTab('district');
  const p = $('#mission-panel');
  if (p.getBoundingClientRect().top < 100 || p.getBoundingClientRect().top > innerHeight * 0.5) p.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------------------------------------------------------------- render
function bump(prev) {
  if (!prev) return;
  for (const [k, id] of [['supplies', 'supplies'], ['intel', 'intel'], ['influence', 'influence'], ['alert', 'alert']]) {
    if (prev.agent[k] !== state.agent[k]) { const c = $('#' + id).parentElement; c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  }
}
function render(prev) {
  $('#login').classList.add('hidden');
  $('#experience').classList.remove('hidden');
  $$('.screen').forEach((e) => e.classList.toggle('hidden', e.id !== tab));
  $$('.nav').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  const a = state.agent;
  $('#mode').textContent = a.mode === 'demo' ? 'SANDBOX' : 'KULT CONNECTED';
  $('#mode').classList.toggle('connected', a.mode !== 'demo');
  for (const k of ['supplies', 'intel', 'influence']) $('#' + k).textContent = a[k];
  $('#alert').textContent = a.alert + '/4';
  document.body.dataset.alert = String(a.alert);
  bump(prev);
  $('#season').textContent = String(state.season).padStart(2, '0');
  $('#agent-name').textContent = a.name;
  $('#agent-subtitle').textContent = a.mode === 'demo' ? 'LOCAL SANDBOX · PRACTICE IDENTITY' : a.id;
  $('#agent-memory').textContent = `Syndicates memory · ${state.agentMemory.verifiedRoutes} verified route${state.agentMemory.verifiedRoutes === 1 ? '' : 's'} · ${state.agentMemory.linkedManifests} linked manifest${state.agentMemory.linkedManifests === 1 ? '' : 's'}`;
  renderGoal();
  renderStage();
  renderDeck();
  renderPassport();
  renderCrew();
  if (typeof renderSocial === 'function') renderSocial();
  renderPolicy();
  const p = a.policy;
  $('#district-status').textContent = p.stopped ? 'Emergency stop is on. Turn it off in Permissions to play.'
    : a.alert >= 2 ? `Alert is ${a.alert}/4, so missions are harder. Defend at Signal Gate or lay low.`
      : 'Resupply tops up Supplies and Intel. Laying low lowers Alert.';
  $('#lay-low').disabled = a.alert === 0 || a.supplies < 3 || !!state.mission;
  window.dispatchEvent(new Event('kult:state'));
}

// The operation: Scout the canal, Heist the depot, then hold territory with a crew.
function progress() {
  const op = state.operation, lead = op.lead;
  const done = !!(op.completedReceipt && state.receipts.some((r) => r.id === op.completedReceipt && (!lead || r.context?.scoutReceipt === lead.receiptId)));
  return { op, lead, done, heistTried: state.receipts.some((r) => r.missionType === 'heist') };
}
function renderGoal() {
  const { op, lead, done } = progress();
  const step = op.workshop && done ? 4 : done ? 3 : lead && !op.stale ? 2 : 1;
  $('#operation-state').textContent = step === 4 ? 'GOAL COMPLETE' : state.receipts.length ? 'YOUR GOAL' : 'YOUR FIRST GOAL';
  $('#operation-title').textContent = step >= 3 ? 'Hold territory with a crew' : 'Recover the manifest';
  $$('.path [data-chapter]').forEach((e, i) => {
    e.classList.toggle('complete', i + 1 < step);
    e.classList.toggle('current', i + 1 === step);
  });
}

function renderStage() {
  const p = $('#mission-panel'), m = state.mission;
  if (m && m.status === 'PENDING') return stageWait(p, m);
  if (m) return stageDecision(p, m);
  if (resultToShow) return stageResult(p, resultToShow);
  const job = state.missions.find((x) => x.kind === selectedJob);
  if (job) return stageBrief(p, job);
  return stageNext(p);
}
function frame(p, k, html) {
  p.className = 'stage card k-' + k;
  p.innerHTML = `<div class="band"></div><div class="inner">${html}</div>`;
}

// What to do next, when nothing is running.
function nextStep() {
  const { op, lead, done } = progress();
  const job = (k) => state.missions.find((m) => m.kind === k);
  if (op.stale) return { k: 'scout', art: 'canal-watch', eyebrow: 'YOUR REPORT WENT STALE', title: 'The patrol rotated.', text: 'Two recent Heists used your report, so the patrol moved. Scout again for a fresh route, or go to the depot and survey the entrance there.', primary: ['Scout again', () => selectJob('scout')], secondary: ['Open the Heist brief', () => selectJob('heist')], next: 'scout' };
  if (done && !op.workshop) return { k: 'crew', art: 'copper-workshop', eyebrow: 'MANIFEST RECOVERED', title: 'Turn the win into territory.', text: 'Form a crew of up to five players. With 4 Influence and 5 Supplies pooled, your crew can lease the Copper Workshop, which makes Heists cheaper.', primary: ['Open Crew', () => setTab('crew')], secondary: ['Watch the Heist replay', () => { const r = state.receipts.find((x) => x.id === op.completedReceipt); if (r) openReplay(r); }], next: null };
  if (done) return { k: 'done', art: 'copper-workshop', eyebrow: 'YOUR CREW HOLDS THE WORKSHOP', title: 'Your crew changed the district.', text: `While the lease lasts, Heists cost ${op.crewSynergy ? 2 : 1} ${op.crewSynergy ? 'Supplies' : 'Supply'} less. Keep running missions to earn Influence for the season.`, primary: ['See your Passport', () => setTab('passport')], next: null };
  if (lead) {
    const until = new Date(lead.expires * 1000).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
    return { k: 'heist', art: 'midnight-depot', eyebrow: 'STEP 2 · THE HEIST', title: 'Take the manifest at Midnight Depot.', text: `Your Scout report says the patrol is at the ${lead.patrol}. Use it to choose the safer entrance. The report is good until ${until}.`, primary: ['Open the Heist brief', () => selectJob('heist')], cost: job('heist')?.cost, next: 'heist' };
  }
  const first = !state.receipts.length;
  return { k: 'scout', art: 'canal-watch', eyebrow: first ? 'STEP 1 · YOUR FIRST JOB' : 'STEP 1 · THE SCOUT', title: 'Scout Canal Watch.', text: 'A patrol guards one entrance to Midnight Depot. Send your Agent to find out which one. You make three quick calls, then your Agent brings back a report.', primary: ['Open the Scout brief', () => selectJob('scout')], secondary: first ? null : ['Or hire a Scout', () => setTab('social')], cost: job('scout')?.cost, next: 'scout' };
}
function stageNext(p) {
  const n = nextStep();
  frame(p, n.k, `<div class="hero"><div><p class="eyebrow">${n.eyebrow}</p><h2>${n.title}</h2><p class="intro">${n.text}</p></div>${img(n.art, 'hero-art')}</div>
    ${n.next === 'scout' && !state.receipts.length ? `<ol class="steps-3"><li><b>1 · Read the brief</b><span>See the cost first. Reading is free.</span></li><li><b>2 · Make three calls</b><span>Your Agent shows a clue each time.</span></li><li><b>3 · Return</b><span>After a short countdown, see what happened.</span></li></ol>` : ''}
    <div class="actions"><button id="stage-go" class="btn primary big" type="button">${n.primary[0]}</button>${n.secondary ? `<button id="stage-alt" class="btn ghost" type="button">${n.secondary[0]}</button>` : ''}</div>`);
  $('#stage-go').onclick = n.primary[1];
  if (n.secondary) $('#stage-alt').onclick = n.secondary[1];
}

function blockedReason(job) {
  const p = state.agent.policy;
  if (state.mission) return 'Finish your current mission first.';
  if (p.stopped) return 'Emergency stop is on. Turn it off in Permissions.';
  if (!p.allowed.includes(job.kind)) return 'Your Permissions don’t allow this job.';
  if (p.maxSupplies < job.cost) return 'Your mission cap in Permissions is below the entry cost.';
  if (state.agent.supplies < job.cost) return 'You need more Supplies. Try the daily resupply.';
  return '';
}
function stageBrief(p, job) {
  const reason = blockedReason(job), a = state.agent, lead = state.operation.lead, J = JOBS[job.kind];
  const faction = state.blocks.find((b) => b.kind === job.kind)?.faction || 'District';
  let tip = '';
  if (job.kind === 'heist') tip = lead && !state.operation.stale
    ? `<div class="callout"><p>Your Scout report says the patrol is at the ${esc(lead.patrol)}. Pick the other entrance for the best plan.</p></div>`
    : `<div class="callout warn"><p>No fresh Scout report, so you won’t know where the patrol is. You can still go in: spend 2 Intel on an entry survey, or guess.</p></div>`;
  else if (job.kind === 'scout') tip = `<div class="callout"><p>Tip: cross-check the beacons with Intel, then report the route with its uncertainty. That report helps you at the depot for up to 24 hours.</p></div>`;
  else if (job.kind === 'defend') tip = `<div class="callout"><p>A clean Defense lowers Alert, which makes every other mission easier.</p></div>`;
  else if (job.kind === 'negotiate') tip = `<div class="callout"><p>Read what the Union needs before you offer. A broken agreement makes later terms worse.</p></div>`;
  frame(p, job.kind, `<div class="hero"><div>${kindTag(job.kind)}<h2>${esc(job.name)}</h2><p class="intro">${esc(job.intro)}</p></div>${img(J.art, 'hero-art')}</div>
    <div class="facts">
      <div class="fact ${a.supplies < job.cost ? 'warn' : ''}"><small>Entry cost</small><b>${job.cost} ${plural(job.cost, 'Supply', 'Supplies')}</b></div>
      <div class="fact"><small>You have</small><b>${a.supplies} ${plural(a.supplies, 'Supply', 'Supplies')}</b></div>
      <div class="fact"><small>Reward on success</small><b>up to ${job.reward}</b></div>
      <div class="fact ${a.alert >= 2 ? 'warn' : ''}"><small>Alert</small><b>${a.alert}/4</b></div>
      <div class="fact opp"><small>Opposition</small><b>${esc(faction)}</b></div>
    </div>
    ${tip}
    ${job.repeatToday ? `<div class="callout warn"><p>You already ran this job today, so it pays less and gives no Influence.</p></div>` : ''}
    ${a.alert >= 2 ? `<div class="callout warn"><p>Alert is ${a.alert}/4, so the district resists harder. Defend or lay low first if you can.</p></div>` : ''}
    ${reason ? `<div class="callout bad"><p>${reason}</p></div>` : ''}
    <div class="actions"><button id="commit-job" class="btn primary big" type="button" ${reason ? 'disabled' : ''}>Commit to this job</button><button id="clear-job" class="btn ghost" type="button">Back</button></div>
    <p class="fine">Three decisions, then a short countdown. Wins, misses and walk-aways all go on your Passport. Game resources only.</p>`);
  $('#commit-job').onclick = () => act('/api/missions', { kind: job.kind });
  $('#clear-job').onclick = () => { selectedJob = null; renderStage(); renderDeck(); };
}

function optionBlock(m, o, cap) {
  const a = state.agent, p = a.policy;
  if (p.stopped) return 'Emergency stop is on';
  if (!p.allowed.includes(m.kind)) return 'Not allowed by Permissions';
  if (m.spent + o.supplies > cap) return 'Over your mission cap';
  if (o.supplies > a.supplies) return 'Not enough Supplies';
  if (o.intel > a.intel) return 'Not enough Intel';
  return '';
}
function stageDecision(p, m) {
  const cap = Math.min(m.policy.maxSupplies, state.agent.policy.maxSupplies), J = JOBS[m.kind] || JOBS.scout;
  const clues = m.context?.situation?.clues || [];
  const options = m.stage.options.map((o) => {
    const why = optionBlock(m, o, cap);
    const cost = [o.supplies ? supplyChip(o.supplies) : '', o.intel ? chip('int', o.intel, 'Intel') : ''].join('') || '<span class="chip free">Free</span>';
    return `<button class="choice" type="button" data-choice="${esc(o.id)}" ${why ? 'disabled' : ''}><span>${esc(o.text)}</span><span class="cost">${cost}${why ? `<span class="chip block">${why}</span>` : ''}</span></button>`;
  }).join('');
  frame(p, m.kind, `<div class="dec-head"><div class="where">${img(J.art)}${kindTag(m.kind)}</div><div class="pips" aria-label="Decision ${m.step + 1} of 3">${[0, 1, 2].map((i) => `<i class="${i <= m.step ? 'on' : ''}"></i>`).join('')}<span>${m.step + 1}/3</span></div></div>
    <h2>${esc(m.stage.title)}</h2>
    <div class="situation"><span class="label">The situation</span><p>${esc(m.stage.text)}</p></div>
    <div class="note"><img src="${art('agent-face')}" alt=""><div class="bubble"><span class="label">Your Agent’s field note</span>${clues.length ? `<div class="clue-list">${clues.map((c) => `<span>${esc(c)}</span>`).join('')}</div>` : ''}<p>${esc(m.recommendation.tradeoff)}</p></div></div>
    <p class="eyebrow">Your call</p>
    <div class="choices">${options}</div>
    <div class="dec-foot"><div class="budget"><span>Supplies used</span><span class="bar"><i style="width:${Math.min(100, (m.spent / Math.max(cap, 1)) * 100)}%"></i></span><b>${m.spent}/${cap}</b></div><button id="withdraw" class="walk" type="button">Walk away</button></div>`);
  $$('#mission-panel [data-choice]').forEach((b) => (b.onclick = () => act('/api/missions/' + m.id + '/choice', { step: m.step, choice: b.dataset.choice })));
  $('#withdraw').onclick = async () => {
    if (await confirmAction('Walk away from this mission?', 'It goes on your Passport as a walk-away. Supplies already spent are not refunded.', 'Walk away')) await act('/api/missions/' + m.id + '/withdraw');
  };
}

function stageWait(p, m) {
  if (pendingTotal.id !== m.id) pendingTotal = { id: m.id, seconds: Math.max(1, Math.ceil(m.ready - Date.now() / 1000)) };
  frame(p, m.kind, `<div class="wait"><div class="ring"><svg viewBox="0 0 120 120"><circle class="track" cx="60" cy="60" r="52"/><circle class="prog" cx="60" cy="60" r="52" stroke-dasharray="326.7" stroke-dashoffset="0"/></svg><b id="countdown-n">…</b></div>
    <div>${kindTag(m.kind)}<h2>Your Agent is in the field.</h2><p class="intro">Your three calls are locked in. When the timer ends, select Return to see what happened.</p>
    <p id="countdown" class="fine" role="status"></p>
    <div class="actions"><button id="resolve" class="btn primary big" type="button" disabled>Return</button></div>
    <p class="fine">The outcome was sealed before your first choice, so nobody can change it now.</p></div></div>`);
  $('#resolve').onclick = () => act('/api/missions/' + m.id + '/resolve');
  updateCountdown();
}
function updateCountdown() {
  const m = state?.mission;
  if (m?.status !== 'PENDING' || !$('#countdown')) return;
  const remain = Math.max(0, Math.ceil(m.ready - Date.now() / 1000));
  $('#countdown-n').textContent = remain ? remain + 's' : '✓';
  $('#countdown').textContent = remain ? 'Resolving in ' + remain + ' seconds…' : 'Your outcome is ready.';
  const ring = $('#mission-panel .prog');
  if (ring) ring.style.strokeDashoffset = String(326.7 * (remain / pendingTotal.seconds));
  $('#resolve').disabled = remain > 0;
}
setInterval(updateCountdown, 500);

function stageResult(p, r) {
  const k = r.missionType, ok = r.outcome === 'SUCCESS', lead = state.operation.lead;
  const stamp = { SUCCESS: 'SUCCESS', MISS: 'MISSED', WITHDRAWN: 'WALKED AWAY', EXPIRED: 'EXPIRED' }[r.outcome] || r.outcome;
  const title = ok ? { scout: 'Patrol found.', heist: 'Manifest recovered.', negotiate: 'Deal struck.', defend: 'District defended.' }[k] : r.outcome === 'MISS' ? 'A miss. It stays on the record.' : 'You walked away.';
  const why = k === 'scout' && !ok ? 'A missed Scout gives no patrol answer. Scout again, or go to the depot without a report.'
    : k === 'scout' && ok ? 'Your report names the patrol. Take it to Midnight Depot and choose the other entrance.'
      : k === 'heist' && ok ? 'Your Passport now links this Heist to the Scout report behind it.' : '';
  let primary;
  if (k === 'scout') primary = ok && lead ? ['Plan the Heist', () => selectJob('heist')] : ['Scout again', () => selectJob('scout')];
  else if (k === 'heist') primary = ok ? (state.operation.workshop ? ['See your Passport', () => setTab('passport')] : ['Next: form a crew', () => setTab('crew')]) : [lead && !state.operation.stale ? 'Try the Heist again' : 'Scout first', () => selectJob(lead && !state.operation.stale ? 'heist' : 'scout')];
  else primary = ['Back to missions', () => {}];
  const rw = r.reward || {};
  frame(p, k, `<div class="result"><div class="stamp ${esc(r.outcome)}">${stamp}</div><h2>${title}</h2>
    <p class="summary">${esc(r.replay.at(-1)?.text || '')}</p>
    ${why ? `<p class="why">${why}</p>` : ''}
    <div class="cost">${supplyChip('+' + (rw.supplies || 0))}${chip('int', '+' + (rw.intel || 0), 'Intel')}${chip('inf', '+' + (rw.influence || 0), 'Influence')}</div>
    <div class="actions"><button id="res-go" class="btn primary big" type="button">${primary[0]}</button><button id="res-replay" class="btn ghost" type="button">Watch replay</button></div>
    <p class="fine">Saved to your Passport.</p></div>`);
  $('#res-go').onclick = () => { resultToShow = null; primary[1](); if (!selectedJob) renderStage(); };
  $('#res-replay').onclick = () => openReplay(r);
}

// ---------------------------------------------------------------- the deck
function renderDeck() {
  const { heistTried, done } = progress(), next = nextStep().next, lead = state.operation.lead;
  const extra = heistTried || showAllJobs || state.receipts.some((r) => r.missionType === 'negotiate' || r.missionType === 'defend');
  const jobs = ORDER.map((k) => state.missions.find((m) => m.kind === k)).filter((m) => m && (extra || m.kind === 'scout' || m.kind === 'heist'));
  $('#job-board').innerHTML = jobs.map((m) => {
    const J = JOBS[m.kind], reason = blockedReason(m);
    const ribbon = m.kind === 'heist' && lead && !state.operation.stale && !done ? '<span class="ribbon teal">Report ready</span>'
      : m.kind === next && !state.mission ? '<span class="ribbon">Next</span>'
        : m.repeatToday ? '<span class="ribbon gray">Repeat · lower pay</span>' : '';
    return `<button class="job k-${m.kind} ${selectedJob === m.kind ? 'selected' : ''}" type="button" data-job="${m.kind}" ${state.mission ? 'disabled' : ''} title="${esc(reason)}">
      ${ribbon}<span class="art">${img(J.art)}</span>
      <span class="body"><span class="kind-tag"><span>${J.verb}</span></span><h4>${esc(m.name)}</h4><span class="where">${J.place}</span>
      <span class="cost">${supplyChip(m.cost)}<span class="chip"><span>win up to</span> <b>${m.reward}</b></span></span></span></button>`;
  }).join('');
  $$('#job-board [data-job]').forEach((b) => (b.onclick = () => selectJob(b.dataset.job)));
  $('#more-jobs').classList.toggle('hidden', extra);
  $('#deck-note').textContent = state.mission ? 'Finish your current mission to pick another.' : 'Pick a card to read its brief. Reading is free.';
}
function selectJob(kind) {
  if (state?.mission) { notice('Finish your current job first.'); showStage(); return; }
  if (!state.missions.find((m) => m.kind === kind)) return;
  selectedJob = kind;
  resultToShow = null;
  if (tab !== 'district') setTab('district'); else { renderStage(); renderDeck(); }
  showStage();
}
function locationAction(b) {
  if (b.kind === 'home') { notice('Lantern House is your safehouse. Your Agent returns here after every mission.'); return; }
  if (b.kind === 'territory') { setTab('crew'); return; }
  selectJob(b.kind);
}

// ---------------------------------------------------------------- Passport
function renderPassport() {
  const r = state.receipts;
  const groups = [['Missions', r.length, ''], ['Successes', r.filter((x) => x.outcome === 'SUCCESS').length, 'SUCCESS'], ['Misses', r.filter((x) => x.outcome === 'MISS').length, 'MISS'], ['Walk-aways', r.filter((x) => x.outcome === 'WITHDRAWN').length, 'WITHDRAWN']];
  $('#passport-stats').innerHTML = groups.map(([l, n, c]) => `<div class="stat s-${c}"><small>${l}</small><b>${n}</b></div>`).join('');
  $('#receipts').innerHTML = r.length
    ? r.map((x) => {
      const J = JOBS[x.missionType];
      const word = { SUCCESS: 'SUCCESS', MISS: 'MISS', WITHDRAWN: 'WALKED AWAY', EXPIRED: 'EXPIRED' }[x.outcome] || x.outcome;
      return `<button class="receipt" type="button" data-replay="${esc(x.id)}">${img(J ? J.art : 'lantern-house')}<span><span class="status ${x.outcome === 'MISS' ? 'miss' : x.outcome === 'SUCCESS' ? '' : 'withdrawn'}">${esc(word)}</span><b>${J ? J.verb + ' · ' + J.place : esc(x.missionType.toUpperCase())}</b><span class="when">${new Date(x.createdAt * 1000).toLocaleString()}</span></span></button>`;
    }).join('')
    : `<div class="card empty">${img('lantern-house')}<h3>A clean page, not a perfect score.</h3><p>Finish your first mission and it will appear here, win or miss.</p><button class="btn primary" type="button" id="passport-start">Go to missions</button></div>`;
  $$('[data-replay]').forEach((b) => (b.onclick = () => openReplay(r.find((x) => x.id === b.dataset.replay))));
  if ($('#passport-start')) $('#passport-start').onclick = () => setTab('district');
}

// ---------------------------------------------------------------- Crew
function renderCrew() {
  const b = state.rivals;
  $('#rival-board').innerHTML = '<p class="eyebrow">RIVAL CREWS</p><h3>Who holds the district</h3><div class="rivals">' + b.crews.map((r) => {
    const holds = b.holds.filter((h) => h.crew === r.name);
    return `<div class="rival"><b>${esc(r.name)}</b><span>${esc(r.doctrine)}</span><br><span>${holds.map((h) => esc(h.block) + ' held since ' + new Date(h.since * 1000).toLocaleDateString()).join(', ') || 'No block held'}</span></div>`;
  }).join('') + '</div>';
  const c = state.crew, e = $('#crew-content');
  if (!c) {
    e.innerHTML = `<div class="crew-grid"><form id="create-crew" class="card"><p class="eyebrow">START ONE</p><h3>Found a crew</h3><p class="fine">Invite up to four other players with a private code.</p><label>Crew name<input type="text" name="name" required minlength="2" maxlength="32" placeholder="The Lantern Keepers"></label><button class="btn primary">Create crew</button></form><form id="join-crew" class="card"><p class="eyebrow">OR JOIN ONE</p><h3>Answer an invitation</h3><p class="fine">Enter a crew’s private invitation code.</p><label>Invitation code<input type="text" name="code" required maxlength="8" placeholder="8-character code"></label><button class="btn primary">Join crew</button></form></div>`;
    $('#create-crew').onsubmit = (ev) => { ev.preventDefault(); act('/api/crew/create', { name: new FormData(ev.target).get('name') }); };
    $('#join-crew').onsubmit = (ev) => { ev.preventDefault(); act('/api/crew/join', { code: new FormData(ev.target).get('code') }); };
    return;
  }
  const claim = (id) => {
    const held = state.territory.find((x) => x.block === id), name = id === 'garden' ? 'Rooftop Garden' : 'Copper Workshop';
    const perk = id === 'garden' ? 'Extra Intel on successful Scouts.' : 'Cheaper Heists.';
    return `<button class="choice claim" type="button" data-claim="${id}" ${held || c.leader !== state.agent.id || c.treasury < 5 ? 'disabled' : ''}>${img(id === 'garden' ? 'rooftop-garden' : 'copper-workshop')}<span><span>${name}</span><small><span>${perk}</span> <span>${held ? `Held until ${new Date(held.expires * 1000).toLocaleString()} · ${held.crew === c.id ? 'Your crew' : 'Another crew'}` : 'Lease for 24 hours · 5 Supplies'}</span></small></span></button>`;
  };
  e.innerHTML = `<div class="crew-grid"><div class="card"><p class="eyebrow">${c.members.length} / 5 MEMBERS</p><h3>${esc(c.name)}</h3><p class="fine">Private invitation code: <b>${esc(c.code)}</b> <button id="copy-invite" class="text-button" type="button">Copy code</button></p><div class="crew-members">${c.members.map((m) => `<span>${esc(m.name)}${m.id === c.leader ? ' · Leader' : ''}</span>`).join('')}</div><h3>${c.treasury} Supplies in treasury</h3><button id="deposit" class="btn primary" type="button" ${state.agent.supplies < 5 ? 'disabled' : ''}>Contribute 5 Supplies</button><p class="fine">The leader confirms leases. Contributions are in-game Supplies.</p></div>
    <div class="card"><p class="eyebrow">CLAIM A PLACE</p><h3>Lease a block for a perk</h3><p class="fine">Needs 4 crew Influence this season and 5 Supplies in the treasury. A lease lasts 24 hours. Two contributing members make the perk stronger.</p><div class="claim-grid">${claim('workshop')}${claim('garden')}</div></div></div>
    <div class="card crew-activity"><p class="eyebrow">RECENT CREW ACTIONS</p>${c.activity?.length ? c.activity.map((x) => `<p><b>${esc(x.name)}</b> ${esc(x.event === 'crew.deposit' ? 'contributed ' + x.detail.amount + ' Supplies' : x.event === 'territory.claimed' ? 'leased the ' + x.detail.block : x.event === 'receipt.issued' ? 'recorded a ' + x.detail.outcome + ' mission' : x.event === 'crew.created' ? 'founded the crew' : 'joined the crew')} <small>${new Date(x.at * 1000).toLocaleString()}</small></p>`).join('') : '<p class="fine">No crew actions recorded yet.</p>'}</div>`;
  $('#copy-invite').onclick = async () => {
    try { await navigator.clipboard.writeText(c.code); notice('Invitation code copied. Share it only with the player you intend to invite.'); } catch { notice('Clipboard access is unavailable. Select the code above to copy it.', true); }
  };
  $('#deposit').onclick = async () => { if (await confirmAction('Contribute 5 Supplies?', 'This moves 5 earned in-game Supplies into your crew treasury.', 'Contribute Supplies')) await act('/api/crew/deposit', { amount: 5 }); };
  $$('[data-claim]').forEach((btn) => (btn.onclick = async () => {
    const place = btn.dataset.claim === 'garden' ? 'Rooftop garden' : 'Copper workshop';
    if (await confirmAction('Lease ' + place + '?', 'The crew spends 5 treasury Supplies for a 24-hour lease.', 'Lease this place')) await act('/api/crew/claim', { block: btn.dataset.claim });
  }));
}

// ---------------------------------------------------------------- Permissions
function renderPolicy() {
  const p = state.agent.policy;
  if (document.activeElement?.closest?.('#policy-form')) return; // don't overwrite while editing
  $('#budget').value = p.maxSupplies;
  $('#risk').checked = p.allowRisk;
  $('#stopped').checked = p.stopped;
  $('#allowed').innerHTML = '<legend>Allowed jobs</legend>' + ORDER.map((k) => state.missions.find((m) => m.kind === k)).filter(Boolean).map((m) => `<label class="check"><input type="checkbox" value="${m.kind}" ${p.allowed.includes(m.kind) ? 'checked' : ''}> ${JOBS[m.kind].verb}</label>`).join('');
  $('#policy-version').textContent = 'Policy version ' + p.version + ' · Applies immediately; mission budgets cannot be increased mid-run.';
}
$('#policy-form').onsubmit = async (e) => {
  e.preventDefault();
  const payload = { maxSupplies: Number($('#budget').value), allowRisk: $('#risk').checked, stopped: $('#stopped').checked, allowed: $$('#allowed input:checked').map((x) => x.value) };
  if (payload.stopped && !state.agent.policy.stopped && !(await confirmAction('Turn on the emergency stop?', 'New missions and choices will be blocked immediately. Active jobs can still be withdrawn.', 'Turn on stop'))) return;
  document.activeElement?.blur?.();
  await act('/api/policy', payload);
  if (!$('#notice').textContent) notice('Permissions saved. Your Agent now follows these limits.');
};

// ---------------------------------------------------------------- dialogs
function confirmAction(title, body, yes) {
  const d = $('#confirm-modal');
  $('#confirm-title').textContent = title;
  $('#confirm-body').textContent = body;
  $('#confirm-yes').textContent = yes;
  return new Promise((resolve) => {
    let done = false;
    const finish = (answer) => { if (done) return; done = true; d.close(); resolve(answer); };
    $('#confirm-no').onclick = () => finish(false);
    $('#confirm-yes').onclick = () => finish(true);
    d.oncancel = (e) => { e.preventDefault(); finish(false); };
    d.showModal();
  });
}
function openReplay(r) {
  if (!r) return;
  receipt = r;
  clearInterval(replayTimer);
  $('#replay-title').textContent = r.missionType.toUpperCase() + ' / ' + r.outcome;
  const assessment = ['switchyard-2.0.0', 'switchyard-2.1.0', 'switchyard-2.2.0'].includes(r.contentVersion) && r.opponentType === 'NPC'
    ? `<div class="replay-assessment"><b>Decision assessment</b><span>Plan ${r.score} / resistance ${r.threshold} · alert ${r.context.startingAlert} → ${r.context.alertAfter}</span><small>${r.context.repeatToday ? 'Repeat mission: reduced Supplies, no Influence.' : 'First mission of this type today.'} ${r.missionType === 'heist' && r.context.scoutReceipt ? 'Verified Scout report used.' : ''}</small></div>` : '';
  $('#replay-body').innerHTML = `<span class="status ${r.outcome === 'MISS' ? 'miss' : ''}">${esc(r.label)} · ${esc(r.opponentType)} OPPOSITION</span>${assessment}<div class="timeline">${r.replay.map((e, i) => `<div class="event active" data-event="${i}"><small>${String(e.tick).padStart(2, '0')}s / ${e.type.toUpperCase()}</small>${esc(e.text)}</div>`).join('')}</div><div class="proof-code">Receipt ${esc(r.id)}<br>Replay hash ${esc(r.replayHash)}<br>Policy hash ${esc(r.policyHash)}</div><p class="fine">Verify signature checks this game’s signed result. It does not prove a real-world event.</p>`;
  $('#verification').textContent = '';
  $('#replay-modal').showModal();
}
$('#close-replay').onclick = () => { clearInterval(replayTimer); $('#replay-modal').close(); };
$('#replay-modal').addEventListener('close', () => clearInterval(replayTimer));
$('#replay-play').onclick = () => {
  clearInterval(replayTimer);
  let i = 0;
  $$('[data-event]').forEach((e) => e.classList.remove('active'));
  replayTimer = setInterval(() => { const e = $(`[data-event="${i}"]`); if (e) { e.classList.add('active'); i++; } else clearInterval(replayTimer); }, 650);
};
$('#receipt-download').onclick = () => {
  const u = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = u; a.download = receipt.id + '.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
};
$('#receipt-verify').onclick = async () => {
  try {
    const r = await api('/api/verify', { receipt });
    $('#verification').textContent = r.valid ? '✓ Signature, replay hash and seed commitment verified by this service. Export the receipt for independent CLI verification.' : 'Verification failed.';
  } catch (e) { $('#verification').textContent = e.message; }
};

// ---------------------------------------------------------------- wiring
$$('[data-tab]').forEach((b) => (b.onclick = () => setTab(b.dataset.tab)));
$('#show-all-jobs').onclick = () => { showAllJobs = true; renderDeck(); };
$('#resupply').onclick = () => act('/api/resupply');
$('#lay-low').onclick = async () => { if (await confirmAction('Lay low?', 'Spend 3 earned Supplies to lower Alert by up to 2. Once per day, between missions.', 'Lay low')) await act('/api/lay-low'); };
$('#enter').onclick = async () => { try { const r = await api('/api/session', {}); csrf = r.csrf; await refresh(); window.dispatchEvent(new Event('kult:entered')); } catch (e) { notice(e.message, true); } };
$('#retry').onclick = () => refresh().catch((e) => notice(e.message, true));
$('#home').onclick = () => { location.href = new URL('home.html', appRoot).href; };
$('#return-dismiss').onclick = () => $('#return-brief').classList.add('hidden');

// The Godot web build calls this bridge on the same-origin parent; credentials stay here.
window.KultBridge = {
  call: async (path, body) => {
    if (!/^\/api\/(state|policy|social\/policy|pvp\/(?:create|join|choice|leave)|hiring\/(?:create|accept|cancel)|missions(?:\/job_[a-f0-9]+\/(?:choice|withdraw|resolve))?|resupply|lay-low)$/.test(path)) throw Error('Bridge route not allowed');
    const r = await api(path, body === null ? undefined : body);
    if (body !== null) await refresh();
    return r;
  },
  home: () => (location.href = new URL('home.html', appRoot).href),
};
// Older scripts (social.js) open "the console": that is the stage card now.
window.KultWorldUI = { openConsole: showStage, closeConsole: () => {} };
window.KultDistrictAPI = { getState: () => state, getTab: () => tab, getSelected: () => selectedJob, select: locationAction, selectJob };

const refreshOnReturn = () => { if (state && !busy && !document.hidden) refresh(true).catch((e) => notice(e.message, true)); };
window.addEventListener('focus', refreshOnReturn);
document.addEventListener('visibilitychange', refreshOnReturn);

(async () => {
  try {
    const params = new URLSearchParams(location.hash.slice(1));
    const ticket = params.get('launch');
    if (ticket) { history.replaceState(null, '', location.pathname + location.search); await api('/api/session', { ticket }); }
    await refresh(true);
    setTab('district');
    window.dispatchEvent(new Event('kult:entered'));
  } catch (e) {
    $('#login').classList.remove('hidden');
    const h = await api('/api/health').catch(() => null);
    if (h && !h.demo) {
      $('#enter').classList.add('hidden');
      $('#login-text').textContent = 'Open Syndicates from KULT World using a signed launch ticket for your existing Agent.';
    }
    if (e.message && !e.message.startsWith('Session expired')) notice(e.message, true);
  }
})();
