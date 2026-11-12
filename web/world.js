// The Switchyard as a 3D world, built like KULT World's city: a floating
// island of Meshy-made tiles (cobble plaza, roads, junctions, rail, canal and
// its bridges) on a Meshy sky-rock, the seven Meshy landmarks, rail-yard props,
// KULT World's own trees and lamps, and the player's Agent walking it.
// Sources: kult-world art-src/meshy/syndicates{,-world}/. Lit, toned and
// bloomed the way KULT World is (kult-world public/js/world3d.js).
// Presentation only: app.js and the server stay authoritative for every action.
import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/addons/GLTFLoader.js';
import { MeshoptDecoder } from './vendor/addons/meshopt_decoder.module.js';
import { EffectComposer } from './vendor/addons/EffectComposer.js';
import { RenderPass } from './vendor/addons/RenderPass.js';
import { UnrealBloomPass } from './vendor/addons/UnrealBloomPass.js';
import { OutputPass } from './vendor/addons/OutputPass.js';
import { bridgedAgent, matchingAgent } from './kult-agent.js';

const api = window.KultDistrictAPI;
const $ = (s) => document.querySelector(s);
const wrap = $('#map-wrap'), labels = $('#district-labels');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const here = (p) => new URL(p, import.meta.url).href;
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const load = (p) => loader.loadAsync(here(p));

// ------------------------------------------------------------------ the grid
// The server's 10 x 10 district (server/content.py): the canal runs down
// column 4, crossed only at rows 3 and 7. Around it a ring of plaza, and the
// rail line along the southern edge.
const T = 4, ISO_AZ = Math.PI / 4;
const MIN = -1, MAX = 10;
const toWorld = (gx, gy, y = 0) => new THREE.Vector3((gx - 4.5) * T, y, (gy - 4.5) * T);
const isCanal = (gx, gy) => gx === 4 && gy >= MIN && gy <= 9;
const isBridge = (gx, gy) => isCanal(gx, gy) && (gy === 3 || gy === 7);
function tileAt(gx, gy) {
  if (gy === MAX) return ['rail', 0];
  if (isCanal(gx, gy)) return isBridge(gx, gy) ? ['bridge', 0] : ['canal', 1];
  if (gx === 6 && gy <= 9) return gy === 3 || gy === 7 ? ['junction', 0] : ['road', 1];
  if (gy === 3 || gy === 7) return ['road', 0];
  return ['plaza', (gx * 7 + gy * 3) % 4];
}
// Turn (quarter turns) that lays each tile model along +X; "1" above adds a quarter.
const TILE_TURN = { road: 0, rail: 0, canal: 0, bridge: 0, junction: 0, plaza: 0 };
const BLOCKED = new Set(); // cells props stand on
const blockAt = (gx, gy) => api.getState()?.blocks.some((b) => b.x === gx && b.y === gy);
function walkable(gx, gy) {
  return gx >= 0 && gx <= 9 && gy >= 0 && gy <= 9 && !(isCanal(gx, gy) && !isBridge(gx, gy)) && !blockAt(gx, gy) && !BLOCKED.has(gx + ',' + gy);
}
function findPath(from, to) {
  const key = (p) => p[0] + ',' + p[1], start = [Math.round(from[0]), Math.round(from[1])];
  if (!walkable(...to)) return null;
  const q = [start], parent = new Map([[key(start), null]]);
  for (let i = 0; i < q.length; i++) {
    const p = q[i];
    if (key(p) === key(to)) { const out = []; let n = p; while (n && key(n) !== key(start)) { out.unshift(n); n = parent.get(key(n)); } return out; }
    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) { const n = [p[0] + dx, p[1] + dy]; if (walkable(...n) && !parent.has(key(n))) { parent.set(key(n), p); q.push(n); } }
  }
  return null;
}

// ------------------------------------------------------------------ Meshy glow
// KULT World's emission for Meshy textures (kult-world models.js neonMask):
// bright saturated texels (the neon) glow; everything else gets a small lift.
function neonMask(map, max = 1024) {
  const img = map.image;
  if (!img?.width) return null;
  const w = Math.min(max, img.width), h = Math.round((img.height / img.width) * w);
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
// Meshy exports full metal; with no environment to reflect it reads dark, so
// treat the texture as painted surface, then light its neon. "lite" (small
// props, the rock) keeps only the colour and a half-size glow mask, which
// saves GPU memory where the extra maps cannot be seen.
function dress(obj, { shadows = true, glow = 1.1, lite = false } = {}) {
  obj.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = shadows; o.receiveShadow = true;
    for (const m of [].concat(o.material)) {
      if (m.isMeshStandardMaterial) { m.metalness = Math.min(m.metalness, 0.12); m.metalnessMap = null; m.roughness = Math.max(m.roughness, 0.6); }
      if (lite) { m.normalMap = null; m.roughnessMap = null; m.aoMap = null; m.roughness = 0.75; }
      if (m.map && !m.emissiveMap && glow) { const mask = neonMask(m.map, lite ? 512 : 1024); if (mask) { m.emissiveMap = mask; m.emissive.set('#ffffff'); m.emissiveIntensity = glow; } }
      m.needsUpdate = true;
    }
  });
  return obj;
}
// meshopt stores positions, normals and UVs quantized (normalized integers,
// dequantized by the node transform). Baking a transform into the geometry
// needs plain floats, or the integer buffer clamps and the mesh crumples.
function floatGeometry(src) {
  const geo = new THREE.BufferGeometry();
  for (const [name, a] of Object.entries(src.attributes)) {
    const n = a.count, s = a.itemSize, arr = new Float32Array(n * s), get = [a.getX, a.getY, a.getZ, a.getW];
    for (let i = 0; i < n; i++) for (let j = 0; j < s; j++) arr[i * s + j] = get[j].call(a, i);
    geo.setAttribute(name, new THREE.BufferAttribute(arr, s));
  }
  if (src.index) geo.setIndex(src.index.clone());
  return geo;
}
// Scale to a footprint and height, feet on y = 0, centred.
function fit(obj, width, height) {
  obj.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(obj), s = b.getSize(new THREE.Vector3());
  obj.scale.multiplyScalar(Math.min(width / Math.max(s.x, 1e-3), width / Math.max(s.z, 1e-3), height / Math.max(s.y, 1e-3)));
  obj.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(obj), c = b2.getCenter(new THREE.Vector3());
  obj.position.sub(new THREE.Vector3(c.x, b2.min.y, c.z));
  const holder = new THREE.Group(); holder.add(obj); return holder;
}

// ------------------------------------------------------------------ sky
function skyTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 1024);
  gr.addColorStop(0, '#08051f'); gr.addColorStop(0.42, '#26105a'); gr.addColorStop(0.72, '#6a2a7a'); gr.addColorStop(0.9, '#c2508c'); gr.addColorStop(1, '#ff9a7a');
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 3; i++) {
    const ag = g.createLinearGradient(0, 120 + i * 70, 0, 260 + i * 70); ag.addColorStop(0, 'rgba(79,216,255,0)'); ag.addColorStop(0.5, i === 1 ? 'rgba(255,106,61,0.16)' : 'rgba(79,216,255,0.13)'); ag.addColorStop(1, 'rgba(79,216,255,0)');
    g.fillStyle = ag; g.beginPath(); g.moveTo(0, 200 + i * 60);
    for (let x = 0; x <= 1024; x += 32) g.lineTo(x, 160 + i * 60 + Math.sin(x / 120 + i * 2) * 40);
    g.lineTo(1024, 320 + i * 60); for (let x = 1024; x >= 0; x -= 32) g.lineTo(x, 260 + i * 60 + Math.sin(x / 140 + i) * 30); g.fill();
  }
  for (let i = 0; i < 320; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.85})`; const s = Math.random() < 0.08 ? 2 : 1; g.fillRect(Math.random() * 1024, Math.random() * 600, s, s); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const img = new Image();
  img.onload = () => {
    const pw = 470, ph = Math.round(pw * img.height / img.width), px = 1024 - pw + 30, py = 70;
    const halo = g.createRadialGradient(px + pw * 0.62, py + ph * 0.5, 40, px + pw * 0.62, py + ph * 0.5, 300); halo.addColorStop(0, 'rgba(255,150,210,0.32)'); halo.addColorStop(1, 'rgba(255,150,210,0)');
    g.fillStyle = halo; g.fillRect(px - 120, py - 160, pw + 240, ph + 320);
    const p = document.createElement('canvas'); p.width = pw; p.height = ph; const q = p.getContext('2d');
    q.drawImage(img, 0, 0, pw, ph); q.globalCompositeOperation = 'destination-in';
    const fx = q.createLinearGradient(0, 0, pw, 0); fx.addColorStop(0, '#000'); fx.addColorStop(0.82, '#000'); fx.addColorStop(1, 'rgba(0,0,0,0)'); q.fillStyle = fx; q.fillRect(0, 0, pw, ph);
    const fy = q.createLinearGradient(0, 0, 0, ph); fy.addColorStop(0, '#000'); fy.addColorStop(0.78, '#000'); fy.addColorStop(1, 'rgba(0,0,0,0)'); q.fillStyle = fy; q.fillRect(0, 0, pw, ph);
    g.globalAlpha = 0.95; g.drawImage(p, px, py); g.globalAlpha = 1; t.needsUpdate = true;
  };
  img.src = here('./art/planet.webp');
  return t;
}
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.5)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}

// ------------------------------------------------------------------ what stands where
// block id -> landmark model and its height in tiles
const LANDMARKS = { home: ['lantern-house', 2.6], canal: ['canal-watch', 3.8], commons: ['union-crossing', 2.3], depot: ['midnight-depot', 2.5], gate: ['signal-gate', 2.3], workshop: ['copper-workshop', 2.5], garden: ['rooftop-garden', 2.7] };
const KIND_COLOR = { home: '#ffb27a', scout: '#4fd8ff', negotiate: '#6ff0a6', heist: '#ff6a3d', defend: '#a98bff', territory: '#ffc94d' };
// [model, gx, gy, turn (rad), width (tiles), height (tiles), blocks the cell?]
const PROPS = [
  ['prop-locomotive', 1.6, 10, 0, 2.1, 1.1], ['prop-gantry', 8, 10, 0, 1.5, 1.4], ['prop-signal', 5.3, 9.62, 0, 0.3, 1.25],
  ['prop-water-tower', -1, 8.2, 0.4, 1.05, 2.3], ['prop-containers', 10, 8.5, Math.PI / 2, 1.1, 1.15], ['prop-containers', 10, 1.4, 0, 1.1, 1.15],
  ['prop-crates', -1, 2.6, 0.6, 0.9, 0.8], ['prop-crates', 9, 9, -0.4, 0.8, 0.7, true], ['prop-crates', 0, 0, 0.3, 0.75, 0.65, true],
  ['prop-barrier', 1.5, -1.3, 0, 1.3, 0.55], ['prop-barrier', 7.5, -1.3, 0, 1.3, 0.55], ['prop-barrier', 10.3, 5, Math.PI / 2, 1.3, 0.55],
  ['kw-crane', -1, 5.4, 0.8, 1.2, 3.2],
];
const TREES = [['kw-tree', -1, -1], ['kw-pine', 0.2, -1.2], ['kw-blossom', 10, -1], ['kw-tree', 10, 10.6], ['kw-pine', -1, 10.6], ['kw-blossom', 9, 0, true], ['kw-tree', 0, 9, true], ['kw-pine', 2.7, -1.2], ['kw-blossom', -1, 0.6], ['kw-tree', 10, 3.2], ['kw-pine', 10, 6.2], ['kw-bush', 2.8, 0, true], ['kw-bush', 8.8, 5.6], ['kw-flowers', 1.2, 4], ['kw-flowers', 7.8, 8.4], ['kw-bush', 5.6, 4.9]];
const LAMPS = [[3, 2.55], [8.6, 2.55], [1.4, 7.45], [7.6, 7.45], [5.45, 1], [5.45, 5.4], [6.55, 8.6], [3.45, 8.8]];
const BENCHES = [[2.4, 6.6, 0], [8.2, 3.4, Math.PI], [5.3, 6.1, Math.PI / 2]];

// ------------------------------------------------------------------ renderer
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
catch { document.body.dataset.renderer = 'canvas'; }
if (renderer) start();

function start() {
  const canvas = renderer.domElement;
  canvas.className = 'world-canvas'; canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', 'The Switchyard, a 3D district. Click the ground or use WASD to walk; click a building to enter it. The Jobs page lists every location.');
  wrap.prepend(canvas);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  scene.background = skyTexture();
  scene.fog = new THREE.Fog('#2b1652', 150, 330);
  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 1, 800);
  scene.add(new THREE.HemisphereLight('#a596ff', '#24143c', 1.15));
  const key = new THREE.DirectionalLight('#ffb184', 2.6);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 10, far: 260 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight('#4fd8ff', 0.9); rim.position.set(80, 45, -70); scene.add(rim);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.4, 0.86);
  composer.addPass(bloom); composer.addPass(new OutputPass());

  const world = new THREE.Group(); scene.add(world);
  const decor = new THREE.Group(); world.add(decor); // hidden on low quality
  const tileMeshes = {}; // type -> InstancedMesh (for ground height)
  const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);

  // ---------------------------------------------------------------- ground
  // One InstancedMesh per tile model, each normalised to a T x T tile whose
  // top sits at y = 0.
  async function buildGround() {
    const types = ['plaza', 'road', 'junction', 'rail', 'canal', 'bridge'];
    const cells = {}; for (const t of types) cells[t] = [];
    for (let gx = MIN; gx <= MAX; gx++) for (let gy = MIN; gy <= MAX; gy++) { const [t, turn] = tileAt(gx, gy); cells[t].push([gx, gy, turn]); }
    const loaded = await Promise.all(types.map((t) => load(`./models/world/tile-${t}.glb`).catch(() => null)));
    const o = new THREE.Object3D();
    loaded.forEach((gltf, i) => {
      const type = types[i]; if (!gltf) return;
      const src = gltf.scene; src.updateMatrixWorld(true);
      let mesh = null; src.traverse((m) => { if (m.isMesh && !mesh) mesh = m; });
      if (!mesh) return;
      dress(mesh);
      const geo = floatGeometry(mesh.geometry).applyMatrix4(mesh.matrixWorld);
      geo.computeBoundingBox();
      const b = geo.boundingBox, s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
      const k = (T / Math.max(s.x, s.z)) * 1.004;
      geo.translate(-c.x, -b.max.y, -c.z).scale(k, k, k).rotateY((TILE_TURN[type] || 0) * Math.PI / 2);
      geo.computeBoundingSphere();
      const im = new THREE.InstancedMesh(geo, mesh.material, cells[type].length);
      cells[type].forEach(([gx, gy, turn], n) => { o.position.copy(toWorld(gx, gy)); o.rotation.set(0, turn * Math.PI / 2, 0); o.updateMatrix(); im.setMatrixAt(n, o.matrix); });
      im.castShadow = type === 'bridge'; im.receiveShadow = true;
      im.userData.ground = true; world.add(im); tileMeshes[type] = im;
    });
    shadowsDirty = true;
  }
  const propCache = new Map();
  function prop(name) { if (!propCache.has(name)) propCache.set(name, load(`./models/world/${name}.glb`)); return propCache.get(name); }
  // The sky-rock under the island, and small islets drifting around it.
  async function buildRock() {
    const g = await load('./models/world/island-rock.glb').catch(() => null); if (!g) return;
    const rock = dress(g.scene, { shadows: false, glow: 1.3, lite: true });
    rock.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(rock), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const span = (MAX - MIN + 1) * T, k = (span * 1.04) / Math.max(s.x, s.z);
    const main = new THREE.Group(); main.add(rock); rock.position.set(-c.x, -b.max.y, -c.z);
    main.scale.set(k, k * 0.75, k); main.position.copy(toWorld(4.5, 4.5, -1.15)); world.add(main);
    const islets = [[-44, -16, -26, 0.22, 'kw-tree'], [52, -24, -6, 0.18, 'kw-pine'], [-18, -30, 58, 0.16, 'kw-blossom'], [40, -10, 52, 0.13, null], [-56, -40, 30, 0.12, null], [16, -36, -60, 0.2, 'kw-pine']];
    for (const [x, y, z, sc, tree] of islets) {
      const isle = main.clone(); isle.scale.set(k * sc, k * sc * 0.8, k * sc); isle.position.set(x, y, z); isle.rotation.y = x * 0.1; decor.add(isle);
      if (tree) prop(tree).then((t) => { const m = fit(dress(t.scene.clone(true), { glow: 0.6, lite: true }), T * 0.8, T * 1.3); m.position.set(x, y - 1.15 * sc + 0.02, z); decor.add(m); }).catch(() => {});
    }
    // The canal spills over the northern edge.
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(T * 0.5, 30), new THREE.MeshBasicMaterial({ map: fallTexture(), transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending, color: '#7fe9ff' }));
    fall.position.copy(toWorld(4, MIN - 0.5, -16)); fall.userData.fall = true; world.add(fall);
    shadowsDirty = true;
  }
  function fallTexture() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(160,240,255,${0.15 + Math.random() * 0.4})`; g.fillRect(Math.random() * 64, Math.random() * 256, 2 + Math.random() * 4, 20 + Math.random() * 60); }
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.15, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalCompositeOperation = 'destination-in'; g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
    const t = new THREE.CanvasTexture(c); t.wrapT = THREE.RepeatWrapping; return t;
  }
  // Rail-yard props, trees, lamps, benches.
  async function buildProps() {
    const place = async (name, gx, gy, turn, w, h, parent = decor, glow = 1.1) => {
      try { const g = await prop(name); const m = fit(dress(g.scene.clone(true), { glow, lite: true }), w * T, h * T); m.position.copy(toWorld(gx, gy)); m.rotation.y = turn; parent.add(m); return m; } catch { return null; }
    };
    for (const [name, gx, gy, turn, w, h, blocks] of PROPS) { if (blocks) BLOCKED.add(Math.round(gx) + ',' + Math.round(gy)); place(name, gx, gy, turn, w, h, name.startsWith('prop-loco') || name.startsWith('prop-gantry') ? world : decor); }
    for (const [name, gx, gy, blocks] of TREES) { if (blocks) BLOCKED.add(gx + ',' + gy); place(name, gx, gy, gx * 1.7, name === 'kw-bush' || name === 'kw-flowers' ? 0.7 : 0.95, name === 'kw-bush' || name === 'kw-flowers' ? 0.45 : 1.45, decor, 0.6); }
    const pool = new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffb37a', transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending });
    for (const [gx, gy] of LAMPS) { place('kw-lamp', gx, gy, 0, 0.3, 1.05, world, 1.4); const s = new THREE.Sprite(pool); s.position.copy(toWorld(gx, gy, 3.6)); s.scale.setScalar(3); world.add(s); }
    for (const [gx, gy, turn] of BENCHES) place('kw-bench', gx, gy, turn, 0.55, 0.3, decor, 0.6);
    shadowsDirty = true;
  }

  // ---------------------------------------------------------------- landmarks
  const buildings = [], blockGroups = new Map(), pins = [];
  function placeholder(b) { // until (or unless) the model loads
    const m = new THREE.Mesh(new THREE.BoxGeometry(T * 0.9, T * 1.2, T * 0.9), new THREE.MeshStandardMaterial({ color: '#3a2a64', emissive: KIND_COLOR[b.kind], emissiveIntensity: 0.12, roughness: 0.8 }));
    m.position.y = T * 0.6; m.castShadow = true; return m;
  }
  function build(b) {
    const g = new THREE.Group(); g.position.copy(toWorld(b.x, b.y)); world.add(g); blockGroups.set(b.id, g);
    const stand = placeholder(b); g.add(stand);
    // A hitbox over the whole lot, so the building is easy to click.
    const hit = new THREE.Mesh(new THREE.BoxGeometry(T * 1.2, T * 3, T * 1.2), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = T * 1.5; hit.userData.block = b; g.add(hit); buildings.push(hit);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(T * 0.78, 0.07, 8, 64), new THREE.MeshBasicMaterial({ color: KIND_COLOR[b.kind], transparent: true, opacity: 0.85 }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = 0.12; halo.visible = false; g.add(halo);
    const spec = LANDMARKS[b.id];
    if (spec) load(`./models/${spec[0]}.glb`).then((gltf) => {
      const m = fit(dress(gltf.scene), T * 1.5, (spec[1] / 1.4) * T * 1.22); g.remove(stand); g.add(m); shadowsDirty = true;
    }).catch((e) => console.warn('[switchyard] landmark', spec[0], e?.message || e));
    const height = ((spec?.[1] || 2.5) / 1.4) * T * 1.22 + 0.8;
    // Its name tag, KULT World style.
    const el = document.createElement('button'); el.type = 'button'; el.className = 'place-pin'; el.dataset.location = b.id; el.style.setProperty('--pin-color', KIND_COLOR[b.kind]);
    el.innerHTML = '<span class="pin-glyph" aria-hidden="true"></span><span class="pin-copy"><b></b><small></small></span>';
    el.querySelector('b').textContent = b.name; el.onclick = () => choose(b); labels.append(el);
    pins.push({ b, el, halo, pos: toWorld(b.x, b.y, height) });
  }

  // ---------------------------------------------------------------- the player
  const player = { x: 3, y: 7, yaw: Math.PI, path: [], speed: 0, walking: false, onArrive: null, group: new THREE.Group(), mixer: null, actions: {}, current: null, gy: 0 };
  world.add(player.group);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.06, 8, 48), new THREE.MeshBasicMaterial({ color: '#ff6a3d', transparent: true }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; player.group.add(ring);
  const fallbackBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.1, 4, 10), new THREE.MeshStandardMaterial({ color: '#2a1e46', emissive: '#ff6a3d', emissiveIntensity: 0.25, roughness: 0.5 }));
  fallbackBody.position.y = 1; fallbackBody.castShadow = true; player.group.add(fallbackBody);
  const tag = document.createElement('div'); tag.className = 'agent-tag'; labels.append(tag);
  function setTag() {
    const st = api.getState(), a = matchingAgent();
    tag.innerHTML = ''; const b = document.createElement('b'); b.textContent = a?.name || st?.agent?.name || 'Your Agent'; tag.append(b);
    if (a?.rank) { const s = document.createElement('span'); s.textContent = a.rank.name; tag.append(s); }
  }
  let dressedFor = null;
  async function dressPlayer() {
    // The player's own KULT World Agent when KULT World opened the district; else the district's default.
    const a = matchingAgent(), want = a?.model || 'default';
    if (dressedFor === want) return; dressedFor = want;
    let url = here('./models/world/kw-agent-tactician.glb');
    if (a?.model) { try { const u = new URL(a.model, location.href); if (u.origin === location.origin) url = u.href; } catch { /* keep default */ } }
    try {
      const gltf = await loader.loadAsync(url);
      if (dressedFor !== want) return;
      const body = fit(dress(gltf.scene, { glow: 1.1 }), T * 0.42, T * 0.55);
      body.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
      player.group.children.filter((c) => c !== ring).forEach((c) => player.group.remove(c));
      player.group.add(body);
      player.mixer = new THREE.AnimationMixer(body.children[0]); player.actions = {}; player.current = null;
      for (const clip of gltf.animations) player.actions[clip.name] = player.mixer.clipAction(clip);
      shadowsDirty = true;
    } catch (e) { console.warn('[switchyard] agent model', e?.message || e); }
  }
  const clip = (word) => { const n = Object.keys(player.actions).find((k) => k.toLowerCase().includes(word)); return n ? player.actions[n] : null; };
  function play(word) {
    const a = word === 'walk' ? clip('run') || clip('walk') : clip('idle');
    if (!a || a === player.current) return;
    a.reset().fadeIn(0.2).play(); player.current?.fadeOut(0.2); player.current = a;
  }

  // ---------------------------------------------------------------- markers
  const beamMat = new THREE.MeshBasicMaterial({ color: '#ff6a3d', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(T * 0.55, T * 0.75, 70, 32, 1, true), beamMat); beam.visible = false; world.add(beam);
  const clickRing = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.95, 40), new THREE.MeshBasicMaterial({ color: '#ffd2a8', transparent: true, opacity: 0, depthWrite: false }));
  clickRing.rotation.x = -Math.PI / 2; world.add(clickRing); let markAt = -9;
  const signalMat = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9 });
  const scoutSignal = new THREE.Mesh(new THREE.TorusGeometry(T * 0.95, 0.08, 8, 64), signalMat('#4fd8ff')), depotSignal = new THREE.Mesh(new THREE.TorusGeometry(T * 0.95, 0.08, 8, 64), signalMat('#ff6a3d'));
  for (const [m, gx, gy] of [[scoutSignal, 2, 2], [depotSignal, 7, 6]]) { m.rotation.x = -Math.PI / 2; m.position.copy(toWorld(gx, gy, 0.2)); m.visible = false; world.add(m); }
  const patrol = new THREE.Group(); world.add(patrol); patrol.visible = false;
  { const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 0.9), new THREE.MeshStandardMaterial({ color: '#2a2050', emissive: '#4fd8ff', emissiveIntensity: 0.8 })); patrol.add(body);
    for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 6, 24), signalMat('#ffc94d')); r.rotation.x = -Math.PI / 2; r.position.set(s * 0.95, 0.15, 0); patrol.add(r); }
    const eye = new THREE.PointLight('#4fd8ff', 30, 14, 1.6); eye.position.y = -0.6; patrol.add(eye); }

  // ---------------------------------------------------------------- moving
  function walk(to, done) {
    const path = findPath([player.x, player.y], to);
    if (!path) return false;
    player.path = path.map(([x, y]) => [x, y]); player.onArrive = done || null;
    if (!path.length) { player.onArrive = null; done?.(); }
    return true;
  }
  const door = (b) => { for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) if (walkable(b.x + dx, b.y + dy)) return [b.x + dx, b.y + dy]; return null; };
  function walkToBlock(b, done) {
    const d = door(b); if (!d) { done?.(); return; }
    if (Math.hypot(player.x - d[0], player.y - d[1]) < 0.6) { player.yaw = Math.atan2(b.x - d[0], b.y - d[1]); done?.(); return; }
    if (walk(d, () => { player.yaw = Math.atan2(b.x - d[0], b.y - d[1]); $('#map-arrival').textContent = 'AT ' + b.name.toUpperCase() + ' · PRESS E'; done?.(); })) mark(d[0], d[1]); else done?.();
    $('#map-arrival').textContent = 'EN ROUTE · ' + b.name.toUpperCase();
  }
  function walkToCell(gx, gy) {
    gx = Math.round(gx); gy = Math.round(gy);
    if (!walkable(gx, gy)) {
      let best = null;
      for (let r = 1; r <= 3 && !best; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) if (walkable(gx + dx, gy + dy) && (!best || Math.hypot(dx, dy) < best.d)) best = { x: gx + dx, y: gy + dy, d: Math.hypot(dx, dy) };
      if (!best) return; gx = best.x; gy = best.y;
    }
    if (walk([gx, gy])) mark(gx, gy);
  }
  function mark(gx, gy) { clickRing.position.copy(toWorld(gx, gy, 0.1)); markAt = elapsed; }
  // A building: walk to its door, then open it (app.js decides what that means).
  function choose(b) { walkToBlock(b, () => api.select(b)); }

  let keyMove = null; const keys = new Set();
  function keyStep(dt) {
    player.path = []; player.onArrive = null;
    camera.updateMatrixWorld();
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0); right.y = 0; right.normalize();
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1); up.y = 0; up.normalize();
    const d = right.multiplyScalar(keyMove.x).addScaledVector(up, keyMove.y); if (d.lengthSq() < 1e-4) return;
    d.normalize(); player.speed = Math.min(1.1, player.speed + dt * 6);
    const s = player.speed * dt * 2.4, nx = player.x + d.x * s, ny = player.y + d.z * s, ok = (x, y) => walkable(Math.round(x), Math.round(y));
    if (ok(nx, ny)) { player.x = nx; player.y = ny; } else if (ok(nx, player.y)) player.x = nx; else if (ok(player.x, ny)) player.y = ny;
    player.walking = true; player.yaw = Math.atan2(d.x, d.z);
  }
  function stepPlayer(dt) {
    if (keyMove) keyStep(dt);
    else if (player.path.length) {
      player.walking = true;
      const end = player.path[player.path.length - 1], left = Math.hypot(end[0] - player.x, end[1] - player.y);
      player.speed = Math.min(1.1, player.speed + dt * 5);
      const step = Math.min(player.speed, Math.max(0.45, left * 2.5)) * dt * 2.4;
      const [tx, ty] = player.path[0], dx = tx - player.x, dy = ty - player.y, d = Math.hypot(dx, dy);
      if (d > 0.001) player.yaw = Math.atan2(dx, dy);
      if (d <= step) { player.x = tx; player.y = ty; player.path.shift(); if (!player.path.length) { player.walking = false; player.speed = 0; const f = player.onArrive; player.onArrive = null; f?.(); if (!f) $('#map-arrival').textContent = 'YOUR AGENT IS IN THE DISTRICT'; } }
      else { player.x += (dx / d) * step; player.y += (dy / d) * step; }
    } else { player.walking = false; player.speed = 0; }
    play(player.walking ? 'walk' : 'idle'); player.mixer?.update(dt);
    // Stand on whatever tile is underfoot (bridges arch).
    const p = toWorld(player.x, player.y);
    let gy = 0; const [type] = tileAt(Math.round(player.x), Math.round(player.y)), im = tileMeshes[type];
    if (im && (type === 'bridge' || frame % 3 === 0)) { ray.set(p.clone().setY(12), down); ray.far = 24; const h = ray.intersectObject(im, false)[0]; gy = h ? Math.min(3, h.point.y) : 0; player.lastGy = gy; } else gy = player.lastGy ?? 0;
    player.gy += (gy - player.gy) * Math.min(1, dt * 12);
    player.group.position.copy(p).setY(player.gy);
    const cur = player.group.rotation.y; let diff = player.yaw - cur; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    player.group.rotation.y = cur + diff * Math.min(1, dt * 10);
    ring.material.opacity = 0.55 + Math.sin(elapsed * 4) * 0.35; ring.rotation.z = elapsed;
  }
  // The building whose door the player stands at.
  function nearDoor() {
    const st = api.getState(); if (!st || player.walking) return null;
    return st.blocks.find((b) => { const d = door(b); return d && Math.hypot(player.x - d[0], player.y - d[1]) < 0.7; }) || null;
  }

  // ---------------------------------------------------------------- camera
  let az = ISO_AZ, azTarget = ISO_AZ, zoom = 1, zoomTo = 1, viewH = 30, size = { w: 1, h: 1 }, quality = matchMedia('(max-width: 700px)').matches ? 'low' : 'high';
  const target = toWorld(4.5, 4.5);
  let cinematic = true, topDown = false;
  if (new URLSearchParams(location.search).has('debug')) window.switchyardDebug = { top(on = true) { topDown = on; }, zoom(z) { zoomTo = z; } };
  function resize() {
    const w = innerWidth, h = innerHeight; size = { w, h };
    const dpr = quality === 'low' ? Math.min(devicePixelRatio, 1) : Math.min(devicePixelRatio, 1.5);
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); composer.setPixelRatio(dpr); composer.setSize(w, h);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; labelsDirty = true;
  }
  function applyQuality() {
    bloom.enabled = quality !== 'low'; key.castShadow = quality !== 'low'; decor.visible = quality !== 'low' || !matchMedia('(max-width: 700px)').matches;
    $('#map-quality')?.setAttribute('aria-label', 'Visual quality ' + quality + '. Activate to change.');
    const q = $('#map-quality'); if (q) q.dataset.quality = quality;
    resize(); shadowsDirty = true;
  }
  function updateCamera(dt) {
    zoom += (zoomTo - zoom) * Math.min(1, dt * 9);
    if (cinematic) { azTarget = ISO_AZ + Math.sin(elapsed * 0.06) * 0.55; target.lerp(toWorld(4.5 + Math.sin(elapsed * 0.05) * 2, 4.5 + Math.cos(elapsed * 0.04) * 2), 0.02); }
    else target.lerp(player.group.position, Math.min(1, dt * 3.2));
    az += (azTarget - az) * Math.min(1, dt * 1.6);
    const vh = (viewH * (size.w < 700 ? 1.3 : 1) * (cinematic ? 1.6 : 1)) / zoom, aspect = size.w / size.h;
    Object.assign(camera, { left: (-vh * aspect) / 2, right: (vh * aspect) / 2, top: vh / 2, bottom: -vh / 2 }); camera.updateProjectionMatrix();
    const dir = topDown ? new THREE.Vector3(0.001, 1, 0.02).normalize() : new THREE.Vector3(Math.cos(az) * Math.SQRT2, 1.1, Math.sin(az) * Math.SQRT2).normalize();
    camera.position.copy(target).addScaledVector(dir, 240); camera.lookAt(target);
    key.position.copy(target).add(new THREE.Vector3(-70, 90, 40)); key.target.position.copy(target);
    labelsDirty = true;
  }
  const zoomBy = (f) => { zoomTo = Math.min(1.8, Math.max(0.5, zoomTo * f)); };
  const recenter = () => { zoomTo = 1; azTarget = ISO_AZ; };

  // ---------------------------------------------------------------- input
  const ndc = (e) => { const r = canvas.getBoundingClientRect(); return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
  const blockAtScreen = (e) => { ray.setFromCamera(ndc(e), camera); ray.far = Infinity; return ray.intersectObjects(buildings, false)[0]?.object.userData.block || null; };
  function groundAtScreen(e) {
    ray.setFromCamera(ndc(e), camera); ray.far = Infinity; const p = new THREE.Vector3();
    if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p)) return null;
    return [p.x / T + 4.5, p.z / T + 4.5];
  }
  const pointers = new Map(); let drag = null, pinch = null;
  canvas.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: zoomTo }; drag = null; return; }
    drag = { x: e.clientX, y: e.clientY, az: azTarget, moved: false }; canvas.setPointerCapture(e.pointerId); canvas.focus({ preventScroll: true });
  });
  canvas.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) { const [a, b] = [...pointers.values()]; zoomTo = Math.min(1.8, Math.max(0.5, pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinch.d))); return; }
    if (drag) { const dx = e.clientX - drag.x; if (Math.abs(dx) + Math.abs(e.clientY - drag.y) > 6) drag.moved = true; if (drag.moved) { azTarget = drag.az - dx * 0.006; az = azTarget; } return; }
    const b = blockAtScreen(e); canvas.style.cursor = b ? 'pointer' : 'default'; hoverId = b?.id || null;
  });
  canvas.addEventListener('pointerup', (e) => {
    pointers.delete(e.pointerId);
    if (pinch) { if (pointers.size < 2) pinch = null; drag = null; return; }
    if (drag && !drag.moved && api.getState()) {
      cinematic = false;
      const b = blockAtScreen(e); if (b) choose(b); else { const g = groundAtScreen(e); if (g) walkToCell(...g); }
    }
    drag = null;
  });
  canvas.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); pinch = null; drag = null; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1); }, { passive: false });
  const typing = () => /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName) || document.querySelector('dialog[open]') || !document.body.classList.contains('world-view');
  const MOVE = { w: [0, 1], arrowup: [0, 1], s: [0, -1], arrowdown: [0, -1], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0] };
  function updateKeys() { let x = 0, y = 0; for (const k of keys) { x += MOVE[k][0]; y += MOVE[k][1]; } keyMove = x || y ? { x, y } : null; if (keyMove) cinematic = false; }
  addEventListener('keydown', (e) => {
    if (typing() || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (MOVE[k]) { e.preventDefault(); keys.add(k); updateKeys(); }
    else if (k === 'e' || (k === 'enter' && document.activeElement === canvas)) { const b = nearDoor(); if (b) { e.preventDefault(); api.select(b); } }
    else if (k === '+' || k === '=') zoomBy(1.15); else if (k === '-') zoomBy(1 / 1.15); else if (k === '0') recenter();
  });
  addEventListener('keyup', (e) => { const k = e.key.toLowerCase(); if (keys.delete(k)) updateKeys(); });
  addEventListener('blur', () => { keys.clear(); keyMove = null; });
  addEventListener('resize', resize);

  // ---------------------------------------------------------------- state
  let built = false, nextId = 'canal', hoverId = null, labelsDirty = true, shadowsDirty = true;
  function sync() {
    const st = api.getState(); if (!st) return;
    if (!built) { built = true; st.blocks.forEach(build); cinematic = false; const h = st.blocks.find((b) => b.kind === 'home'), d = h && door(h); if (d) { player.x = d[0]; player.y = d[1]; } }
    if (bridgedAgent()) dressPlayer(); setTag();
    const op = st.operation || {}, lead = op.lead, territory = st.territory || [];
    const done = !!lead && !!op.completedReceipt && st.receipts.some((r) => r.id === op.completedReceipt && r.context?.scoutReceipt === lead.receiptId), workshop = !!op.workshop;
    nextId = st.mission ? st.blocks.find((b) => b.kind === st.mission.kind)?.id || 'canal' : !lead ? 'canal' : !done ? 'depot' : !workshop ? 'workshop' : 'depot';
    const next = st.blocks.find((b) => b.id === nextId);
    $('#map-objective').textContent = st.mission ? 'MISSION IN PROGRESS' : done && workshop ? 'WORKSHOP HELD' : next?.name?.toUpperCase() || 'CANAL WATCH';
    const alert = st.agent.alert || 0; document.body.dataset.alert = String(alert);
    rim.color.set(alert >= 2 ? '#ff765e' : '#4fd8ff'); rim.intensity = alert >= 2 ? 2.2 : 0.9;
    $('#map-story').textContent = alert >= 2 ? `Watch active · alert ${alert}/4 · defend to lower pressure` : st.mission ? 'Follow through on the current decision.' : !lead ? 'Scout → Heist → Crew' : !done ? 'Verified intel. The depot is ready.' : !workshop ? 'Manifest secured. Build your crew.' : 'Your decisions changed this district.';
    if (next) { beam.position.copy(toWorld(next.x, next.y, 35)); beam.visible = !st.mission || st.mission.kind === next.kind; }
    for (const p of pins) {
      const active = st.mission?.kind === p.b.kind || api.getSelected() === p.b.kind;
      p.el.classList.toggle('active', active); p.el.classList.toggle('priority', p.b.id === nextId);
      p.el.classList.toggle('held', p.b.kind === 'territory' && territory.some((t) => t.block === p.b.id));
      p.el.setAttribute('aria-pressed', String(active)); p.el.setAttribute('aria-label', p.b.name + (p.b.id === nextId ? ', next stop' : ''));
      p.halo.visible = active || p.b.id === nextId;
      const job = st.missions.find((m) => m.kind === p.b.kind), sub = p.el.querySelector('small');
      if (job) sub.textContent = p.b.kind === 'scout' && lead ? 'REPORT VERIFIED' : p.b.kind === 'heist' && lead ? `DEPOT READY · ${job.cost} SUPPL${job.cost === 1 ? 'Y' : 'IES'}` : `${job.domain.toUpperCase()} · ${job.cost} SUPPL${job.cost === 1 ? 'Y' : 'IES'}`;
      else if (p.b.kind === 'territory') { const held = territory.find((t) => t.block === p.b.id); sub.textContent = held ? held.crew === st.crew?.id ? 'YOUR CREW HOLDS' : 'RIVAL CREW HOLDS' : 'OPEN TERRITORY'; }
      else sub.textContent = 'SAFEHOUSE';
    }
    patrol.visible = !!lead; scoutSignal.visible = !!lead; depotSignal.visible = !!op.completedReceipt;
    if (lead) patrol.position.copy(toWorld(lead.patrol === 'canal' ? 2 : 5, lead.patrol === 'canal' ? 2 : 8, 7));
    labelsDirty = true;
  }
  addEventListener('kult:state', sync);

  // ---------------------------------------------------------------- controls (HUD)
  window.kultDistrict = {
    visit(kind) { const b = api.getState()?.blocks.find((x) => x.kind === kind); if (b) { cinematic = false; walkToBlock(b); } },
    focusNext() { const b = api.getState()?.blocks.find((x) => x.id === nextId); if (b) { cinematic = false; walkToBlock(b); } },
    walkTo(gx, gy) { cinematic = false; walkToCell(gx, gy); },
    zoomBy, recenter,
    get player() { return { x: player.x, y: player.y, yaw: player.group.rotation.y }; },
    get nextId() { return nextId; }, tileAt, walkable,
  };
  $('#zoom-in')?.addEventListener('click', () => zoomBy(1.2));
  $('#zoom-out')?.addEventListener('click', () => zoomBy(1 / 1.2));
  $('#camera-reset')?.addEventListener('click', recenter);
  $('#focus-next')?.addEventListener('click', () => window.kultDistrict.focusNext());
  $('#map-quality')?.addEventListener('click', () => { quality = quality === 'low' ? 'high' : 'low'; applyQuality(); });
  $('#map-labels')?.addEventListener('click', () => { const on = document.body.classList.toggle('labels-compact'); $('#map-labels').setAttribute('aria-pressed', String(!on)); });

  // A lost context (GPU pressure, a driver reset) shows the 2D map until the
  // browser restores it; three re-uploads everything on restore.
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); window.kult3dActive = false; document.body.classList.remove('three-ready'); canvas.style.display = 'none'; labels.style.display = 'none'; document.body.dataset.renderer = 'canvas'; });
  canvas.addEventListener('webglcontextrestored', () => { window.kult3dActive = true; document.body.classList.add('three-ready'); canvas.style.display = ''; labels.style.display = ''; document.body.dataset.renderer = 'three'; shadowsDirty = true; resize(); });
  window.kult3dActive = true; document.body.classList.add('three-ready'); document.body.dataset.renderer = 'three';

  // ---------------------------------------------------------------- frame
  const tip = $('#world-tip'), proj = new THREE.Vector3();
  let prev = 0, elapsed = 0, frame = 0, lastDoor = null;
  function placeLabels() {
    for (const p of pins) {
      proj.copy(p.pos).project(camera);
      const vis = Math.abs(proj.x) < 1.1 && Math.abs(proj.y) < 1.1;
      p.el.style.visibility = vis ? 'visible' : 'hidden'; if (!vis) continue;
      p.el.style.transform = `translate(${((proj.x + 1) / 2) * size.w}px, ${((1 - proj.y) / 2) * size.h}px) translate(-50%, -100%)`;
      p.el.style.zIndex = String(1000 - Math.round(proj.z * 500));
    }
    proj.copy(player.group.position).setY(player.gy + T * 0.62).project(camera);
    tag.style.transform = `translate(${((proj.x + 1) / 2) * size.w}px, ${((1 - proj.y) / 2) * size.h}px) translate(-50%, -100%)`;
    const d = nearDoor();
    if (d !== lastDoor) { lastDoor = d; if (tip) { tip.hidden = !d; if (d) { tip.style.setProperty('--c', KIND_COLOR[d.kind]); tip.innerHTML = ''; const k = document.createElement('kbd'); k.textContent = 'E'; const b = document.createElement('b'); b.textContent = d.name; const s = document.createElement('small'); s.textContent = d.kind === 'home' ? 'Your safehouse' : d.kind === 'territory' ? 'Crew territory' : 'Open the job'; tip.append(k, b, s); } } }
    tag.style.visibility = d ? 'hidden' : 'visible';
    if (d && tip) { proj.copy(player.group.position).setY(player.gy + T * 0.66).project(camera); tip.style.left = Math.min(size.w - 90, Math.max(90, ((proj.x + 1) / 2) * size.w)) + 'px'; tip.style.top = Math.max(150, ((1 - proj.y) / 2) * size.h) + 'px'; }
  }
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min((now - prev) / 1000, 0.05); prev = now;
    if (document.hidden || !window.kult3dActive) return;
    elapsed += dt; frame++;
    if (api.getState()) stepPlayer(dt);
    updateCamera(dt);
    if (!reduced) {
      for (const p of pins) if (p.halo.visible) { p.halo.scale.setScalar(1 + Math.sin(elapsed * 2.4) * 0.06); p.halo.material.opacity = 0.55 + Math.sin(elapsed * 2.4) * 0.3; }
      beamMat.opacity = 0.16 + Math.sin(elapsed * 2) * 0.06;
      if (patrol.visible) { patrol.position.y = 7 + Math.sin(elapsed * 2) * 0.4; patrol.rotation.y = elapsed * 0.8; }
      world.children.forEach((c) => { if (c.userData.fall) c.material.map.offset.y = (elapsed * 0.6) % 1; });
    }
    const k = (elapsed - markAt) / 0.9; clickRing.material.opacity = k < 1 ? 1 - k : 0; clickRing.scale.setScalar(1 + Math.max(0, k) * 1.2);
    if (key.castShadow && (shadowsDirty || frame % 3 === 0)) { renderer.shadowMap.needsUpdate = true; shadowsDirty = false; }
    composer.render();
    placeLabels();
    window.dispatchEvent(new CustomEvent('kult:frame', { detail: frame }));
  }
  applyQuality();
  // Opened from KULT World: wait for the session, then wear the player's own Agent.
  buildGround(); buildRock(); buildProps(); if (!bridgedAgent()) dressPlayer(); setTag();
  sync();
  requestAnimationFrame(loop);
}
