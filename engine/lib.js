// Shared drawing helpers. Everything is deterministic in t (seconds).
const W = 1920, H = 1080;
const C = {
  bg: '#04050c', bg2: '#0a0f24',
  text: '#eef2ff', dim: '#8a93b8', faint: '#3a4266',
  light: '#5ce1ff',   // light / causality / "ok"
  ftl: '#ffb547',     // faster than light
  bad: '#ff4f8b',     // paradox
  good: '#7dffb2',
};
const FONT = 'Poppins', MONO = 'DejaVuMono';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, u) => a + (b - a) * u;
const ease = u => { u = clamp(u); return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const easeOut = u => 1 - Math.pow(1 - clamp(u), 3);
const easeIn = u => Math.pow(clamp(u), 3);
const back = u => { u = clamp(u); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
// progress of t through [a, a+d]
const P = (t, a, d = 0.6) => clamp((t - a) / d);
// in-then-out envelope: fades in at a, out at b
const env = (t, a, b, fi = 0.5, fo = 0.5) => Math.min(P(t, a, fi), 1 - P(t, b - fo, fo));

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let x = s; x = Math.imul(x ^ x >>> 15, x | 1); x ^= x + Math.imul(x ^ x >>> 7, x | 61); return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }

// ---------- background ----------
const STARS = (() => { const r = rng(7), a = []; for (let i = 0; i < 700; i++) a.push({ x: r() * W, y: r() * H, z: 0.2 + r() * 0.8, p: r() * 6.28, c: r() }); return a; })();

function background(ctx, t, opt = {}) {
  const g = ctx.createRadialGradient(W * .5, H * .45, 50, W * .5, H * .5, W * .75);
  g.addColorStop(0, opt.center || '#0c1330'); g.addColorStop(1, C.bg);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const drift = opt.drift ?? 6, streak = opt.streak || 0;
  for (const s of STARS) {
    let x = (s.x - t * drift * s.z) % W; if (x < 0) x += W;
    const tw = 0.55 + 0.45 * Math.sin(t * (0.8 + s.z) + s.p);
    const a = (0.25 + 0.75 * s.z) * tw * (opt.starAlpha ?? 1);
    ctx.fillStyle = s.c > .92 ? `rgba(255,210,170,${a})` : s.c > .8 ? `rgba(170,210,255,${a})` : `rgba(235,240,255,${a})`;
    if (streak > 0) {
      // hyperspace: streak radially from centre
      const dx = x - W / 2, dy = s.y - H / 2, L = streak * s.z * 0.9;
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1 + s.z * 1.5;
      ctx.beginPath(); ctx.moveTo(W / 2 + dx, H / 2 + dy); ctx.lineTo(W / 2 + dx * (1 + L), H / 2 + dy * (1 + L)); ctx.stroke();
    } else {
      const r = 0.5 + s.z * 1.4;
      ctx.fillRect(x - r / 2, s.y - r / 2, r, r);
    }
  }
}

function vignette(ctx) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, W * .72);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ---------- text ----------
function text(ctx, s, x, y, o = {}) {
  const size = o.size || 48, weight = o.weight || 600, a = o.alpha ?? 1;
  if (a <= 0.001) return 0;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.font = `${weight} ${size}px ${o.font || FONT}`;
  ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle';
  if (o.ls) ctx.letterSpacing = o.ls + 'px';
  if (o.glow) { ctx.shadowColor = o.glowColor || o.color || C.text; ctx.shadowBlur = o.glow; }
  ctx.fillStyle = o.color || C.text;
  let dy = 0;
  if (o.rise) dy = (1 - a) * o.rise;
  ctx.fillText(s, x, y + dy);
  const w = ctx.measureText(s).width;
  if (window.BOXES && ctx.globalAlpha > 0.35) {
    const al = ctx.textAlign, x0 = al === 'center' ? x - w / 2 : al === 'right' ? x - w : x;
    const m = ctx.getTransform(), p0 = m.transformPoint(new DOMPoint(x0, y + dy - size * 0.36)), p1 = m.transformPoint(new DOMPoint(x0 + w, y + dy + size * 0.36));
    window.BOXES.push({ s, a: ctx.globalAlpha, x0: Math.min(p0.x, p1.x), y0: Math.min(p0.y, p1.y), x1: Math.max(p0.x, p1.x), y1: Math.max(p0.y, p1.y) });
  }
  ctx.restore();
  return w;
}
function measure(ctx, s, size, weight = 600, font = FONT) { ctx.save(); ctx.font = `${weight} ${size}px ${font}`; const w = ctx.measureText(s).width; ctx.restore(); return w; }

// word-wrap into lines of max width
function wrap(ctx, s, maxW, size, weight = 600) {
  const words = s.split(' '), out = []; let cur = '';
  for (const w of words) { const test = cur ? cur + ' ' + w : w; if (measure(ctx, test, size, weight) > maxW && cur) { out.push(cur); cur = w; } else cur = test; }
  if (cur) out.push(cur); return out;
}

// Big caption: words pop in one by one starting at t0
function caption(ctx, t, s, x, y, t0, o = {}) {
  const size = o.size || 84, weight = o.weight || 700, per = o.per ?? 0.09;
  const lines = wrap(ctx, s, o.maxW || 1500, size, weight);
  const lh = size * 1.18; let i = 0;
  const fade = o.out != null ? 1 - P(t, o.out, 0.5) : 1;
  lines.forEach((ln, li) => {
    const words = ln.split(' '); const total = measure(ctx, ln, size, weight);
    let cx = x - (o.align === 'left' ? 0 : total / 2);
    words.forEach(w => {
      const u = P(t, t0 + i * per, 0.35); i++;
      const ww = measure(ctx, w + ' ', size, weight);
      const col = (o.hl && o.hl[w.replace(/[^\w'’-]/g, '')]) || o.color || C.text;
      text(ctx, w, cx, y + (li - (lines.length - 1) / 2) * lh + (1 - easeOut(u)) * 24, { size, weight, color: col, align: 'left', alpha: u * fade, glow: o.glow });
      cx += ww;
    });
  });
}

// Pill / chip
function chip(ctx, s, x, y, o = {}) {
  const size = o.size || 34, a = o.alpha ?? 1; if (a <= 0) return;
  const w = measure(ctx, s, size, 600) + size * 1.3, h = size * 1.7, sc = o.scale ?? 1;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(sc, sc);
  rrect(ctx, -w / 2, -h / 2, w, h, h / 2);
  ctx.fillStyle = o.fill || 'rgba(20,28,60,0.85)'; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = o.color || C.light; ctx.stroke();
  text(ctx, s, 0, 2, { size, color: o.textColor || o.color || C.light, weight: 600 });
  ctx.restore();
}
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

function card(ctx, x, y, w, h, o = {}) {
  const a = o.alpha ?? 1; if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  if (o.glow) { ctx.shadowColor = o.color || C.light; ctx.shadowBlur = o.glow; }
  rrect(ctx, x, y, w, h, o.r || 24); ctx.fillStyle = o.fill || 'rgba(14,20,46,0.88)'; ctx.fill();
  ctx.shadowBlur = 0; ctx.lineWidth = o.lw || 2; ctx.strokeStyle = o.color || 'rgba(140,160,230,0.35)'; ctx.stroke();
  ctx.restore();
}

// ---------- shapes ----------
function arrow(ctx, x1, y1, x2, y2, o = {}) {
  const u = o.u ?? 1; if (u <= 0) return;
  const ex = lerp(x1, x2, u), ey = lerp(y1, y2, u);
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  ctx.strokeStyle = ctx.fillStyle = o.color || C.light; ctx.lineWidth = o.lw || 5; ctx.lineCap = 'round';
  if (o.glow) { ctx.shadowColor = o.color || C.light; ctx.shadowBlur = o.glow; }
  if (o.dash) ctx.setLineDash(o.dash);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
  if (o.head !== false) {
    const ang = Math.atan2(y2 - y1, x2 - x1), hs = o.hs || 22;
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - hs * Math.cos(ang - .45), ey - hs * Math.sin(ang - .45));
    ctx.lineTo(ex - hs * Math.cos(ang + .45), ey - hs * Math.sin(ang + .45)); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function dot(ctx, x, y, r, color, o = {}) {
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  if (o.glow) { ctx.shadowColor = color; ctx.shadowBlur = o.glow; }
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill(); ctx.restore();
}
function ring(ctx, x, y, r, color, o = {}) {
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.strokeStyle = color; ctx.lineWidth = o.lw || 3;
  if (o.glow) { ctx.shadowColor = color; ctx.shadowBlur = o.glow; }
  ctx.beginPath(); ctx.ellipse(x, y, r, r * (o.sy ?? 1), 0, 0, 6.2832); ctx.stroke(); ctx.restore();
}
function line(ctx, x1, y1, x2, y2, color, lw = 2, o = {}) {
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
  if (o.dash) ctx.setLineDash(o.dash); if (o.glow) { ctx.shadowColor = color; ctx.shadowBlur = o.glow; }
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}

// Procedural spiral galaxy
function galaxy(ctx, cx, cy, R, t, o = {}) {
  const key = o.seed || 3;
  if (!galaxy.cache) galaxy.cache = {};
  if (!galaxy.cache[key]) {
    const r = rng(key), pts = [];
    for (let i = 0; i < (o.n || 5000); i++) {
      const arm = i % 2, d = 0.12 + 0.88 * Math.pow(r(), 0.8), g = (r() + r() + r() - 1.5) / 1.5, spread = g * 0.45;
      const ang = arm * Math.PI + d * 6.0 + spread;
      pts.push({ d: d * (1 + g * 0.06), ang, s: r(), c: r() });
    }
    for (let i = 0; i < 700; i++) { const d = Math.pow(r(), 2.2) * 0.35; pts.push({ d, ang: r() * 6.283, s: r(), c: 2 }); }
    galaxy.cache[key] = pts;
  }
  const rot = (o.rot || 0) + t * (o.spin ?? 0.03), tilt = o.tilt ?? 0.45, a = o.alpha ?? 1;
  ctx.save(); ctx.globalAlpha *= a; ctx.globalCompositeOperation = 'lighter';
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.3);
  core.addColorStop(0, o.core || 'rgba(255,230,200,0.9)'); core.addColorStop(1, 'rgba(255,200,150,0)');
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(o.angle || 0); ctx.scale(1, tilt); ctx.translate(-cx, -cy);
  ctx.fillStyle = core; ctx.beginPath(); ctx.arc(cx, cy, R * .3, 0, 6.283); ctx.fill();
  for (const p of galaxy.cache[key]) {
    const ang = p.ang + rot, rr = p.d * R;
    const x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
    const sz = 0.8 + p.s * 2.2;
    ctx.fillStyle = p.c === 2 ? 'rgba(255,225,190,0.55)' : p.c > .7 ? `rgba(150,190,255,${0.35 + p.s * .4})` : `rgba(${o.armR || 200},${o.armG || 170},255,${0.35 + p.s * .45})`;
    ctx.fillRect(x, y, sz, sz);
  }
  ctx.restore(); ctx.restore();
}

// Stick figure. o.walk (0..1) blends in a walk cycle driven by o.phase; dir = +1 faces right.
// o.point: hold one arm straight forward (e.g. holding a torch).
function person(ctx, x, y, s, o = {}) {
  const col = o.color || C.text, ph = o.phase || 0, dir = o.dir || 1, sit = o.sit, wk = o.walk ?? 0;
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.translate(x, y); ctx.scale(s * dir, s);
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const seg = (x0, y0, a, L) => [x0 + Math.sin(a) * L, y0 + Math.cos(a) * L];
  if (sit) {
    ctx.strokeStyle = C.faint; ctx.beginPath(); ctx.moveTo(-28, -50); ctx.lineTo(-28, 0); ctx.moveTo(-28, -50); ctx.lineTo(20, -50); ctx.moveTo(20, -50); ctx.lineTo(20, 0); ctx.moveTo(-28, -50); ctx.lineTo(-28, -110); ctx.stroke();
    ctx.strokeStyle = col;
    ctx.beginPath(); ctx.arc(-10, -150, 16, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-10, -132); ctx.lineTo(-14, -58); ctx.lineTo(24, -56); ctx.lineTo(26, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-12, -115); ctx.lineTo(10, -80); ctx.stroke();
    ctx.restore(); return;
  }
  const bob = -4 * wk * Math.abs(Math.cos(ph));
  const hip = [0, -80 + bob], sh = [4 * wk, -135 + bob];
  // legs: thigh swings, knee bends during the swing forward
  for (const p of [ph, ph + Math.PI]) {
    const th = wk * 0.42 * Math.sin(p) + (1 - wk) * (p === ph ? 0.16 : -0.16);
    const knee = wk * 0.85 * Math.max(0, Math.cos(p)) ** 1.5;
    const k = seg(hip[0], hip[1], th, 42), f = seg(k[0], k[1], th - knee, 42);
    ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(k[0], k[1]); ctx.lineTo(f[0], f[1]); ctx.lineTo(f[0] + 10, f[1]); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(sh[0], sh[1]); ctx.stroke();
  ctx.beginPath(); ctx.arc(sh[0] + 2, sh[1] - 30, 16, 0, 6.283); ctx.fill();
  // arms swing opposite to legs
  const arms = o.point ? [null, ph] : [ph + Math.PI, ph];
  arms.forEach((p, i) => {
    if (p === null) { ctx.beginPath(); ctx.moveTo(sh[0], sh[1] + 6); ctx.lineTo(sh[0] + 52, sh[1] + 2); ctx.stroke(); return; }
    const up = wk * 0.45 * Math.sin(p) + (1 - wk) * (i ? 0.12 : -0.12);
    const e = seg(sh[0], sh[1] + 4, up, 30), h = seg(e[0], e[1], up + 0.35 * wk + 0.1, 28);
    ctx.beginPath(); ctx.moveTo(sh[0], sh[1] + 4); ctx.lineTo(e[0], e[1]); ctx.lineTo(h[0], h[1]); ctx.stroke();
  });
  ctx.restore();
}
// hand position of a pointing person (for props held forward)
const handPos = (x, y, s, dir = 1) => [x + dir * 56 * s, y - 131 * s];

// Digital clock / date panel
function clockPanel(ctx, x, y, label, value, o = {}) {
  const a = o.alpha ?? 1; if (a <= 0) return;
  const w = o.w || 300, h = o.h || 150, col = o.color || C.light;
  card(ctx, x - w / 2, y - h / 2, w, h, { alpha: a, color: col, lw: 3, glow: o.glow || 0, fill: 'rgba(8,12,30,0.92)' });
  text(ctx, label, x, y - h / 2 + 30, { size: 24, color: C.dim, weight: 500, alpha: a });
  text(ctx, value, x, y + 18, { size: o.vsize || 60, color: col, font: MONO, weight: 700, alpha: a, glow: 12 });
}

// Starship (own design): slim arrowhead with engine glow. Points right.
function ship(ctx, x, y, s, o = {}) {
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(s, s);
  const eg = ctx.createRadialGradient(-62, 0, 0, -62, 0, 40);
  eg.addColorStop(0, 'rgba(120,230,255,0.95)'); eg.addColorStop(1, 'rgba(120,230,255,0)');
  ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(-62, 0, 40, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#d9e2ff'; ctx.beginPath();
  ctx.moveTo(70, 0); ctx.lineTo(-40, -22); ctx.lineTo(-58, -40); ctx.lineTo(-52, -10); ctx.lineTo(-62, 0);
  ctx.lineTo(-52, 10); ctx.lineTo(-58, 40); ctx.lineTo(-40, 22); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6f7bb0'; ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(-30, -8); ctx.lineTo(-30, 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.light; ctx.beginPath(); ctx.ellipse(22, 0, 12, 5, 0, 0, 6.283); ctx.fill();
  ctx.restore();
}

// Glitch jitter offset for text
function glitch(t, amt) { const r = Math.sin(t * 91.7) * Math.sin(t * 37.3); return Math.abs(r) > .6 ? r * amt : 0; }

// Subtitle bar (review / burned-in mode)
function subtitle(ctx, s, a) {
  if (!s || a <= 0) return;
  const size = 38, lines = wrap(ctx, s, 1500, size, 500), lh = 50;
  const h = lines.length * lh + 26, y0 = H - 40 - h;
  let w = 0; lines.forEach(l => w = Math.max(w, measure(ctx, l, size, 500)));
  ctx.save(); ctx.globalAlpha = a;
  if (window.BOXES) window.BOXES.push({ s: '[subtitle]', sub: true, a, x0: W / 2 - w / 2 - 28, y0, x1: W / 2 + w / 2 + 28, y1: y0 + h });
  const keep = window.BOXES; window.BOXES = null;
  rrect(ctx, W / 2 - w / 2 - 28, y0, w + 56, h, 14); ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.fill();
  lines.forEach((l, i) => text(ctx, l, W / 2, y0 + 13 + lh / 2 + i * lh, { size, weight: 500, color: '#fff' }));
  window.BOXES = keep;
  ctx.restore();
}

// =====================================================================
// Scene engine: scenes.js calls scene(); K(n, f) is the time at fraction f
// through script line n, so every animation follows the voice.
// =====================================================================
let TL = null, LINES = {};
const K = (n, f = 0) => { const L = LINES[n]; return L.start + f * (L.end - L.start); };
const E = n => LINES[n].end;
const SCENES = [];
const scene = (id, from, to, draw, cues) => SCENES.push({ id, from, to, draw, cues: cues || (() => []) });
const dimAll = (ctx, a) => { if (a > 0) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H); ctx.restore(); } };
const quiet = fn => { const k = window.BOXES; window.BOXES = null; fn(); window.BOXES = k; };  // decorative text: skip overlap check

let OPTS = { subs: true };
const XF = 0.7; // crossfade seconds
function setup(tl, opts) {
  TL = tl; LINES = {}; tl.lines.forEach(l => LINES[l.n] = l); Object.assign(OPTS, opts || {});
  SCENES.forEach((s, i) => { s.t0 = i === 0 ? 0 : K(s.from) - 0.55; });
  SCENES.forEach((s, i) => { s.t1 = i === SCENES.length - 1 ? tl.total : SCENES[i + 1].t0 + XF; });
}
let off = null;
function renderFrame(t) {
  const cv = document.getElementById('c'), ctx = cv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H);
  const act = SCENES.filter(s => t >= s.t0 && t < s.t1);
  if (!act.length) return;
  act[0].draw(ctx, t);
  if (act.length > 1) {
    if (!off) { off = document.createElement('canvas'); off.width = W; off.height = H; }
    const o = off.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.globalAlpha = 1; o.clearRect(0, 0, W, H);
    act[1].draw(o, t);
    ctx.globalAlpha = ease((t - act[1].t0) / XF); ctx.drawImage(off, 0, 0); ctx.globalAlpha = 1;
  }
  if (OPTS.subs) {
    const L = TL.lines.find(l => t >= l.start - 0.1 && t < l.end + 0.35);
    if (L) subtitle(ctx, L.text, clamp((t - L.start + 0.1) / 0.15) * (1 - clamp((t - L.end - 0.2) / 0.15)));
  }
}
function getCues() { const out = []; SCENES.forEach(s => s.cues().forEach(c => out.push({ ...c, scene: s.id }))); return out.sort((a, b) => a.t - b.t); }
function getScenes() { return SCENES.map(s => ({ id: s.id, from: s.from, to: s.to, t0: s.t0, t1: s.t1 })); }
