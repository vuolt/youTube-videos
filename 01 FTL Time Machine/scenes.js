// Scenes for "Every Sci-Fi Shortcut Is Secretly a Time Machine" (script v3).
// Each scene covers a range of script lines. K(n, f) = time at fraction f
// through line n, so everything re-times automatically to the recordings.
let TL = null, LINES = {};
const K = (n, f = 0) => { const L = LINES[n]; return L.start + f * (L.end - L.start); };
const E = n => LINES[n].end;

const SCENES = [];
const scene = (id, from, to, draw, cues) => SCENES.push({ id, from, to, draw, cues: cues || (() => []) });
const dimAll = (ctx, a) => { if (a > 0) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H); ctx.restore(); } };
const quiet = fn => { const k = window.BOXES; window.BOXES = null; fn(); window.BOXES = k; };  // decorative text: skip overlap check

// =====================================================================
// Shared visuals
// =====================================================================
function phone(ctx, x, y, sc, a, drawScreen) {
  if (a <= 0) return;
  const w = 440, h = 900;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(sc, sc);
  ctx.shadowColor = 'rgba(92,225,255,0.25)'; ctx.shadowBlur = 60;
  rrect(ctx, -w / 2, -h / 2, w, h, 64); ctx.fillStyle = '#12162a'; ctx.fill(); ctx.shadowBlur = 0;
  ctx.lineWidth = 4; ctx.strokeStyle = '#2c3560'; ctx.stroke();
  rrect(ctx, -w / 2 + 16, -h / 2 + 16, w - 32, h - 32, 50);
  const sg = ctx.createLinearGradient(0, -h / 2, 0, h / 2); sg.addColorStop(0, '#1b2250'); sg.addColorStop(1, '#070a18');
  ctx.fillStyle = sg; ctx.fill();
  ctx.save(); ctx.clip();                       // everything on the screen stays inside it
  text(ctx, '09:41', 0, -250, { size: 110, weight: 300, color: '#e8ecff' });
  text(ctx, 'Friday', 0, -175, { size: 30, weight: 500, color: C.dim });
  drawScreen(ctx);
  ctx.restore();
  rrect(ctx, -60, -h / 2 + 30, 120, 30, 15); ctx.fillStyle = '#000'; ctx.fill();
  ctx.restore();
}
function notification(ctx, t, t0, body, a = 1) {
  const nu = easeOut(P(t, t0, 0.45)); if (nu <= 0) return;
  ctx.save(); ctx.globalAlpha *= nu * a; ctx.translate(0, lerp(-160, -40, nu));
  rrect(ctx, -185, -85, 370, 190, 28); ctx.fillStyle = 'rgba(40,48,90,0.95)'; ctx.fill();
  text(ctx, 'MESSAGES', -150, -52, { size: 20, weight: 600, color: C.dim, align: 'left' });
  text(ctx, 'now', 150, -52, { size: 20, weight: 500, color: C.dim, align: 'right' });
  text(ctx, 'Me', -150, -12, { size: 30, weight: 700, align: 'left' });
  body.forEach((s, i) => text(ctx, s[0], -150, 28 + i * 34, { size: 27, weight: 500, align: 'left', alpha: s[1] }));
  ctx.restore();
}

function ruleCard(ctx, t, cx, cy, a, reveal, r2 = 1) {
  if (a <= 0) return;
  card(ctx, cx - 560, cy - 130, 1120, 260, { alpha: a, color: 'rgba(140,160,230,0.5)', glow: 10 });
  text(ctx, 'RULE 1', cx - 510, cy - 55, { size: 30, weight: 700, color: C.dim, align: 'left', alpha: a });
  text(ctx, 'Nothing beats light', cx - 350, cy - 55, { size: 44, weight: 700, color: C.light, align: 'left', alpha: a });
  text(ctx, '✓ obeyed', cx + 520, cy - 55, { size: 34, weight: 700, color: C.good, align: 'right', alpha: a });
  text(ctx, 'RULE 2', cx - 510, cy + 55, { size: 30, weight: 700, color: C.dim, align: 'left', alpha: a * r2 });
  const pulse = 0.65 + 0.35 * Math.sin(t * 5);
  text(ctx, '? ? ?', cx - 350, cy + 55, { size: 44, weight: 700, color: C.ftl, align: 'left', alpha: a * r2 * (1 - reveal) * pulse });
  text(ctx, 'Causes come before effects', cx - 350, cy + 55, { size: 42, weight: 700, color: C.text, align: 'left', alpha: a * reveal });
  text(ctx, '✗ broken', cx + 520, cy + 55, { size: 34, weight: 700, color: C.bad, align: 'right', alpha: a * reveal, glow: 14 * reveal });
}

function warpGrid(ctx, t, cx, cy, o) {
  const a = o.alpha ?? 1; if (a <= 0) return;
  const w = o.w || 240, A = o.A ?? 0.0055, flow = o.flow ?? 0, hh = o.hh || 260;
  const disp = u => { const z = u - cx; return u + 0.5 * A * w * w * Math.exp(-(z / w) * (z / w)); };
  const step = 46;
  ctx.save(); ctx.globalAlpha *= a;
  const off = (flow * t) % step;
  for (let u = -200 - off; u < W + 200; u += step) {
    const x = disp(u), z = (u - cx) / w;
    const dens = 1 - A * w * z * Math.exp(-z * z);
    const col = dens < 0.97 ? `rgba(255,181,71,${0.35 + (1 - dens) * 1.2})` : dens > 1.03 ? `rgba(92,225,255,${0.25 + (dens - 1) * 0.9})` : 'rgba(110,125,190,0.28)';
    line(ctx, x, cy - hh, x, cy + hh, col, 2);
  }
  for (let y = cy - hh; y <= cy + hh; y += step) line(ctx, 0, y, W, y, 'rgba(110,125,190,0.18)', 2);
  ctx.restore();
}

function proj(x, y, z) {
  const a = 0.52, cy = 420, D = 1700, F = 1500;
  const y2 = y * Math.cos(a) + z * Math.sin(a), z2 = -y * Math.sin(a) + z * Math.cos(a);
  const zc = z2 + D; return [W / 2 + x * F / zc, cy - y2 * F / zc, zc];
}
// Wormhole: a sheet of space with two funnels joined by a tunnel underneath.
function wormhole(ctx, t, o) {
  const a = o.alpha ?? 1, mA = [-480, 0], mB = o.mB || [480, 0], depth = 300, rw = 150;
  const g = (x, z, m) => Math.exp(-((x - m[0]) ** 2 + (z - m[1]) ** 2) / (rw * rw));
  const hgt = (x, z) => -depth * (g(x, z, mA) + g(x, z, mB));
  ctx.save(); ctx.globalAlpha *= a * 0.85; ctx.lineWidth = 1.6;
  for (let z = -480; z <= 480; z += 48) {
    ctx.strokeStyle = 'rgba(120,140,230,0.35)'; ctx.beginPath();
    for (let x = -1100; x <= 1100; x += 20) { const [sx, sy] = proj(x, hgt(x, z), z); x === -1100 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy); }
    ctx.stroke();
  }
  for (let x = -1100; x <= 1100; x += 48) {
    ctx.strokeStyle = 'rgba(120,140,230,0.25)'; ctx.beginPath();
    for (let z = -480; z <= 480; z += 20) { const [sx, sy] = proj(x, hgt(x, z), z); z === -480 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy); }
    ctx.stroke();
  }
  ctx.restore();
  const [ax, ay] = proj(mA[0], -depth, mA[1]), [bx, by] = proj(mB[0], -depth, mB[1]);
  const midY = Math.max(ay, by) + 120;
  const tun = a * (o.tunnel ?? 1);
  ctx.save(); ctx.globalAlpha *= tun; ctx.lineCap = 'round';
  ctx.lineWidth = 46; ctx.strokeStyle = 'rgba(160,110,255,0.25)';
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.bezierCurveTo(ax + 60, midY, bx - 60, midY, bx, by); ctx.stroke();
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(200,170,255,0.9)'; ctx.shadowColor = '#b48cff'; ctx.shadowBlur = 18; ctx.stroke();
  ctx.restore();
  const rings = [[mA, C.light], [mB, C.ftl]].map(([m, col]) => { const [rx, ry, zc] = proj(m[0], -depth * 0.37, m[1]); ring(ctx, rx, ry, 120 * 1780 / zc, col, { sy: 0.34, lw: 4, glow: 20, alpha: a }); return [rx, ry]; });
  const bez = u => { const p = [[ax, ay], [ax + 60, midY], [bx - 60, midY], [bx, by]], m = 1 - u; return [0, 1].map(k => m * m * m * p[0][k] + 3 * m * m * u * p[1][k] + 3 * m * u * u * p[2][k] + u * u * u * p[3][k]); };
  return { bez, midY, ringA: rings[0], ringB: rings[1], mA, mB };
}

// Time strips: each place gets a vertical tape of moments ticking upward.
function strip(ctx, t, x, y0, y1, o = {}) {
  const a = o.alpha ?? 1; if (a <= 0) return;
  const w = o.w || 56, col = o.color || 'rgba(140,160,230,0.55)', step = o.step || 60;
  ctx.save(); ctx.globalAlpha *= a;
  rrect(ctx, x - w / 2, y0, w, y1 - y0, 10); ctx.fillStyle = 'rgba(16,22,52,0.85)'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
  ctx.beginPath(); ctx.rect(x - w / 2, y0, w, y1 - y0); ctx.clip();
  const off = ((o.scroll ?? t * 12) % step + step) % step;
  for (let y = y1 + off; y > y0 - step; y -= step) line(ctx, x - w / 2 + 8, y, x + w / 2 - 8, y, col, 2);
  ctx.restore();
}
// A "now" ruler through (px, py) with a slope (screen dy per dx), drawn from x0 to x1.
function ruler(ctx, px, py, slope, x0, x1, col, a, o = {}) {
  if (a <= 0) return;
  line(ctx, x0, py + slope * (x0 - px), x1, py + slope * (x1 - px), col, o.lw || 6, { alpha: a, glow: o.glow ?? 14, dash: o.dash });
}
function raceLanes(ctx, t, t0, dur, r, lanes) {
  const x0 = 300, x1 = 1640, u = clamp((t - t0) / dur);
  lanes.forEach(([y, lab, col]) => {
    line(ctx, x0, y, x1, y, C.faint, 3, { alpha: r });
    text(ctx, lab, x0, y - 48, { size: 32, color: col, weight: 700, align: 'left', alpha: r });
    line(ctx, x1, y - 25, x1, y + 25, C.text, 3, { alpha: r });
  });
  text(ctx, 'DISTANT STAR', x1, lanes[0][0] - 48, { size: 24, color: C.dim, alpha: r, align: 'right' });
  const lx = lerp(x0, x1, u), ly = lanes[0][0];
  line(ctx, Math.max(x0, lx - 160), ly, lx, ly, C.light, 7, { glow: 18, alpha: r }); dot(ctx, lx, ly, 9, '#fff', { alpha: r, glow: 20 });
  return { u, x0, x1 };
}

// =====================================================================
// A. Cold open (1–10)
// =====================================================================
scene('open', 1, 15, (ctx, t) => {
  background(ctx, t, { drift: 4 });
  const move = ease(P(t, K(4), 1.0));
  const phoneA = 1 - P(t, K(7), 0.6);
  phone(ctx, lerp(W / 2, 400, move), H / 2 - 20, lerp(0.9, 0.72, move), phoneA, c => {
    const b = P(t, K(2, 0.3), 0.4);
    notification(c, t, K(1, 0.35), [['Don’t send this', b], ['message tomorrow.', b]]);
    const ts = P(t, K(3, 0.3), 0.4);
    if (ts > 0) {
      const pulse = 0.6 + 0.4 * Math.sin(t * 6);
      rrect(c, -170, 90, 340, 70, 20); c.fillStyle = `rgba(255,181,71,${0.12 * ts})`; c.fill();
      c.save(); c.globalAlpha *= ts; c.lineWidth = 3; c.strokeStyle = C.ftl; c.stroke(); c.restore();
      text(c, 'Sent: TOMORROW, 09:41', 0, 126, { size: 27, weight: 700, color: C.ftl, alpha: ts, glow: 16 * pulse });
    }
  });
  // 4: tomorrow comes, you don't send it
  const tl = P(t, K(4, 0.2), 0.6) * (1 - P(t, K(6), 0.5));
  if (tl > 0) {
    const x0 = 820, x1 = 1680, y = 330;
    line(ctx, x0, y, x1, y, C.dim, 4, { alpha: tl });
    dot(ctx, x0, y, 12, C.light, { alpha: tl, glow: 14 }); text(ctx, 'TODAY', x0, y + 45, { size: 28, weight: 700, color: C.light, alpha: tl });
    const tm = P(t, K(4, 0.45), 0.5) * tl;
    dot(ctx, x1, y, 12, C.ftl, { alpha: tm, glow: 14 }); text(ctx, 'TOMORROW', x1, y + 45, { size: 28, weight: 700, color: C.ftl, alpha: tm });
    text(ctx, 'message arrives', x0, y - 45, { size: 26, color: C.dim, alpha: tl });
    const ns = P(t, K(4, 0.7), 0.4) * tl;
    chip(ctx, 'SEND', x1, y - 70, { alpha: ns, size: 28, color: C.dim });
    line(ctx, x1 - 70, y - 100, x1 + 70, y - 40, C.bad, 6, { alpha: ns, glow: 10 });
    text(ctx, 'you don’t send it', x1, y + 90, { size: 26, color: C.dim, alpha: ns });
    // 5: then who sent it?
    const q = P(t, K(5, 0.1), 0.5) * tl;
    text(ctx, 'So who sent it?', (x0 + x1) / 2, 560, { size: 72, weight: 700, color: C.ftl, alpha: q, glow: 14 });
  }
  // 6: the loop
  const lu = P(t, K(6), 0.5) * (1 - P(t, K(7), 0.5));
  if (lu > 0) {
    const cx = 1250, cy = 470, rx = 330, ry = 230;
    ctx.save(); ctx.globalAlpha = lu * 0.8; ctx.strokeStyle = C.bad; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 6.283); ctx.stroke(); ctx.restore();
    const nodes = ['It arrived', 'So you don’t send it', 'So it was never sent', 'So it can’t arrive'];
    const hi = Math.floor(((t - K(6)) * 1.4) % 4);
    nodes.forEach((s, i) => {
      const a = -Math.PI / 2 + i * Math.PI / 2;
      chip(ctx, s, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, { alpha: lu * P(t, K(6) + i * 0.3, 0.3), size: 30, color: i === hi ? C.bad : C.dim, fill: i === hi ? 'rgba(80,20,50,0.95)' : 'rgba(14,20,46,0.95)' });
    });
    text(ctx, 'PARADOX', cx, cy, { size: 54, weight: 700, color: C.bad, alpha: P(t, K(6, 0.6), 0.5) * lu, glow: 16 });
  }
  caption(ctx, t, 'Faster than light → paradoxes become real', W / 2, H / 2 - 40, K(7, 0.1), { size: 66, maxW: 1800, out: K(8), hl: { 'Faster': C.ftl, 'than': C.ftl, 'light': C.ftl, 'real': C.bad } });
  // 8: rule 1
  const r8 = P(t, K(8, 0.2), 0.5) * (1 - P(t, K(9), 0.4));
  text(ctx, 'RULE 1', W / 2, H / 2 - 110, { size: 34, weight: 700, color: C.dim, ls: 4, alpha: r8 });
  text(ctx, 'Nothing beats light', W / 2, H / 2 - 20, { size: 96, weight: 700, color: C.light, alpha: r8, glow: 20 });
  // 9–13: what everyone believes
  const bel = P(t, K(9), 0.5) * (1 - P(t, K(14), 0.5));
  if (bel > 0) {
    caption(ctx, t, 'Sci-fi writers know the rule too.', W / 2, 130, K(9, 0.02), { size: 58, out: K(9, 0.5) });
    caption(ctx, t, 'So their shortcuts never really go faster than light.', W / 2, 130, K(9, 0.5), { size: 52, out: K(10) });
    const cards = [
      ['STAR TREK', 'warp drive', 'bends space around the ship', 10, C.light],
      ['STAR WARS  ·  HALO', 'hyperspace · slipspace', 'another dimension, a shorter trip', 11, C.ftl],
      ['STARGATE  ·  INTERSTELLAR', 'wormholes', 'tunnels through space', 12, '#c8aaff'],
    ];
    cards.forEach(([h, a, b, n, col], i) => {
      const x = 360 + i * 600, y = 470, al = bel * back(P(t, K(n, 0.02), 0.5));
      if (al <= 0) return;
      ctx.save(); ctx.globalAlpha *= clamp(al);
      card(ctx, x - 280, y - 175, 560, 350, { color: col, glow: 12 });
      text(ctx, h, x, y - 128, { size: 26, weight: 700, color: C.dim, ls: 3 });
      if (i === 0) { ring(ctx, x, y - 30, 62, col, { sy: 0.55, glow: 14 }); ship(ctx, x, y - 30, 0.4); }
      if (i === 1) { for (let k = 0; k < 3; k++) ring(ctx, x, y - 30, 16 + k * 16, col, { sy: 1, glow: 10, alpha: 1 - k * 0.3 }); }
      if (i === 2) {
        const top = y - 70, bot = y + 10;
        ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.shadowColor = col; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.moveTo(x + 90, top); ctx.lineTo(x - 50, top); ctx.arc(x - 50, (top + bot) / 2, (bot - top) / 2, -Math.PI / 2, Math.PI / 2, true); ctx.lineTo(x + 90, bot); ctx.stroke();
        ctx.restore();
        ring(ctx, x + 30, top, 22, col, { sy: 0.35, glow: 10 }); ring(ctx, x + 30, bot, 22, col, { sy: 0.35, glow: 10 });
        line(ctx, x + 8, top, x + 8, bot, col, 2, { alpha: 0.8 }); line(ctx, x + 52, top, x + 52, bot, col, 2, { alpha: 0.8 });
      }
      text(ctx, a, x, y + 65, { size: 34, weight: 700, color: col });
      text(ctx, b, x, y + 120, { size: 26, color: C.dim });
      ctx.restore();
    });
    const v = P(t, K(13, 0.1), 0.4);
    chip(ctx, 'Verdict: clever, but it doesn’t break physics', W / 2, 800, { alpha: bel * v, size: 38, color: C.good, scale: 0.9 + 0.1 * back(v) });
  }
  // 14: rule 1 obeyed. 15: rule 2 broken.
  const rc = P(t, K(14), 0.5) * (1 - P(t, K(15, 0.62), 0.4));
  ruleCard(ctx, t, W / 2, H / 2 - 30, rc, ease(P(t, K(15, 0.1), 0.6)), P(t, K(15), 0.3));
  const titleU = P(t, K(15, 0.65), 0.8);
  if (titleU > 0) {
    const g = glitch(t, 14) * (1 - P(t, K(15, 0.65) + 0.5, 1));
    text(ctx, 'EVERY SCI-FI SHORTCUT IS SECRETLY A', W / 2, 400, { size: 54, weight: 600, ls: 6, alpha: titleU, color: C.dim });
    quiet(() => { ctx.save(); ctx.globalAlpha = titleU * 0.6; text(ctx, 'TIME MACHINE', W / 2 + g + 5, 530, { size: 170, weight: 700, color: C.bad }); ctx.restore(); });
    text(ctx, 'TIME MACHINE', W / 2 - g, 530, { size: 170, weight: 700, color: C.ftl, alpha: titleU, glow: 30 });
    line(ctx, W / 2 - 480 * easeOut(titleU), 640, W / 2 + 480 * easeOut(titleU), 640, C.ftl, 3, { alpha: titleU * 0.7 });
  }
  vignette(ctx);
}, () => [
  { t: K(1, 0.35), s: 'buzz' }, { t: K(2, 0.3), s: 'ding' }, { t: K(3, 0.3), s: 'tick' }, { t: K(3, 0.3) + 0.25, s: 'tick' },
  { t: K(4), s: 'whoosh' }, { t: K(4, 0.7), s: 'pop' }, { t: K(5, 0.1), s: 'glitch' }, { t: K(6), s: 'riser' }, { t: K(7, 0.1), s: 'boom' },
  { t: K(8, 0.2), s: 'tick' }, { t: K(10), s: 'pop' }, { t: K(11), s: 'pop' }, { t: K(12), s: 'pop' }, { t: K(13, 0.1), s: 'chime' }, { t: K(14), s: 'tick' }, { t: K(15, 0.1), s: 'glitch' }, { t: K(15, 0.65), s: 'boom' },
]);

// =====================================================================
// B. The speed limit (11–13)
// =====================================================================
scene('limit', 16, 17, (ctx, t) => {
  background(ctx, t, { drift: 3 });
  const gx = W / 2, gy = H / 2 - 30, R = 620, gA = P(t, K(16) - 0.3, 1.0);
  galaxy(ctx, gx, gy, R, t, { tilt: 0.42, alpha: gA * (1 - 0.5 * P(t, K(18), 0.6)), spin: 0.02, angle: -0.08 });
  const sb = P(t, K(16, 0.4), 0.9) * (1 - P(t, K(18), 0.5));
  const w = R * 1.9 * ease(sb) / 2;
  line(ctx, gx - w, gy + 280, gx + w, gy + 280, C.text, 3, { alpha: sb });
  line(ctx, gx - w, gy + 265, gx - w, gy + 295, C.text, 3, { alpha: sb }); line(ctx, gx + w, gy + 265, gx + w, gy + 295, C.text, 3, { alpha: sb });
  text(ctx, '≈ 100,000 light-years', gx, gy + 325, { size: 36, weight: 600, alpha: sb });
  caption(ctx, t, 'The problem: space is enormous.', W / 2, 100, K(16, 0.3), { size: 54, out: K(17) });
  const sx = gx + 300, sy = gy + 70, m = P(t, K(17), 0.5) * (1 - P(t, K(18), 0.5));
  dot(ctx, sx, sy, 7, '#ffe9a8', { glow: 20, alpha: m });
  text(ctx, 'us', sx + 30, sy + 2, { size: 28, color: '#ffe9a8', align: 'left', alpha: m });
  chip(ctx, 'Nearest star: 4+ years at light speed', W / 2, 100, { alpha: m * P(t, K(17, 0.05), 0.4), size: 34 });
  chip(ctx, 'Across the galaxy: 100,000 years', W / 2, 190, { alpha: m * P(t, K(17, 0.55), 0.4), size: 34, color: C.ftl });
  vignette(ctx);
}, () => [{ t: K(16), s: 'swell' }, { t: K(17, 0.05), s: 'ping' }, { t: K(17, 0.55), s: 'ping' }, { t: K(18, 0.2), s: 'whoosh' }]);

// =====================================================================
// C. The clever solutions (14–25)
// =====================================================================
scene('clever', 18, 26, (ctx, t) => {
  background(ctx, t, { drift: 3 });
  caption(ctx, t, 'All these shortcuts come down to two tricks.', W / 2, H / 2 - 30, K(18, 0.05), { size: 64, maxW: 1500, out: K(19), hl: { 'two': C.ftl, 'tricks.': C.ftl } });
  // 15–18 warp drive
  const wA = P(t, K(19), 0.7) * (1 - P(t, K(22), 0.6));
  if (wA > 0) {
    const cx = W / 2, cy = 470, squeeze = ease(P(t, K(19, 0.2), 1.5));
    warpGrid(ctx, t, cx, cy, { alpha: wA, A: 0.0062 * squeeze, w: 260, flow: 70 * P(t, K(20), 1) });
    ring(ctx, cx, cy, 150, C.light, { alpha: wA * (0.3 + 0.5 * P(t, K(20), 0.8)), lw: 3, glow: 20, sy: 0.75 });
    ship(ctx, cx, cy, 0.9, { alpha: wA });
    chip(ctx, 'TRICK 1  ·  move space, not the ship', W / 2, 90, { alpha: wA * (1 - P(t, K(19, 0.45), 0.4)), size: 38 });
    const l1 = P(t, K(19, 0.55), 0.5) * wA, l2 = P(t, K(19, 0.75), 0.5) * wA;
    arrow(ctx, cx + 330, 125, cx + 250, 190, { color: C.ftl, lw: 3, alpha: l1, hs: 14 });
    text(ctx, 'space squeezed', cx + 340, 110, { size: 34, weight: 700, color: C.ftl, align: 'left', alpha: l1 });
    arrow(ctx, cx - 330, 125, cx - 250, 190, { color: C.light, lw: 3, alpha: l2, hs: 14 });
    text(ctx, 'space stretched', cx - 340, 110, { size: 34, weight: 700, color: C.light, align: 'right', alpha: l2 });
    caption(ctx, t, 'The ship sits still. Space carries it.', W / 2, 820, K(20, 0.05), { size: 50, out: K(21) });
    chip(ctx, 'Miguel Alcubierre, 1994: works on paper', W / 2, 820, { alpha: P(t, K(21, 0.2), 0.4) * wA, size: 36 });
  }
  // 19–20 wormhole
  const hA = P(t, K(22), 0.7) * (1 - P(t, K(23), 0.6));
  if (hA > 0) {
    const wh = wormhole(ctx, t, { alpha: hA, tunnel: P(t, K(22, 0.1), 0.8) });
    chip(ctx, 'TRICK 2  ·  take a shorter road', W / 2, 90, { alpha: hA * (1 - P(t, K(22, 0.38), 0.3)), size: 32 });
    const lw = P(t, K(22, 0.1), 0.6) * hA;
    ctx.save(); ctx.globalAlpha = lw; ctx.strokeStyle = C.dim; ctx.lineWidth = 3; ctx.setLineDash([10, 10]);
    ctx.beginPath(); for (let x = -480; x <= 480; x += 20) { const [sx, sy] = proj(x, 0, 360); x === -480 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy); } ctx.stroke(); ctx.restore();
    const [lx, ly] = proj(0, 0, 360);
    text(ctx, 'the long way', lx, ly - 32, { size: 30, color: C.dim, alpha: lw });
    text(ctx, 'the shortcut', W / 2, wh.midY + 48, { size: 32, color: '#c8aaff', weight: 700, alpha: lw * P(t, K(22, 0.3), 0.5) });
    const tv = P(t, K(22, 0.4), 0.3);
    if (tv > 0) { const u = clamp((t - K(22, 0.4)) / Math.max(1.5, E(22) - K(22, 0.4))); const [qx, qy] = wh.bez(u); dot(ctx, qx, qy, 10, '#fff', { glow: 20, alpha: tv * hA }); }
    caption(ctx, t, 'Not faster. Just a shorter road.', W / 2, 90, K(22, 0.5), { size: 54 });
  }
  // 21 negative energy
  const ne = P(t, K(23), 0.6) * (1 - P(t, K(24), 0.5));
  if (ne > 0) {
    ring(ctx, W / 2 - 330, 400, 110, C.light, { alpha: ne, glow: 16, sy: 0.75 }); ship(ctx, W / 2 - 330, 400, 0.55, { alpha: ne });
    ring(ctx, W / 2 + 330, 400, 110, C.ftl, { alpha: ne, glow: 16, sy: 0.34 }); ring(ctx, W / 2 + 330, 400, 70, '#b48cff', { alpha: ne, glow: 16, sy: 0.34 });
    chip(ctx, 'both need “negative energy”', W / 2, 620, { alpha: ne, size: 42, color: C.bad });
    text(ctx, 'nobody knows if enough of it can exist', W / 2, 700, { size: 32, color: C.dim, alpha: P(t, K(23, 0.3), 0.5) * ne });
    text(ctx, 'but let’s say it can', W / 2, 760, { size: 32, color: C.text, alpha: P(t, K(23, 0.75), 0.5) * ne });
  }
  // 22 neither breaks the limit
  // 23–24 the race
  const r = P(t, K(24, 0.1), 0.6) * (1 - P(t, K(26, 0.2), 0.4));
  if (r > 0) {
    const t0 = K(24, 0.55), dur = Math.max(4, E(25) - t0);
    const { u, x0, x1 } = raceLanes(ctx, t, t0, dur, r, [[320, 'light beam', C.light], [540, 'warp drive', C.ftl], [760, 'wormhole', '#c8aaff']]);
    const bx = lerp(x0, x1, clamp(u / 0.5));
    ring(ctx, bx, 540, 55, C.ftl, { alpha: r, glow: 16, sy: 0.75 }); ship(ctx, bx, 540, 0.36, { alpha: r });
    ring(ctx, x0 + 40, 760, 34, '#c8aaff', { alpha: r, sy: 0.4, glow: 10 }); ring(ctx, x1 - 40, 760, 34, '#c8aaff', { alpha: r, sy: 0.4, glow: 10 });
    const wu = clamp(u / 0.3), wx = wu < 0.5 ? x0 + 40 : x1 - 40;
    if (u > 0) dot(ctx, wx, 760, 10, '#fff', { glow: 18, alpha: r * (wu > 0.4 && wu < 0.6 ? 0.2 : 1) });
    [[760, '1st', '#c8aaff', 0.3], [540, '2nd', C.ftl, 0.5], [320, '3rd', C.light, 1.0]].forEach(([y, s, col, f]) => text(ctx, s, x1 + 80, y, { size: 44, weight: 700, color: col, align: 'left', alpha: r * back(P(t, t0 + dur * f, 0.35)), glow: 12 }));
    text(ctx, 'light comes last', x1 + 5, 400, { size: 26, color: C.dim, align: 'right', alpha: r * P(t, t0 + dur + 0.2, 0.4) });
    caption(ctx, t, 'Picture a race.', W / 2, 130, K(24, 0.05), { size: 60, out: K(25) });
    caption(ctx, t, 'You win. You beat the light.', W / 2, 130, K(25, 0.05), { size: 60, hl: { 'win.': C.ftl }, out: K(26, 0.5) });
  }
  const f = P(t, K(26, 0.4), 0.5);
  if (f > 0) {
    dimAll(ctx, f * 0.6);
    caption(ctx, t, 'That’s the whole point of a shortcut…', W / 2, H / 2 - 70, K(26, 0.4), { size: 60 });
    caption(ctx, t, '…and exactly where cause and effect breaks.', W / 2, H / 2 + 40, K(26, 0.65), { size: 60, hl: { 'cause': C.bad, 'effect': C.bad, 'breaks.': C.bad } });
  }
  vignette(ctx);
}, () => [
  { t: K(18, 0.05), s: 'chime' }, { t: K(19), s: 'swell' }, { t: K(19, 0.2), s: 'riser' }, { t: K(21, 0.2), s: 'tick' },
  { t: K(22), s: 'swell' }, { t: K(22, 0.1), s: 'chime' }, { t: K(22, 0.4), s: 'whoosh' }, { t: K(23), s: 'glitch' }, 
  { t: K(24, 0.55), s: 'whoosh' }, { t: K(25, 0.05), s: 'ping' }, { t: K(26, 0.65), s: 'boom' },
]);

// =====================================================================
// D. The other rule (26–29)
// =====================================================================
scene('other', 27, 29, (ctx, t) => {
  background(ctx, t, { drift: 2 });
  const up = ease(P(t, K(28), 0.8));
  const ry = lerp(H / 2 - 40, 190, up), ra = P(t, K(27), 0.5), rv = P(t, K(27, 0.35), 0.6);
  text(ctx, 'THE REASON', W / 2, ry - 80, { size: 34, weight: 700, ls: 6, color: C.dim, alpha: ra });
  text(ctx, 'There is no single “now”', W / 2, ry + 10, { size: lerp(96, 70, up), weight: 700, color: C.ftl, alpha: rv, glow: 22 });
  // 28: what's "right now" on a distant star depends on how you move
  const a = P(t, K(28, 0.2), 0.6) * (1 - P(t, K(29, 0.3), 0.5));
  if (a > 0) {
    line(ctx, 120, 800, 700, 800, C.faint, 4, { alpha: a });
    person(ctx, 260, 800, 0.8, { alpha: a, color: C.light });
    person(ctx, 520, 800, 0.8, { alpha: a, color: C.ftl, walk: 1, phase: t * 6.5 });
    text(ctx, 'standing still', 260, 845, { size: 26, color: C.light, alpha: a });
    text(ctx, 'walking', 520, 845, { size: 26, color: C.ftl, alpha: a });
    dot(ctx, 1560, 470, 16, '#ffe9a8', { glow: 30, alpha: a });
    text(ctx, 'a distant star', 1560, 420, { size: 28, color: C.dim, alpha: a });
    card(ctx, 1240, 540, 640, 240, { alpha: a, color: 'rgba(140,160,230,0.5)' });
    text(ctx, '“right now” over there is…', 1560, 585, { size: 28, color: C.dim, alpha: a });
    text(ctx, 'for you: Monday', 1560, 650, { size: 40, weight: 700, color: C.light, alpha: a * P(t, K(28, 0.4), 0.4) });
    text(ctx, 'for them: Friday', 1560, 720, { size: 40, weight: 700, color: C.ftl, alpha: a * P(t, K(28, 0.6), 0.4) });
  }
  caption(ctx, t, 'That sounds absurd. So where does it come from?', W / 2, 640, K(29, 0.35), { size: 60, maxW: 1750 });
  vignette(ctx);
}, () => [{ t: K(27), s: 'swell' }, { t: K(27, 0.3), s: 'boom' }, { t: K(28, 0.4), s: 'tick' }, { t: K(28, 0.6), s: 'tick' }, { t: K(29, 0.25), s: 'chime' }]);

// =====================================================================
// E. How we found the "now" rule: light (30–40)
// =====================================================================
scene('light', 30, 38, (ctx, t) => {
  background(ctx, t, { drift: 2, starAlpha: 0.6 });
  caption(ctx, t, 'Light moves at the same speed — no matter how fast you’re moving.', W / 2, H / 2 - 40, K(30, 0.05), { size: 72, maxW: 1400, hl: { 'same': C.light, 'speed': C.light }, out: K(31, 0.8) });
  caption(ctx, t, 'Harmless? Compare it with everything else.', W / 2, H / 2 + 130, K(31, 0.1), { size: 44, color: C.dim, out: K(31, 0.9) });
  const tw = P(t, K(32) - 0.2, 0.6) * (1 - P(t, K(35, 0.1), 0.6));
  if (tw > 0) {
    ctx.save(); ctx.globalAlpha = tw;
    const ground = 780;
    line(ctx, 0, ground, W, ground, C.faint, 4);
    for (let i = 0; i < 14; i++) line(ctx, 60 + i * 140, ground, 60 + i * 140, ground + 40, C.faint, 3);
    const trx = 560 + (t - K(32) + 0.2) * 30;
    ctx.save(); ctx.translate(trx, 0);
    rrect(ctx, -330, 560, 720, 190, 26); ctx.fillStyle = '#1a2250'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#3c4a8a'; ctx.stroke();
    for (let i = 0; i < 5; i++) { rrect(ctx, -290 + i * 135, 590, 100, 70, 10); ctx.fillStyle = '#0c1233'; ctx.fill(); }
    for (const wx of [-230, -120, 180, 290]) { dot(ctx, wx, 758, 22, '#2c3560'); dot(ctx, wx, 758, 8, '#56608f'); }
    ctx.restore();
    for (let i = 0; i < 4; i++) line(ctx, trx - 430 - i * 30, 600 + i * 40, trx - 360 - i * 30, 600 + i * 40, C.dim, 3, { alpha: 0.5 });
    const rx = trx - 60, s = 0.8;
    person(ctx, rx, 560, s, { point: true });
    const [hx, hy] = handPos(rx, 560, s);
    person(ctx, 200, ground, 0.9);
    text(ctx, 'on the train', rx, 390, { size: 26, color: C.dim });
    text(ctx, 'on the platform', 200, 600, { size: 26, color: C.dim });
    const bu = t - K(32, 0.15);
    if (bu > 0 && t < K(33, 0.8)) dot(ctx, hx + 14 + bu * 140, hy, 15, '#ff9d5c', { glow: 12 });
    const bp = P(t, K(32, 0.35), 0.5) * (1 - P(t, K(33, 0.9), 0.4));
    card(ctx, 60, 150, 620, 150, { alpha: bp, color: '#ff9d5c' });
    text(ctx, 'Ball, seen from the platform', 370, 190, { size: 28, color: C.dim, alpha: bp });
    text(ctx, '100 + 30 = 130 km/h', 370, 252, { size: 52, weight: 700, color: '#ff9d5c', alpha: bp });
    // torch in the hand; the beam starts at the torch
    const lt = K(34, 0.1), tA = P(t, lt - 0.6, 0.4);
    ctx.save(); ctx.globalAlpha *= tA; rrect(ctx, hx - 4, hy - 9, 34, 18, 4); ctx.fillStyle = '#9aa6d6'; ctx.fill(); ctx.restore();
    if (t > lt) {
      const x0 = hx + 32;
      for (let k = 0; k < 6; k++) {
        const u = ((t - lt) * 1.4 + k / 6) % 1, head = x0 + u * 1100;
        if (head - x0 < 20) continue;
        line(ctx, Math.max(x0, head - 140), hy, head, hy, C.light, 6, { glow: 18, alpha: 1 - u });
      }
      dot(ctx, x0, hy, 8, '#dff8ff', { glow: 22 });
    }
    const lp = P(t, K(34, 0.4), 0.5), lp2 = P(t, K(34, 0.6), 0.5);
    card(ctx, 1180, 150, 660, 150, { alpha: lp, color: C.light });
    text(ctx, 'Measured on the train', 1510, 190, { size: 28, color: C.dim, alpha: lp });
    text(ctx, '300,000 km/s', 1510, 252, { size: 58, weight: 700, color: C.light, alpha: lp, glow: 12 });
    card(ctx, 60, 150, 620, 150, { alpha: lp2, color: C.light });
    text(ctx, 'Measured on the platform', 370, 190, { size: 28, color: C.dim, alpha: lp2 });
    text(ctx, '300,000 km/s', 370, 252, { size: 58, weight: 700, color: C.light, alpha: lp2, glow: 12 });
    ctx.restore();
  }
  caption(ctx, t, 'Light doesn’t work like that.', W / 2, 90, K(33, 0.05), { size: 54, out: K(34, 0.3), hl: { 'Light': C.light } });
  caption(ctx, t, '300,000 km every second.', W / 2, H / 2 - 70, K(35, 0.1), { size: 96, color: C.light, glow: 16, out: K(36) });
  caption(ctx, t, 'For everyone. Always.', W / 2, H / 2 + 70, K(35, 0.55), { size: 72, out: K(36) });
  // 36: tested for over a century; the most direct test
  const tl = P(t, K(36), 0.5) * (1 - P(t, K(37), 0.5));
  if (tl > 0) {
    chip(ctx, 'Tested for over a century ✓', W / 2, 330, { alpha: tl * P(t, K(36, 0.05), 0.4), size: 44, color: C.good });
    // 1964 experiment
    const ce = P(t, K(36, 0.1), 0.5) * tl;
    if (ce > 0) {
      const y2 = 560, t0p = K(36), xP0 = 220, vP = 1100 / Math.max(4, E(36) - K(36) + 1), vL = vP * 1.6;
      const px = xP0 + vP * Math.max(0, t - t0p);
      line(ctx, 200, y2, 1720, y2, C.faint, 2, { alpha: ce, dash: [6, 10] });
      for (let e = t0p; e <= t; e += 0.9) {           // flashes leave the particle and pull ahead
        const fx = xP0 + vP * (e - t0p) + vL * (t - e), age = t - e;
        if (fx > 1760 || age > 6) continue;
        if (fx - px < 6) continue;
        line(ctx, Math.max(px + 16, fx - 45), y2, fx, y2, C.light, 6, { glow: 16, alpha: ce * Math.max(0.25, 1 - age / 6) });
      }
      dot(ctx, Math.min(px, 1720), y2, 16, C.ftl, { glow: 24, alpha: ce });
      const c1 = ce * P(t, K(36, 0.3), 0.4), c2 = ce * P(t, K(36, 0.6), 0.4);
      card(ctx, 260, 660, 620, 150, { alpha: c1, color: C.ftl });
      text(ctx, 'particle', 570, 700, { size: 28, color: C.dim, alpha: c1 });
      text(ctx, '99.975% of light speed', 570, 760, { size: 44, weight: 700, color: C.ftl, alpha: c1 });
      card(ctx, 1040, 660, 620, 150, { alpha: c2, color: C.light });
      text(ctx, 'its flash of light', 1350, 700, { size: 28, color: C.dim, alpha: c2 });
      text(ctx, 'exactly light speed', 1350, 760, { size: 44, weight: 700, color: C.light, alpha: c2 });
    }
  }
  // 39–40 disagreeing about time
  const cl = P(t, K(37), 0.6);
  if (cl > 0) {
    const draw = (x, rate, label, col) => {
      ring(ctx, x, 520, 150, col, { lw: 6, glow: 14, alpha: cl });
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; line(ctx, x + Math.cos(a) * 125, 520 + Math.sin(a) * 125, x + Math.cos(a) * 140, 520 + Math.sin(a) * 140, col, 4, { alpha: cl }); }
      const a = (t - K(37)) * rate * 1.6 - Math.PI / 2;
      line(ctx, x, 520, x + Math.cos(a) * 115, 520 + Math.sin(a) * 115, C.text, 7, { alpha: cl });
      dot(ctx, x, 520, 9, C.text, { alpha: cl });
      text(ctx, label, x, 740, { size: 40, weight: 600, color: col, alpha: cl });
    };
    draw(620, 1, 'you', C.light); draw(1300, 0.6, 'someone moving', C.ftl);
    chip(ctx, 'EINSTEIN, 1905', W / 2, 60, { alpha: cl * (1 - P(t, K(38), 0.4)), size: 30 });
    caption(ctx, t, 'Moving differently = disagreeing about time', W / 2, 150, K(37, 0.3), { size: 56, out: K(38) });
    caption(ctx, t, '…and about “right now” far away', W / 2, 150, K(38, 0.1), { size: 56, hl: { '“right': C.ftl, 'now”': C.ftl } });
  }
  vignette(ctx);
}, () => [
  { t: K(30, 0.05), s: 'chime' }, { t: K(32, 0.15), s: 'pop' }, { t: K(32, 0.35), s: 'tick' }, { t: K(34, 0.1), s: 'zap' },
  { t: K(34, 0.4), s: 'tick' }, { t: K(34, 0.6), s: 'tick' }, { t: K(35, 0.1), s: 'boom' }, { t: K(36, 0.2), s: 'pop' },
  { t: K(36, 0.6), s: 'ping' }, { t: K(37), s: 'whoosh' },
]);

// =====================================================================
// F. The "now" ruler and the Andromeda walk (41–46)
// =====================================================================
const NOW = { here: 300, mid: [720, 1120], far: 1560, y0: 170, y1: 860, py: 520, day: 60 };
function walkerX(t) {
  const a = K(40, 0.15), b = E(42), c = E(43);
  if (t < a) return 250;
  if (t < b) return 250 + Math.min(1, (t - a) / (b - a)) * 240;
  if (t < c) return 490 - Math.min(1, (t - b) / (c - b)) * 240;
  return 370 + 120 * Math.sin((t - c) * 0.45 - Math.PI / 2);
}
scene('now', 39, 44, (ctx, t) => {
  background(ctx, t, { drift: 1.5, starAlpha: 0.7 });
  const S = NOW, sA = P(t, K(39), 0.8);
  strip(ctx, t, S.here, S.y0, S.y1, { alpha: sA, color: 'rgba(92,225,255,0.6)' });
  S.mid.forEach((x, i) => strip(ctx, t, x, S.y0, S.y1, { alpha: sA * P(t, K(39, 0.1 + i * 0.1), 0.5) * 0.8 }));
  strip(ctx, t, S.far, S.y0, S.y1, { alpha: sA * P(t, K(39, 0.3), 0.5) });
  text(ctx, 'HERE', S.here, S.y0 - 30, { size: 28, weight: 700, color: C.light, alpha: sA });
  const andA = P(t, K(42), 0.8);
  galaxy(ctx, 1760, S.py, 140, t, { seed: 11, tilt: 0.35, angle: -0.55, alpha: andA, n: 1800, armR: 230, armG: 190 });
  text(ctx, 'ANDROMEDA', S.far, S.y0 - 30, { size: 28, weight: 700, alpha: andA });
  text(ctx, 'FAR AWAY', S.far, S.y0 - 30, { size: 28, weight: 700, color: C.dim, alpha: sA * (1 - andA) });
  text(ctx, 'each place’s clock, ticking up', S.mid[0] + 200, S.y1 + 30, { size: 24, color: C.dim, alpha: sA * (1 - P(t, K(40), 0.5)) });
  const dA = P(t, K(42, 0.2), 0.5);
  [[4, '+4 days'], [0, 'today'], [-4, '−4 days']].forEach(([d, s]) => {
    const y = S.py - d * S.day;
    line(ctx, S.far - 40, y, S.far + 40, y, C.text, 3, { alpha: dA });
    text(ctx, s, S.far - 50, y, { size: 26, color: C.dim, align: 'right', alpha: dA });
  });
  // walker and sitter
  const wx = walkerX(t), v = walkerX(t + 0.05) - walkerX(t - 0.05);
  const dir = v < -0.2 ? -1 : 1, walk = clamp(Math.abs(v) / 1.0);
  const wkA = P(t, K(40), 0.5);
  line(ctx, 90, 700, 580, 700, C.faint, 4, { alpha: wkA });
  person(ctx, 150, 700, 0.75, { sit: true, alpha: wkA, color: C.dim });
  person(ctx, wx, 700, 0.75, { walk, phase: t * 6.5, dir, alpha: wkA, color: C.light });
  text(ctx, 'sitting', 150, 745, { size: 24, color: C.dim, alpha: wkA });
  text(ctx, 'walking', wx, 745, { size: 24, color: C.light, alpha: wkA * walk });
  // rulers: walking towards Andromeda (right) tips the far end UP, into its future
  const rA = P(t, K(39, 0.5), 0.6);
  const amp = lerp(0.03, 1, ease(P(t, K(41, 0.5), 1.4)));
  const tilt = clamp(v / 1.1, -1, 1) * amp * P(t, K(40, 0.3), 0.6);
  const slope = -tilt * 4 * S.day / (S.far - S.here);
  const tipped = t > K(40, 0.3);
  ruler(ctx, S.here, S.py, 0, S.here, S.far + 60, tipped ? C.dim : C.light, rA * (tipped ? 0.7 : 1), { dash: tipped ? [12, 10] : null, glow: tipped ? 0 : 14, lw: tipped ? 4 : 6 });
  text(ctx, tipped ? '“now” for someone sitting still' : 'your “right now”', 1180, S.py + 34, { size: 26, color: tipped ? C.dim : C.light, weight: 600, alpha: rA * (1 - P(t, K(42), 0.5)) });
  if (tipped) {
    ruler(ctx, S.here, S.py, slope, S.here, S.far + 60, C.light, P(t, K(40, 0.3), 0.6));
    text(ctx, 'your “right now” while walking', 1180, S.py + slope * (1180 - S.here) - 34, { size: 26, color: C.light, weight: 600, alpha: P(t, K(40, 0.5), 0.5) });
    const gA = P(t, K(41, 0.4), 0.5);
    [...S.mid, S.far].forEach(x => { const yy = S.py + slope * (x - S.here); if (Math.abs(yy - S.py) > 4) line(ctx, x + 40, S.py, x + 40, yy, C.ftl, 5, { alpha: gA, glow: 10 }); });
    const mg = P(t, K(41), 0.4) * (1 - P(t, K(41, 0.5), 0.4));
    if (mg > 0) { ring(ctx, S.mid[0], S.py, 60, C.text, { alpha: mg, lw: 3 }); text(ctx, 'nearby: a billionth of a second', S.mid[0], S.py + 100, { size: 26, color: C.dim, alpha: mg }); }
    dot(ctx, S.far, S.py + slope * (S.far - S.here), 11, tilt >= 0 ? C.ftl : C.bad, { glow: 20, alpha: dA });
  }
  const days = tilt * 4;
  clockPanel(ctx, 1080, 790, 'Andromeda’s “right now”, for the walker', (days >= 0 ? '+' : '−') + Math.abs(days).toFixed(1) + ' days', { alpha: P(t, K(42, 0.2), 0.6), w: 580, h: 140, color: days >= 0 ? C.ftl : C.bad, vsize: 54 });
  caption(ctx, t, 'Your “right now” is a ruler across every clock', W / 2, 80, K(39, 0.1), { size: 50, out: K(40, 0.3) });
  caption(ctx, t, 'Walk, and your ruler tips', W / 2, 80, K(40, 0.35), { size: 54, out: K(41) });
  caption(ctx, t, 'The tip grows with distance', W / 2, 80, K(41, 0.4), { size: 54, out: K(42, 0.1) });
  chip(ctx, 'The Andromeda paradox  ·  Roger Penrose', W / 2, 80, { alpha: P(t, K(44, 0.1), 0.5), size: 34 });
  vignette(ctx);
}, () => [
  { t: K(39), s: 'swell' }, { t: K(39, 0.5), s: 'chime' }, { t: K(40, 0.15), s: 'steps' }, { t: K(41, 0.4), s: 'riser' },
  { t: K(42), s: 'swell' }, { t: K(42, 0.2), s: 'ping' }, { t: E(42), s: 'steps' }, { t: E(42) + 0.2, s: 'whoosh' }, { t: K(44, 0.1), s: 'tick' },
]);

// =====================================================================
// G. Why the shortcuts can't work (47–58)
// =====================================================================
scene('cannot', 45, 59, (ctx, t) => {
  background(ctx, t, { drift: 1.5, starAlpha: 0.6, center: '#0e0b2a' });
  // 47: harmless. 48: Andromeda can't reach you anyway.
  caption(ctx, t, 'Normally, this is harmless.', W / 2, H / 2 - 40, K(45, 0.05), { size: 70, out: K(46) });
  const an = P(t, K(46), 0.6) * (1 - P(t, K(47), 0.5));
  if (an > 0) {
    galaxy(ctx, 1560, 470, 190, t, { seed: 11, tilt: 0.35, angle: -0.55, alpha: an, n: 1800, armR: 230, armG: 190 });
    text(ctx, 'ANDROMEDA', 1560, 300, { size: 30, weight: 700, alpha: an });
    person(ctx, 330, 620, 0.9, { alpha: an, color: C.light });
    text(ctx, 'you', 330, 665, { size: 28, color: C.light, alpha: an });
    const lx = lerp(1360, 520, ease(P(t, K(46, 0.15), 3.0)) * 0.12);
    line(ctx, 520, 470, 1360, 470, C.faint, 2, { alpha: an, dash: [8, 10] });
    line(ctx, lx, 470, 1360, 470, C.light, 6, { glow: 16, alpha: an });
    dot(ctx, lx, 470, 8, '#fff', { glow: 18, alpha: an });
    text(ctx, 'anything from “four days from now” over there', W / 2, 560, { size: 30, color: C.dim, alpha: an * P(t, K(46, 0.2), 0.4) });
    text(ctx, 'needs 2.5 million years to reach you', W / 2, 610, { size: 34, weight: 700, color: C.light, alpha: an * P(t, K(46, 0.35), 0.4) });
    text(ctx, 'light from there, still on its way', lx, 430, { size: 24, color: C.light, alpha: an * P(t, K(46, 0.6), 0.4) });
  }
  // 49: a normal message — everyone agrees it's sent before it's read
  const h = P(t, K(47), 0.6) * (1 - P(t, K(48, 0.4), 0.5));
  if (h > 0) {
    const x1 = 560, x2 = 1360, ys = 640, yr = 340;
    strip(ctx, t, x1, 170, 790, { alpha: h, color: 'rgba(92,225,255,0.6)' }); strip(ctx, t, x2, 170, 790, { alpha: h });
    text(ctx, 'YOU', x1, 140, { size: 28, weight: 700, color: C.light, alpha: h }); text(ctx, 'A FRIEND', x2, 140, { size: 28, weight: 700, alpha: h });
    const ang = 0.14 * Math.sin((t - K(47)) * 1.3);
    ruler(ctx, x1, ys, -Math.tan(ang), x1, x2, C.ftl, h * 0.8, { lw: 4 });
    text(ctx, 'anyone’s ruler', x2 + 45, ys - Math.tan(ang) * (x2 - x1), { size: 26, color: C.ftl, align: 'left', alpha: h });
    arrow(ctx, x1 + 20, ys - 10, x2 - 20, yr + 10, { color: C.light, lw: 6, glow: 14, alpha: h, u: ease(P(t, K(47, 0.15), 1.0)) });
    dot(ctx, x1, ys, 14, '#fff', { glow: 16, alpha: h }); text(ctx, 'sent', x1 - 45, ys, { size: 30, weight: 700, align: 'right', alpha: h });
    const ar = h * P(t, K(47, 0.35), 0.3);
    dot(ctx, x2, yr, 14, '#fff', { glow: 16, alpha: ar }); text(ctx, 'read', x2 + 45, yr, { size: 30, weight: 700, align: 'left', alpha: ar });
    text(ctx, 'everyone agrees: sent before read ✓', W / 2, 835, { size: 36, weight: 700, color: C.good, alpha: h * P(t, K(47, 0.5), 0.5) });
    caption(ctx, t, 'Causes always come first.', W / 2, 80, K(47, 0.7), { size: 56, hl: { 'Causes': C.good }, out: K(48, 0.4) });
  }
  caption(ctx, t, 'Add a shortcut that beats light…', W / 2, H / 2 - 30, K(48, 0.45), { size: 70, out: K(49), hl: { 'beats': C.ftl, 'light…': C.ftl } });
  const math = P(t, K(49), 0.5) * (1 - P(t, K(49, 0.85), 0.4));
  if (math > 0) {
    chip(ctx, 'The maths: references in the description ↓', W / 2, H / 2 - 40, { alpha: math, size: 40 });
    text(ctx, 'the result is simple', W / 2, H / 2 + 60, { size: 36, color: C.dim, alpha: math * P(t, K(49, 0.6), 0.4) });
  }
  // 51–52: the message and the reply
  const fd = P(t, K(50), 0.6) * (1 - P(t, K(52), 0.5));
  if (fd > 0) {
    const px = 100, X = x => 560 + x * px, Y = tt => 800 - tt * px;
    const v = 0.6, tS = 3, D = 5, tQ = tS - v * D, sx = tt => D + v * (tt - tS);
    ctx.save(); ctx.globalAlpha = fd;
    strip(ctx, t, X(0), Y(6.3), Y(-0.6), { color: 'rgba(92,225,255,0.6)', w: 44 });
    text(ctx, 'YOU', X(0), Y(6.3) - 30, { size: 32, weight: 700, color: C.light });
    const x0 = X(sx(-0.6)), y0 = Y(-0.6), x1 = X(sx(6.3)), y1 = Y(6.3);
    ctx.lineWidth = 44; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(16,22,52,0.9)'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(140,160,230,0.6)';
    const n = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / n, uy = (y1 - y0) / n;
    for (const s of [-22, 22]) { ctx.beginPath(); ctx.moveTo(x0 - uy * s, y0 + ux * s); ctx.lineTo(x1 - uy * s, y1 + ux * s); ctx.stroke(); }
    { const dl = Math.hypot(x1 - x0, y1 - y0), dx = (x1 - x0) / dl, dy = (y1 - y0) / dl; ship(ctx, x1 + dx * 26, y1 + dy * 26, 0.42, { rot: Math.atan2(dy, dx) }); }
    text(ctx, 'SPACESHIP, moving fast', x1 + 60, y1 - 30, { size: 30, weight: 700, align: 'left' });
    const s1 = P(t, K(50, 0.05), 0.5);
    dot(ctx, X(0), Y(tS), 14, C.text, { glow: 14, alpha: s1 });
    text(ctx, 'you send', X(0) - 36, Y(tS), { size: 30, weight: 700, align: 'right', alpha: s1 });
    arrow(ctx, X(0) + 20, Y(tS), X(D), Y(tS), { color: C.ftl, lw: 7, glow: 18, u: ease(P(t, K(50, 0.1), 0.5)), alpha: s1 });
    text(ctx, 'beats light', X(D / 2), Y(tS) - 34, { size: 28, color: C.ftl, weight: 600, alpha: P(t, K(50, 0.2), 0.5) });
    dot(ctx, X(D), Y(tS), 14, C.ftl, { glow: 18, alpha: P(t, K(50, 0.3), 0.3) });
    const cn = P(t, K(50, 0.35), 0.6);
    ruler(ctx, X(D), Y(tS), -v, X(-0.8), X(D + 2.6), C.bad, cn * 0.9, { lw: 4, dash: [14, 10], glow: 6 });
    text(ctx, 'the crew’s ruler', X(D + 2.6) + 18, Y(tS + v * 2.6), { size: 28, color: C.bad, weight: 700, align: 'left', alpha: cn });
    const q = P(t, K(50, 0.5), 0.5) * (1 - P(t, K(51), 0.4));
    dot(ctx, X(0), Y(tQ), 13, C.bad, { glow: 16, alpha: q });
    text(ctx, 'for the crew, it arrived', X(0) - 40, Y(tQ) - 16, { size: 26, color: C.bad, align: 'right', alpha: q });
    text(ctx, 'before you sent it', X(0) - 40, Y(tQ) + 18, { size: 26, color: C.bad, weight: 700, align: 'right', alpha: q });
    const rp = P(t, K(51, 0.05), 0.4);
    arrow(ctx, X(D) - 16, Y(tS) + 10, X(0) + 16, Y(tQ) - 10, { color: C.bad, lw: 7, glow: 18, u: ease(P(t, K(51, 0.05), 0.7)), alpha: rp });
    text(ctx, 'their reply', X(1.4), Y(tQ + 1.4 * v) - 60, { size: 28, color: C.bad, weight: 600, alpha: P(t, K(51, 0.3), 0.5) });
    const br = P(t, K(51, 0.4), 0.5);
    dot(ctx, X(0), Y(tQ), 15, C.bad, { glow: 20, alpha: br });
    text(ctx, 'reply arrives', X(0) - 36, Y(tQ), { size: 30, weight: 700, color: C.bad, align: 'right', alpha: br });
    line(ctx, X(0) - 250, Y(tQ) + 14, X(0) - 250, Y(tS) - 14, C.bad, 4, { alpha: br });
    text(ctx, 'BEFORE', X(0) - 270, Y((tS + tQ) / 2) - 18, { size: 32, weight: 700, color: C.bad, align: 'right', alpha: br });
    text(ctx, 'you asked', X(0) - 270, Y((tS + tQ) / 2) + 20, { size: 28, color: C.bad, align: 'right', alpha: br });
    ctx.restore();
    caption(ctx, t, 'Moving fast tips the ruler a lot.', W / 2, 80, K(50, 0.05), { size: 54, out: K(50, 0.55), hl: { 'lot.': C.bad } });
    caption(ctx, t, 'A message into your own past.', W / 2, 80, K(51, 0.6), { size: 56, hl: { 'past.': C.bad } });
  }
  // 53: Einstein 1907
  const ei = P(t, K(52), 0.5) * (1 - P(t, K(53), 0.5));
  if (ei > 0) {
    text(ctx, '1907', W / 2, H / 2 - 110, { size: 150, weight: 700, color: C.light, alpha: ei, glow: 24 });
    text(ctx, 'two years after relativity, Einstein spots it', W / 2, H / 2 + 20, { size: 44, alpha: ei });
    text(ctx, 'the “tachyonic anti-telephone”', W / 2, H / 2 + 110, { size: 56, weight: 700, color: C.ftl, alpha: ei * P(t, K(52, 0.55), 0.5), glow: 12 });
  }
  // 54: warp — Everett's two trips
  const ev = P(t, K(53), 0.6) * (1 - P(t, K(54), 0.5));
  if (ev > 0) {
    const X = x => 620 + x * 150, Y = tt => 800 - tt * 100;
    strip(ctx, t, X(0), Y(6.3), Y(-0.4), { alpha: ev, color: 'rgba(92,225,255,0.6)', w: 44 });
    strip(ctx, t, X(5), Y(6.3), Y(-0.4), { alpha: ev, w: 44 });
    text(ctx, 'HOME', X(0), Y(6.3) - 30, { size: 30, weight: 700, color: C.light, alpha: ev });
    text(ctx, 'FAR STAR', X(5), Y(6.3) - 30, { size: 30, weight: 700, alpha: ev });
    const o1 = ease(P(t, K(53, 0.5), 0.8)), o2 = ease(P(t, K(53, 0.7), 0.8));
    arrow(ctx, X(0) + 22, Y(3.2), X(5) - 22, Y(4.0), { color: C.ftl, lw: 7, glow: 16, u: o1, alpha: ev });
    text(ctx, 'warp trip out', X(2.5), Y(3.6) - 40, { size: 28, color: C.ftl, weight: 600, alpha: ev * o1 });
    arrow(ctx, X(5) - 22, Y(4.0), X(0) + 22, Y(1.2), { color: C.bad, lw: 7, glow: 16, u: o2, alpha: ev });
    text(ctx, 'second warp trip back', X(2.9), Y(2.1) + 50, { size: 28, color: C.bad, weight: 600, alpha: ev * o2 });
    const hb = P(t, K(53, 0.9), 0.4) * ev;
    dot(ctx, X(0), Y(3.2), 12, C.text, { alpha: ev * o1 }); text(ctx, 'leave', X(0) - 40, Y(3.2), { size: 28, weight: 700, align: 'right', alpha: ev * o1 });
    dot(ctx, X(0), Y(1.2), 12, C.bad, { alpha: hb, glow: 16 }); text(ctx, 'home before you left', X(0) - 40, Y(1.2), { size: 30, weight: 700, color: C.bad, align: 'right', alpha: hb });
    chip(ctx, 'WARP DRIVE  ·  Allen Everett, 1996', W / 2, 80, { alpha: ev * P(t, K(53, 0.45), 0.4), size: 32 });
    caption(ctx, t, 'Our shortcuts beat light too.', W / 2, 80, K(53, 0.02), { size: 54, out: K(53, 0.42), hl: { 'beat': C.ftl } });
  }
  // 55–57: wormhole
  const wA = P(t, K(54), 0.6) * (1 - P(t, K(58), 0.5));
  if (wA > 0) {
    const tripT0 = K(55, 0.35), tripD = Math.max(3, E(55) - tripT0 + 0.2);
    const tr = clamp((t - tripT0) / tripD), out = Math.sin(tr * Math.PI);
    const wh = wormhole(ctx, t, { alpha: wA, mB: [480 + 360 * ease(out), 320 * ease(out)] });
    caption(ctx, t, 'The wormhole is even simpler.', W / 2, 80, K(54, 0.05), { size: 56, out: K(55) });
    chip(ctx, 'Kip Thorne & colleagues, 1988', W / 2, 80, { alpha: P(t, K(55), 0.4) * (1 - P(t, K(56), 0.4)), size: 32 });
    const ck = P(t, K(55, 0.2), 0.5) * (1 - P(t, K(57), 0.4)), yearA = 2025 + 5 * tr;
    const tj = K(56, 0.45), trip2 = clamp((t - tj) / 2.0), arrived = trip2 >= 0.85;
    if (t > tj && !arrived) { const [qx, qy] = wh.bez(1 - clamp(trip2 / 0.85)); dot(ctx, qx, qy, 11, '#fff', { glow: 22 }); }
    const past = arrived;
    const [cax, cay] = proj(wh.mA[0], 190, wh.mA[1]), [cbx, cby] = proj(wh.mB[0], 190, wh.mB[1]);
    clockPanel(ctx, cax, cay, 'this end', past ? '2025' : String(Math.floor(yearA)), { alpha: ck, w: 240, h: 130, vsize: 54, color: past ? C.bad : C.light, glow: past ? 30 : 0 });
    clockPanel(ctx, cbx, cby, 'travelling end', '2025', { alpha: ck, w: 240, h: 130, vsize: 54, color: C.ftl });
    if (tr > 0 && tr < 1) text(ctx, 'fast round trip', cbx, cby - 95, { size: 26, color: C.ftl, alpha: out });
    text(ctx, 'comes back younger', cbx, cby - 95, { size: 26, color: C.ftl, weight: 700, alpha: P(t, tripT0 + tripD, 0.4) * (1 - P(t, K(56, 0.4), 0.4)) });
    if (past) { const [rx, ry] = wh.ringA; dot(ctx, rx, ry - 18, 12, '#fff', { glow: 26 }); text(ctx, 'you arrive 5 years in the past', rx + 60, ry + 70, { size: 32, weight: 700, color: C.bad, alpha: 1 - P(t, K(57), 0.3) }); }
    caption(ctx, t, 'Two ends, two different times.', W / 2, 80, K(56, 0.02), { size: 54, out: K(56, 0.38) });
    caption(ctx, t, 'Step into the younger end…', W / 2, 80, K(56, 0.45), { size: 54, out: K(57) });
    const iv = P(t, K(57), 0.5);
    if (iv > 0) {
      dimAll(ctx, iv * 0.65);
      card(ctx, W / 2 - 520, 300, 1040, 330, { alpha: iv, color: '#c8aaff', glow: 18 });
      text(ctx, 'INTERSTELLAR', W / 2, 370, { size: 40, weight: 700, ls: 8, color: '#c8aaff', alpha: iv });
      text(ctx, 'its wormhole was designed with Kip Thorne', W / 2, 450, { size: 40, weight: 600, alpha: iv * P(t, K(57, 0.2), 0.4) });
      text(ctx, 'the physicist who showed wormholes', W / 2, 525, { size: 36, color: C.dim, alpha: iv * P(t, K(57, 0.5), 0.4) });
      text(ctx, 'can become time machines', W / 2, 575, { size: 36, weight: 700, color: C.ftl, alpha: iv * P(t, K(57, 0.5), 0.4) });
    }
  }
  const fin = P(t, K(58), 0.5);
  if (fin > 0) {
    dimAll(ctx, fin * 0.7);
    const f1 = 1 - P(t, K(59), 0.4);
    caption(ctx, t, 'They never break the speed limit.', W / 2, H / 2 - 80, K(58, 0.02), { size: 64, out: K(59) });
    caption(ctx, t, 'They break the order of events.', W / 2, H / 2 + 40, K(58, 0.45), { size: 80, color: C.bad, glow: 14, out: K(59) });
    caption(ctx, t, 'The problem was never speed.', W / 2, H / 2 - 80, K(59, 0.05), { size: 64 });
    caption(ctx, t, 'There is no universal “now”.', W / 2, H / 2 + 40, K(59, 0.45), { size: 84, color: C.ftl, glow: 16 });
  }
  vignette(ctx);
}, () => [
  { t: K(46, 0.15), s: 'riser' }, { t: K(47, 0.15), s: 'zap' }, { t: K(47, 0.5), s: 'chime' }, { t: K(48, 0.45), s: 'riser' }, { t: K(49), s: 'tick' },
  { t: K(50, 0.1), s: 'zap' }, { t: K(50, 0.5), s: 'glitch' }, { t: K(51, 0.05), s: 'zap' }, { t: K(51, 0.4), s: 'boom' },
  { t: K(52), s: 'chime' }, { t: K(53, 0.5), s: 'whoosh' }, { t: K(53, 0.7), s: 'whoosh' }, { t: K(53, 0.9), s: 'glitch' },
  { t: K(54), s: 'swell' }, { t: K(55, 0.35), s: 'whoosh' }, { t: K(56, 0.45), s: 'riser' }, { t: K(56, 0.45) + 1.7, s: 'glitch' }, { t: K(57), s: 'chime' }, { t: K(58, 0.45), s: 'boom' }, { t: K(59, 0.45), s: 'boom' },
]);

// =====================================================================
// H. So which one gives? (59–64)
// =====================================================================
scene('options', 60, 65, (ctx, t) => {
  background(ctx, t, { drift: 2 });
  const opts = [['1', 'Einstein is wrong', 'a hidden universal “now”'], ['2', 'Past time travel', 'is real'], ['3', 'Faster-than-light', 'never happens']];
  const up = ease(P(t, K(65), 0.8)), bet = P(t, K(64, 0.4), 0.6);
  const tri3 = 1 - P(t, K(61), 0.4);
  [['Einstein’s relativity', C.light], ['cause and effect', C.good], ['faster-than-light shortcuts', C.ftl]].forEach(([s, col], i) => chip(ctx, s, [390, 905, 1475][i], 480, { alpha: tri3 * P(t, K(60, 0.2 + i * 0.12), 0.4), size: 36, color: col }));
  text(ctx, 'can’t all be true', W / 2, 600, { size: 44, weight: 700, color: C.bad, alpha: tri3 * P(t, K(60, 0.6), 0.4) });
  caption(ctx, t, 'Something has to give.', W / 2, 130, K(60, 0.75), { size: 60, out: K(65) });
  opts.forEach(([n, a, b], i) => {
    const x = 390 + i * 570, y = 500, al = P(t, K(61 + i, 0.02), 0.5);
    const focus = (i === 2 ? 1 : 1 - 0.65 * bet) * (1 - up);
    if (focus <= 0) return;
    ctx.save(); ctx.globalAlpha = focus;
    card(ctx, x - 250, y - 180, 500, 360, { alpha: al, color: i === 2 && bet > 0 ? C.light : 'rgba(140,160,230,0.35)', glow: i === 2 ? 30 * bet : 0, lw: i === 2 && bet > 0 ? 4 : 2 });
    text(ctx, n, x, y - 90, { size: 90, weight: 700, color: i === 2 ? C.light : C.dim, alpha: al });
    text(ctx, a, x, y + 30, { size: 44, weight: 700, alpha: al });
    text(ctx, b, x, y + 90, { size: 34, color: C.dim, alpha: al });
    ctx.restore();
  });
  chip(ctx, 'Not proven impossible', W / 2, 780, { alpha: P(t, K(64), 0.5) * (1 - up), size: 34, color: C.dim });
  text(ctx, 'most physicists’ bet', 390 + 2 * 570, 270, { size: 34, weight: 700, color: C.light, alpha: bet * (1 - up) });
  const hk = P(t, K(65, 0.05), 0.8);
  if (hk > 0) {
    text(ctx, 'STEPHEN HAWKING', W / 2, 330, { size: 32, weight: 600, ls: 6, color: C.dim, alpha: hk });
    caption(ctx, t, 'Chronology protection', W / 2, 430, K(65, 0.1), { size: 96, color: C.light, glow: 14 });
    text(ctx, 'the laws of physics stop time machines from forming', W / 2, 530, { size: 36, color: C.dim, alpha: P(t, K(65, 0.35), 0.5) });
    const qa = P(t, K(65, 0.65), 0.6);
    card(ctx, 380, 630, 1160, 170, { alpha: qa, color: C.ftl, glow: 16 });
    text(ctx, '“…makes the universe safe for historians.”', W / 2, 715, { size: 52, weight: 600, alpha: qa });
  }
  vignette(ctx);
}, () => [
  { t: K(61, 0.02), s: 'pop' }, { t: K(62, 0.02), s: 'pop' }, { t: K(63, 0.02), s: 'pop' }, { t: K(64), s: 'tick' },
  { t: K(64, 0.4), s: 'chime' }, { t: K(65, 0.05), s: 'whoosh' }, { t: K(65, 0.65), s: 'ding' },
]);

// =====================================================================
// I. Close (65–68): the ship flies INTO the star streaks; the text returns
// =====================================================================
scene('close', 66, 69, (ctx, t) => {
  const j0 = K(66, 0.05), jump = P(t, j0, 2.2), after = P(t, K(66, 0.55), 1.0);
  const streak = Math.sin(clamp(jump) * Math.PI * 0.5) * 3 * (1 - after);
  background(ctx, t, { drift: 5 + 200 * jump * (1 - after), streak });
  const go = easeIn(P(t, j0, 1.6)), sa = 1 - P(t, j0 + 1.4, 0.3);
  if (sa > 0) ship(ctx, W / 2, lerp(H / 2 + 260, H / 2, go), lerp(1.3, 0.05, go), { alpha: sa, rot: -Math.PI / 2 });
  const fr = P(t, K(66, 0.05), 0.4) * (1 - P(t, K(66, 0.5), 0.4));
  ['STAR WARS', 'STAR TREK', 'STARGATE'].forEach((s, i) => chip(ctx, s, 560 + i * 400, 150, { alpha: fr * P(t, K(66, 0.05 + i * 0.06), 0.3), size: 36, color: C.text }));
  const flash = P(t, j0 + 1.45, 0.12) * (1 - P(t, j0 + 1.6, 0.5));
  if (flash > 0) { ctx.fillStyle = `rgba(200,240,255,${flash * 0.8})`; ctx.fillRect(0, 0, W, H); }
  // the phone again: the text from tomorrow… and then nothing
  const pa = P(t, K(66, 0.55), 0.5) * (1 - P(t, K(68), 0.5));
  const none = P(t, K(67, 0.1), 0.5);
  phone(ctx, W / 2, H / 2 - 20, 0.8, pa, c => {
    const b = 1 - none;
    notification(c, t, K(66, 0.6), [['Don’t send this', b], ['message tomorrow.', b]], 1 - none);
    text(c, 'No new messages', 0, 0, { size: 34, weight: 500, color: C.dim, alpha: none });
  });
  caption(ctx, t, 'The speed of light isn’t just a speed limit.', W / 2, H / 2 - 110, K(68, 0.05), { size: 70, out: E(69) + 1.5 });
  caption(ctx, t, 'It’s the speed of cause and effect.', W / 2, H / 2 + 40, K(69, 0.05), { size: 84, maxW: 1800, color: C.light, glow: 20, out: E(69) + 1.5 });
  const end = P(t, E(69) + 2.0, 1.8);
  if (end > 0) { ctx.fillStyle = `rgba(0,0,0,${end})`; ctx.fillRect(0, 0, W, H); }
  vignette(ctx);
}, () => [
  { t: K(66, 0.05), s: 'riser' }, { t: K(66, 0.05) + 1.45, s: 'boom' }, { t: K(66, 0.6), s: 'buzz' }, { t: K(67, 0.1), s: 'tick' },
  { t: K(69, 0.05), s: 'chime' },
]);

// Engine
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
