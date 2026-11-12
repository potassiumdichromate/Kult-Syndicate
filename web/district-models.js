// KULT World's art in the Switchyard: the district's seven landmarks as 3D
// models (Meshy, made to KULT World's "Neon Dusk" art direction; sources in
// kult-world art-src/meshy/syndicates/) and, when the district is opened from
// KULT World, the player's own Agent character walking it.
// Each model replaces its built-in stand-in only once it has loaded, so the
// district always works without them.
import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/addons/GLTFLoader.js';
import { MeshoptDecoder } from './vendor/addons/meshopt_decoder.module.js';
import { bridgedAgent, matchingAgent } from './kult-agent.js';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const here = (path) => new URL(path, import.meta.url).href; // works under /world/syndicates/
// block id -> model, and the tallest each may stand on its lot
const LANDMARKS = {
  home: ['lantern-house', 2.6], canal: ['canal-watch', 3.8], commons: ['union-crossing', 2.3], depot: ['midnight-depot', 2.5],
  gate: ['signal-gate', 2.3], workshop: ['copper-workshop', 2.5], garden: ['rooftop-garden', 2.7]
};
const FOOTPRINT = 1.72, LOT_TOP = 0.34;

// KULT World's emission for Meshy textures (kult-world public/js/models.js
// neonMask): bright, saturated texels (the neon) glow; the rest gets a lift.
function neonMask(map) {
  const img = map.image;
  if (!img?.width) return null;
  const w = Math.min(1024, img.width), h = Math.round((img.height / img.width) * w);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const mx = Math.max(p[i], p[i + 1], p[i + 2]), mn = Math.min(p[i], p[i + 1], p[i + 2]), sat = mx ? (mx - mn) / mx : 0;
    const k = Math.min(1, Math.max(0, (sat - 0.5) / 0.25)) * Math.min(1, Math.max(0, (mx - 165) / 60)) + 0.08;
    p[i] *= k; p[i + 1] *= k; p[i + 2] *= k;
  }
  g.putImageData(d, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  Object.assign(tex, { flipY: map.flipY, colorSpace: THREE.SRGBColorSpace, channel: map.channel, wrapS: map.wrapS, wrapT: map.wrapT });
  return tex;
}
function glow(obj) {
  obj.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    for (const m of [].concat(o.material)) {
      // Meshy exports full metal (metalness 1 + map) for PBR; with no
      // environment map to reflect, metal renders dark and tinted. The
      // district has no env map, so read the texture as painted surface.
      if (m.isMeshStandardMaterial) {
        m.metalness = Math.min(m.metalness, 0.12); m.metalnessMap = null;
        m.roughness = Math.max(m.roughness, 0.6); m.needsUpdate = true;
      }
      if (!m.map || m.emissiveMap) continue;
      const mask = neonMask(m.map);
      if (!mask) continue;
      m.emissiveMap = mask; m.emissive.set('#ffffff'); m.emissiveIntensity = 1.1; m.needsUpdate = true;
    }
  });
}
// Scale to the lot, feet on the lot's top, centred.
function fit(obj, width, height) {
  obj.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(obj), size = b.getSize(new THREE.Vector3());
  const k = Math.min(width / Math.max(size.x, 1e-3), width / Math.max(size.z, 1e-3), height / Math.max(size.y, 1e-3));
  obj.scale.multiplyScalar(k);
  obj.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(obj), c = b2.getCenter(new THREE.Vector3());
  obj.position.sub(new THREE.Vector3(c.x, b2.min.y, c.z));
  const holder = new THREE.Group(); holder.add(obj); return holder;
}

/**
 * Replaces each landmark's stand-in with its model. `groups` maps block id
 * to the stand-in group; its first two children (the lot) stay.
 */
export function upgradeLandmarks(groups, onReady) {
  for (const [id, g] of groups) {
    const spec = LANDMARKS[id];
    if (!spec) continue;
    loader.load(here(`./models/${spec[0]}.glb`), (gltf) => {
      const model = fit(gltf.scene, FOOTPRINT, spec[1]);
      glow(model);
      model.position.y = LOT_TOP;
      g.children.slice(2).forEach((c) => { c.visible = false; });
      g.add(model);
      onReady?.(id);
    }, undefined, (e) => console.warn('[syndicates] landmark model', spec[0], e?.message || e));
  }
}

/**
 * The player's KULT World Agent walking the district, when KULT World opened
 * it. Returns { update(dt, moving) } once loaded, else null (stand-in stays).
 */
export function upgradeCharacter(character, onReady) {
  if (!bridgedAgent()) return;
  // Only the Agent this session plays; the state may still be loading.
  const agent = matchingAgent();
  if (!agent) {
    if (!window.KultDistrictAPI?.getState?.()) window.addEventListener('kult:state', () => upgradeCharacter(character, onReady), { once: true });
    return;
  }
  let url = null;
  try { url = agent?.model && new URL(agent.model, location.href); } catch { url = null; }
  if (!url || url.origin !== location.origin) return;
  loader.load(url.href, (gltf) => {
    const body = fit(gltf.scene, 0.9, 0.95);
    glow(body); // KULT World lights its Agents the same way (world3d.js addGlow "agent")
    body.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
    const keep = character.children[character.children.length - 1]; // the selection ring
    character.children.slice().forEach((c) => { if (c !== keep) c.visible = false; });
    character.add(body);
    const inner = body.children[0];
    const mixer = new THREE.AnimationMixer(inner), actions = {};
    for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(clip);
    const find = (word) => Object.keys(actions).find((n) => n.toLowerCase().includes(word));
    const idle = actions[find('idle')], walk = actions[find('walk')] || actions[find('run')];
    let current = null;
    const play = (a) => { if (!a || a === current) return; a.reset().fadeIn(0.2).play(); current?.fadeOut(0.2); current = a; };
    play(idle);
    onReady?.({ update(dt, moving) { play(moving ? walk : idle); mixer.update(dt); } });
  }, undefined, (e) => console.warn('[syndicates] agent model', e?.message || e));
}
