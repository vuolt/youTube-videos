#!/usr/bin/env python3
"""Sound for a video: synthesized SFX from build/cues.json, an ambient music
bed, and the voice-over clips placed at their line starts (if recorded).

    python3 engine/audio.py "01 FTL Time Machine"   (make.sh runs this)

Writes <video>/build/sfx.wav, build/music.wav, build/vo.wav and build/mix.wav (48 kHz stereo).
To use a library track instead of the synth bed, drop it in as <video>/music/track.(mp3|wav);
it is looped/trimmed to length and ducked under the voice.
"""
import json, os, glob, subprocess, sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
import wave

from video import resolve

SR = 48000
V = resolve(sys.argv[1] if len(sys.argv) > 1 else '') if __name__ == '__main__' else None
B = os.path.join(V, 'build') if V else None
rng = np.random.default_rng(5)


def write(path, x):
    x = np.clip(x, -1, 1)
    if x.ndim == 1: x = np.stack([x, x], 1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())


def read(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def T(d): return np.arange(int(d * SR)) / SR
def env(n, a, r): t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / r)
def lp(x, f): return sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)
def hp(x, f): return sosfilt(butter(2, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)


# ---------------- SFX ----------------
def s_buzz():
    t = T(0.6); f = np.sign(np.sin(2 * np.pi * 150 * t)) * 0.5 + np.sin(2 * np.pi * 75 * t)
    gate = ((t % 0.3) < 0.2).astype(float)
    return lp(f * gate, 900) * 0.35

def s_ding():
    t = T(1.6); return (np.sin(2 * np.pi * 1318.5 * t) + 0.5 * np.sin(2 * np.pi * 1975.5 * t) + 0.2 * np.sin(2 * np.pi * 2637 * t)) * env(len(t), 0.003, 0.35) * 0.22

def s_tick():
    t = T(0.08); return hp(rng.standard_normal(len(t)), 2500) * env(len(t), 0.0005, 0.012) * 0.35 + np.sin(2 * np.pi * 1800 * t) * env(len(t), 0.001, 0.015) * 0.2

def s_pop():
    t = T(0.18); f = 380 + 700 * np.minimum(1, t / 0.06)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.002, 0.05) * 0.35

def s_blip(): t = T(0.12); return np.sin(2 * np.pi * 988 * t) * env(len(t), 0.002, 0.03) * 0.18

def s_ping():
    t = T(1.4); return (np.sin(2 * np.pi * 1760 * t) + 0.3 * np.sin(2 * np.pi * 2640 * t)) * env(len(t), 0.002, 0.3) * 0.16

def s_whoosh(d=0.9):
    n = int(d * SR); x = rng.standard_normal(n); t = np.arange(n) / SR
    # sweeping band via two filtered layers crossfaded
    lo, hi = bp(x, 300, 1200), bp(x, 1500, 6000)
    u = t / d; shape = np.sin(np.pi * u) ** 2
    return (lo * (1 - u) + hi * u) * shape * 0.5

def s_boom():
    t = T(2.5); f = 70 * np.exp(-t * 2.5) + 38
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.004, 0.7)
    n = lp(rng.standard_normal(len(t)), 400) * env(len(t), 0.002, 0.25)
    return (body * 0.8 + n * 0.5) * 0.7

def s_zap():
    t = T(0.45); f = 2400 * np.exp(-t * 9) + 180
    ph = np.cumsum(f) / SR
    saw = 2 * (ph % 1) - 1
    return lp(saw, 5000) * env(len(t), 0.002, 0.12) * 0.25 + hp(rng.standard_normal(len(t)), 3000) * env(len(t), 0.001, 0.05) * 0.12

def s_glitch():
    n = int(0.5 * SR); x = np.zeros(n); pos = 0
    while pos < n:
        L = int(rng.uniform(0.015, 0.06) * SR)
        if rng.random() > 0.35:
            f = rng.uniform(200, 2400); t = np.arange(min(L, n - pos)) / SR
            seg = np.sign(np.sin(2 * np.pi * f * t)) * 0.5 + rng.standard_normal(len(t)) * 0.3
            x[pos:pos + len(t)] = np.round(seg * 4) / 4
        pos += L
    return lp(x, 7000) * 0.22 * np.linspace(1, 0.3, n)

def s_chime():
    t = T(2.4); out = np.zeros(len(t))
    for i, f in enumerate([587.3, 880, 1174.7, 1760]):
        d = int(i * 0.07 * SR); tt = t[:len(t) - d]
        out[d:] += np.sin(2 * np.pi * f * tt) * env(len(tt), 0.004, 0.6) * (0.5 / (1 + i * 0.4))
    return out * 0.25

def s_riser(d=2.0):
    t = T(d); u = t / d
    f = 180 + 900 * u ** 2
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3
    n = bp(rng.standard_normal(len(t)), 800, 7000) * 0.4
    return (tone + n) * u ** 2 * 0.45 * (1 - np.clip((u - 0.97) / 0.03, 0, 1))

def s_swell():
    t = T(3.0); u = t / 3.0; out = np.zeros(len(t))
    for f in [146.8, 220, 293.7, 349.2]:
        out += np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) + 0.3 * np.sin(2 * np.pi * f * 2.003 * t)
    return lp(out, 1500) * np.sin(np.pi * u) ** 2 * 0.07

def s_steps():
    out = np.zeros(int(2.2 * SR))
    for i in range(4):
        t = T(0.15); th = lp(rng.standard_normal(len(t)), 300) * env(len(t), 0.002, 0.03) + np.sin(2 * np.pi * 90 * t) * env(len(t), 0.002, 0.04)
        d = int(i * 0.55 * SR); out[d:d + len(t)] += th * 0.35
    return out

SFX = {k[2:]: v for k, v in globals().items() if k.startswith('s_')}


def build_sfx(cues, n):
    out = np.zeros(n)
    cache = {}
    for c in cues:
        s = c['s']
        if s not in cache: cache[s] = SFX[s]()
        x = cache[s] * c.get('g', 1.0)
        i = int(c['t'] * SR)
        if i < 0 or i >= n: continue
        m = min(len(x), n - i); out[i:i + m] += x[:m]
    # small room
    ir_n = int(1.1 * SR); ir = rng.standard_normal(ir_n) * np.exp(-np.arange(ir_n) / SR / 0.25)
    ir = lp(ir, 5000); ir /= np.sqrt(np.sum(ir ** 2))
    wet = fftconvolve(out, ir)[:n]
    return out * 0.85 + wet * 0.25


# ---------------- Music bed ----------------
def midi(m): return 440 * 2 ** ((m - 69) / 12)

def build_music(n, scenes):
    # D minor: Dm – Bb – F – C, 8 s per chord; gentle and spacey
    chords = [[50, 57, 62, 65, 69], [46, 53, 58, 62, 65], [41, 53, 57, 60, 65], [48, 55, 60, 64, 67]]
    dur = 8.0; step = int(dur * SR); xf = int(2.0 * SR)
    out = np.zeros(n + step + xf)
    r = np.random.default_rng(11)
    for k, pos in enumerate(range(0, n, step)):
        ch = chords[k % 4]; L = step + xf; t = np.arange(L) / SR
        pad = np.zeros(L)
        for m in ch[1:]:
            f = midi(m)
            for det in (-0.12, 0.12):
                fr = f * 2 ** (det / 12)
                for h in range(1, 6):
                    pad += np.sin(2 * np.pi * fr * h * t + r.uniform(0, 6.28)) / (h ** 1.6)
        pad = lp(pad, 900 + 500 * np.sin(k * 0.7) ** 2) * 0.018
        bass = np.sin(2 * np.pi * midi(ch[0] - 12) * t) * 0.07
        e = np.minimum(1, np.minimum(t / 2.0, (L / SR - t) / 2.0))
        seg = (pad + bass) * e
        # sparse plinks
        for b in range(16):
            if r.random() < 0.35:
                m = ch[r.integers(1, len(ch))] + 12 * r.integers(1, 3)
                tt = np.arange(int(1.5 * SR)) / SR; d = int(b * 0.5 * SR)
                pl = np.sin(2 * np.pi * midi(m) * tt) * np.exp(-tt / 0.35) * 0.025
                seg[d:d + len(pl)] += pl[:max(0, min(len(pl), L - d))]
        out[pos:pos + L] += seg
    out = out[:n]
    ir_n = int(2.5 * SR); ir = r.standard_normal(ir_n) * np.exp(-np.arange(ir_n) / SR / 0.8); ir = lp(ir, 3000); ir /= np.sqrt(np.sum(ir ** 2))
    out = out * 0.6 + fftconvolve(out, ir)[:n] * 0.5
    return out


def main():
    tl = json.load(open(os.path.join(B, 'timeline.json')))
    cues = json.load(open(os.path.join(B, 'cues.json')))
    n = int(tl['total'] * SR)
    sfx = build_sfx(cues, n)

    vo = np.zeros(n); has_vo = False
    for L in tl['lines']:
        p = os.path.join(B, 'vo', f"{L['n']:03d}.wav")
        if tl['mode'] != 'estimate' and os.path.exists(p):
            x = read(p); i = int(L['start'] * SR); m = min(len(x), n - i); vo[i:i + m] += x[:m]; has_vo = True

    lib = sorted(glob.glob(os.path.join(V, 'music', 'track.*')))
    if lib:
        m = read(lib[0]); reps = int(np.ceil(n / len(m))); music = np.tile(m, reps)[:n] * 0.5
    else:
        music = build_music(n, None)

    # duck music under the voice (or under line timings when there is no VO yet)
    act = np.zeros(n)
    for L in tl['lines']:
        a, b = int((L['start'] - 0.15) * SR), int((L['end'] + 0.25) * SR); act[max(0, a):min(n, b)] = 1
    k = int(0.3 * SR); act = np.convolve(act, np.ones(k) / k, 'same')
    duck = 1 - (0.55 if has_vo else 0.25) * act
    fade = np.minimum(1, np.minimum(np.arange(n) / SR / 2.0, (n - np.arange(n)) / SR / 3.5))
    music = music * duck * fade

    write(os.path.join(B, 'sfx.wav'), sfx * 0.9)
    write(os.path.join(B, 'music.wav'), music)
    if has_vo: write(os.path.join(B, 'vo.wav'), vo)
    mix = vo * 1.0 + sfx * 0.55 + music * 0.9
    peak = np.max(np.abs(mix)); mix = mix / max(peak, 1e-9) * 0.89
    write(os.path.join(B, 'mix.wav'), mix)
    print(f'audio: {n / SR:.1f}s, vo={has_vo}, cues={len(cues)}, peak before norm={peak:.2f}')


if __name__ == '__main__':
    main()
