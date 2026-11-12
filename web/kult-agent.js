// The player's KULT World Agent inside the Switchyard.
//
// KULT World serves this district from its own origin and opens it in a
// same-origin frame, publishing the player's Agent as window.KultWorldBridge
// (kult-world public/js/syndicates.js): archetype, clan, ELO rank, 0G INFT,
// portrait and its rigged 3D model. It is presentation only. The Agent's
// identity in this game is still the signed launch ticket, and the profile is
// used only when its id matches the Agent signed in here.
export function bridgedAgent() {
  try {
    const b = window.parent !== window ? window.parent.KultWorldBridge : null;
    return b && b.version === 1 && b.agent?.id ? b.agent : null;
  } catch { return null; } // opened on another origin: no bridge
}

/** The bridged Agent, if it is the one this session plays. */
export function matchingAgent() {
  const a = bridgedAgent(), s = window.KultDistrictAPI?.getState?.();
  return a && s?.agent?.id === a.id ? a : null;
}

const safeUrl = (u) => { try { const url = new URL(u, location.href); return url.origin === location.origin ? url.href : null; } catch { return null; } };

function decorate() {
  const a = matchingAgent(), card = document.querySelector('.agent-card');
  if (!a || !card || card.dataset.kultWorld === a.id) return;
  card.dataset.kultWorld = a.id;
  card.style.setProperty('--kw-arch', a.color || '#a98bff');
  const portrait = card.querySelector('.portrait'), src = safeUrl(a.portrait);
  if (portrait && src) {
    const img = document.createElement('img');
    img.className = 'kw-agent-portrait'; img.alt = ''; img.src = src;
    portrait.replaceWith(img);
  }
  const tags = document.createElement('div'); tags.className = 'kw-agent-tags';
  const tag = (cls, text, icon) => {
    const t = document.createElement('span'); t.className = cls;
    const i = icon && safeUrl(icon);
    if (i) { const im = document.createElement('img'); im.src = i; im.alt = ''; t.append(im); }
    t.append(text); tags.append(t);
  };
  tag('arch', a.archetypeName || a.archetype);
  if (a.rank) tag('rank', `${a.rank.name} · ${Number(a.elo || 0).toLocaleString()} ELO`, a.rank.badge);
  if (a.clan) tag('clan', a.clan.name, a.clan.logo);
  if (a.inft) tag('inft', `0G INFT #${a.inft}`);
  const eyebrow = card.querySelector('.eyebrow');
  if (eyebrow) eyebrow.textContent = 'YOUR KULT WORLD AGENT';
  (card.querySelector('#agent-memory') || card.lastElementChild).after(tags);
}

window.addEventListener('kult:state', decorate);
decorate();
