// Renders a video's frames. --video is the video folder (default: the current folder).
// Usage: node engine/render.js --video DIR [--from s] [--to s] [--fps 30] [--workers 2] [--subs 0|1] [--out file.mp4]
//        node engine/render.js --video DIR --stills 12.5,40,80 [--outdir DIR/build/stills]
//        node engine/render.js --video DIR --cues    (writes build/cues.json + build/scenes.json)
//        node engine/render.js --video DIR --check   (lists overlapping or off-screen text)
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs'), path = require('path'), { spawn } = require('child_process'), { pathToFileURL } = require('url');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => { if (x.startsWith('--')) a.push([x.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']); return a; }, []));
const ENGINE = __dirname, VIDEO = path.resolve(args.video || process.cwd()), B = path.join(VIDEO, 'build');
const tl = JSON.parse(fs.readFileSync(path.join(B, 'timeline.json')));
const fps = +(args.fps || 30), subs = args.subs !== '0';
const launch = () => chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--disable-gpu-vsync', '--force-device-scale-factor=1'] });

async function page(browser) {
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto(pathToFileURL(path.join(ENGINE, 'index.html')).href + '?scenes=' + encodeURIComponent(pathToFileURL(path.join(VIDEO, 'scenes.js')).href));
  await p.evaluate(() => window.ready);
  await p.evaluate(([tl, subs]) => setup(tl, { subs }), [tl, subs]);
  return p;
}

async function segment(f0, f1, out) {
  const browser = await launch(), p = await page(browser);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', args.preset || 'medium', '-crf', args.crf || '19', '-pix_fmt', 'yuv420p', '-r', String(fps), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    await p.evaluate(t => renderFrame(t), f / fps);
    const buf = await p.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % 300 === 0) console.log(`${path.basename(out)} ${f - f0}/${f1 - f0} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await browser.close();
}

(async () => {
  if (args.cues) {
    const browser = await launch(), p = await page(browser);
    fs.writeFileSync(path.join(B, 'cues.json'), JSON.stringify(await p.evaluate(() => getCues()), null, 1));
    fs.writeFileSync(path.join(B, 'scenes.json'), JSON.stringify(await p.evaluate(() => getScenes()), null, 1));
    await browser.close(); return;
  }
  if (args.check) {
    // Overlap check: every 0.25 s, collect text boxes and flag collisions / off-screen text.
    const browser = await launch(), p = await page(browser);
    const scenes = await p.evaluate(() => getScenes());
    const step = +(args.step || 0.25), issues = [];
    for (let t = 0.5; t < tl.total - 0.5; t += step) {
      if (scenes.some((s, i) => i > 0 && t >= s.t0 && t < s.t0 + 0.8)) continue;   // skip crossfades
      const boxes = await p.evaluate(t => { window.BOXES = []; renderFrame(t); const b = window.BOXES; window.BOXES = null; return b; }, t);
      const B = boxes.filter(b => b.a > 0.5 && b.s.trim());
      for (const b of B) if (!b.sub && (b.x0 < 10 || b.x1 > 1910 || b.y0 < 5 || b.y1 > 1075)) issues.push({ t, kind: 'offscreen', a: b.s });
      for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
        const a = B[i], b = B[j], sh = 3;
        const ix = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) - 2 * sh, iy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) - 2 * sh;
        if (ix > 0 && iy > 0) issues.push({ t, kind: a.sub || b.sub ? 'subtitle' : 'overlap', a: a.s, b: b.s });
      }
    }
    // collapse consecutive duplicates into ranges
    const out = [];
    for (const it of issues) {
      const k = it.kind + '|' + it.a + '|' + (it.b || ''), last = out.find(o => o.k === k && it.t - o.t1 <= step * 1.5);
      if (last) last.t1 = it.t; else out.push({ k, kind: it.kind, a: it.a, b: it.b, t0: it.t, t1: it.t });
    }
    fs.writeFileSync(path.join(B, 'overlaps.json'), JSON.stringify(out, null, 1));
    out.forEach(o => console.log(`${o.t0.toFixed(2)}-${o.t1.toFixed(2)}  ${o.kind}: "${o.a}"${o.b ? ' × "' + o.b + '"' : ''}`));
    console.log(out.length, 'issues');
    await browser.close(); return;
  }
  if (args.stills) {
    const dir = args.outdir ? path.resolve(args.outdir) : path.join(B, 'stills'); fs.mkdirSync(dir, { recursive: true });
    const browser = await launch(), p = await page(browser);
    for (const s of args.stills.split(',')) {
      await p.evaluate(t => renderFrame(t), +s);
      await p.screenshot({ path: path.join(dir, `t${(+s).toFixed(1).padStart(6, '0')}.jpg`), type: 'jpeg', quality: 85 });
    }
    await browser.close(); return;
  }
  const from = +(args.from || 0), to = Math.min(+(args.to || tl.total), tl.total);
  const F0 = Math.round(from * fps), F1 = Math.round(to * fps), n = +(args.workers || 2);
  const out = args.out ? path.resolve(args.out) : path.join(B, 'video.mp4');
  const chunk = Math.ceil((F1 - F0) / n), segs = [];
  const jobs = [];
  for (let i = 0; i < n; i++) { const a = F0 + i * chunk, b = Math.min(F1, a + chunk); if (a >= b) break; const s = path.join(B, `seg${i}.mp4`); segs.push(s); jobs.push(segment(a, b, s)); }
  await Promise.all(jobs);
  fs.writeFileSync(path.join(B, 'segs.txt'), segs.map(s => `file '${s}'`).join('\n'));
  await new Promise(r => spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(B, 'segs.txt'), '-c', 'copy', out], { stdio: 'inherit' }).on('close', r));
  for (const f of [...segs, path.join(B, 'segs.txt')]) fs.rmSync(f, { force: true });   // temporary pieces
  console.log('wrote', out);
})();
