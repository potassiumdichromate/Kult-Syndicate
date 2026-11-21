'use strict';
// First visit: three cards instead of a long tour. Who decides what, the first
// goal, and what the resources are. The last card opens the Scout brief in one
// click. "How to play" (the ? button) reopens it; the printable handbook covers
// the rest.
(() => {
  const $ = (s) => document.querySelector(s);
  const KEY = 'syndicates-welcome-v2', OLD = 'syndicates-tour-v1';
  const d = $('#welcome');
  const A = (n) => new URL('art/cards/' + n + '.webp', document.baseURI).href;
  const api = () => window.KultDistrictAPI;
  const SLIDES = [
    () => `<div class="w-art"><img src="${A('agent')}" alt=""></div><div class="w-body"><p class="eyebrow">WELCOME TO THE SWITCHYARD</p><h2 id="welcome-title">You run an AI Agent.</h2><p>Syndicates is a strategy game inside KULT World. Send your Agent on missions, read what it finds, and make the call.</p>
      <ul class="w-list"><li><i style="--c:var(--teal)"></i><span><b>Your Agent brings the clues.</b> Each decision shows what it sees, plus a field note.</span></li><li><i style="--c:var(--rust)"></i><span><b>You make the decisions.</b> Go, hold back, or spend Intel to be surer. Advice never decides for you.</span></li><li><i style="--c:var(--violet)"></i><span><b>The Passport remembers.</b> Wins, misses and walk-aways stay on your record.</span></li></ul></div>`,
    () => `<div class="w-art trio"><img src="${A('canal-watch')}" alt=""><span class="arrow">→</span><img src="${A('midnight-depot')}" alt=""></div><div class="w-body"><p class="eyebrow">YOUR FIRST GOAL</p><h2>Recover the manifest.</h2><p>A patrol guards one entrance to Midnight Depot. First Scout Canal Watch to learn which one. Then use that report to pull off the Heist.</p>
      <ul class="w-list"><li><i style="--c:var(--teal)"></i><span><b>Scout:</b> three quick calls, then a short countdown.</span></li><li><i style="--c:var(--red)"></i><span><b>Heist:</b> the report tells you the safer way in.</span></li><li><i style="--c:var(--gold)"></i><span><b>Later:</b> form a crew of up to five and claim territory.</span></li></ul></div>`,
    () => `<div class="w-art"><img src="${A('lantern-house')}" alt=""></div><div class="w-body"><p class="eyebrow">GAME RESOURCES ONLY</p><h2>No real money moves.</h2>
      <ul class="w-list"><li><i style="--c:var(--rust)"></i><span><b>Supplies</b> pay for missions and some choices.</span></li><li><i style="--c:var(--teal)"></i><span><b>Intel</b> buys certainty: spend it to check a clue.</span></li><li><i style="--c:var(--violet)"></i><span><b>Influence</b> is what your crew pools to claim territory.</span></li><li><i style="--c:var(--gold)"></i><span><b>Alert</b> rises when you draw attention. High Alert makes jobs harder.</span></li></ul>
      ${api()?.getState()?.agent?.mode === 'demo' ? '<p class="fine">SANDBOX is a separate practice identity. It does not add to your normal record.</p>' : ''}</div>`,
  ];
  let i = 0;
  function paint() {
    $('#w-slides').innerHTML = SLIDES.map((f, n) => `<section class="w-slide ${n === i ? 'on' : ''}">${n === i ? f() : ''}</section>`).join('');
    $('#w-dots').innerHTML = SLIDES.map((_, n) => `<i class="${n === i ? 'on' : ''}"></i>`).join('');
    $('#w-back').classList.toggle('hidden', i === 0);
    $('#w-skip').classList.toggle('hidden', i === SLIDES.length - 1);
    const last = i === SLIDES.length - 1, busy = !!api()?.getState()?.mission;
    $('#w-next').textContent = last ? (busy ? 'Back to my mission' : 'Open the Scout brief') : 'Next';
  }
  function open() { i = 0; paint(); if (!d.open) d.showModal(); }
  function close() { try { localStorage.setItem(KEY, '1'); } catch { /* private mode */ } if (d.open) d.close(); }
  $('#w-next').onclick = () => {
    if (i < SLIDES.length - 1) { i++; paint(); return; }
    close();
    const a = api();
    if (a?.getState()?.mission) window.KultWorldUI?.openConsole(); else a?.selectJob('scout');
  };
  $('#w-back').onclick = () => { if (i > 0) { i--; paint(); } };
  $('#w-skip').onclick = close;
  d.addEventListener('cancel', () => { try { localStorage.setItem(KEY, '1'); } catch { /* private mode */ } });
  $('#how-to-play').onclick = open;
  window.addEventListener('kult:entered', () => {
    let seen = false;
    try { seen = !!(localStorage.getItem(KEY) || localStorage.getItem(OLD)); } catch { seen = true; }
    if (!seen && !api()?.getState()?.receipts?.length) open();
  }, { once: true });
})();
