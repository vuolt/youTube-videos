#!/usr/bin/env python3
"""Build build/timeline.json from script.md.

Timing source, in order of preference:
  1. vo/001.wav, vo/002.wav ... (one file per line; any of wav/m4a/mp3/aif),
     e.g. recorded with record.py. Lines not recorded yet use estimated timing,
     so a half-recorded video still builds.
  2. vo/take.* (one take, lines separated by pauses >= 1.0 s)
  3. estimate from word count (animatic mode)

Each line gets: n, text, start, end (seconds). With real VO, the trimmed
clips are written to build/vo/NNN.wav for audio.py to place.
"""
import json, os, re, subprocess, glob, sys

HERE = os.path.dirname(os.path.abspath(__file__))
B = os.path.join(HERE, 'build')
os.makedirs(os.path.join(B, 'vo'), exist_ok=True)

LEAD = 1.0          # silence before line 1
GAP = 0.45          # pause between lines
SECTION_GAP = 0.9   # extra pause at a section change
TAIL = 4.0          # after last line
WPS = 2.55          # words per second for estimates (~153 wpm)
EXT = ('wav', 'm4a', 'mp3', 'aif', 'aiff', 'flac')


def parse():
    src = open(os.path.join(HERE, 'script.md'), encoding='utf-8').read().split('\n---')[0]
    lines, section = [], ''
    for row in src.splitlines():
        if row.startswith('## '):
            section = row[3:].strip()
        m = re.match(r'^(\d+)\. (.+)$', row)
        if m:
            lines.append({'n': int(m.group(1)), 'text': m.group(2).strip(), 'section': section})
    return lines


def dur(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                          '-of', 'csv=p=0', path], capture_output=True, text=True).stdout
    return float(out.strip())


def trim_to(src, dst, start=None, end=None):
    """Cut [start,end] from src, trim silence at both ends, 48k mono wav."""
    cut = []
    if start is not None:
        cut = ['-ss', f'{start:.3f}', '-to', f'{end:.3f}']
    af = ('silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,'
          'areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *cut, '-i', src, '-af', af,
                    '-ac', '1', '-ar', '48000', dst], check=True)
    return dur(dst)


def find(stem):
    for e in EXT:
        p = os.path.join(HERE, 'vo', f'{stem}.{e}')
        if os.path.exists(p):
            return p
    return None


def split_take(path, n):
    r = subprocess.run(['ffmpeg', '-i', path, '-af', 'silencedetect=noise=-40dB:d=1.0',
                        '-f', 'null', '-'], capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', r)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', r)]
    total = dur(path)
    segs, cur = [], 0.0
    for s, e in zip(starts, ends):
        if s - cur > 0.3:
            segs.append((cur, s))
        cur = e
    if total - cur > 0.3:
        segs.append((cur, total))
    if len(segs) != n:
        sys.exit(f'take.* has {len(segs)} spoken segments but the script has {n} lines. '
                 'Leave a clear 2 s pause between lines (and none inside a line), or record one file per line.')
    return segs


def estimate(L):
    return len(L['text'].split()) / WPS + 0.25


def main():
    lines = parse()
    for old in glob.glob(os.path.join(B, 'vo', '*.wav')):
        os.remove(old)                      # stale clips from an earlier build
    mode = 'estimate'
    durs = {}
    files = {L['n']: find(f"{L['n']:03d}") for L in lines}
    if any(files.values()):
        mode = 'vo-files'
        missing = []
        for L in lines:
            p = files[L['n']]
            if p:
                durs[L['n']] = trim_to(p, os.path.join(B, 'vo', f"{L['n']:03d}.wav"))
            else:
                durs[L['n']] = estimate(L)
                missing.append(L['n'])
        if missing:
            which = ', '.join(map(str, missing)) if len(missing) <= 12 else ', '.join(map(str, missing[:8])) + ', …'
            print(f'{len(missing)} of {len(lines)} lines not recorded yet ({which}); using estimated timing for those')
    elif find('take'):
        mode = 'vo-take'
        p = find('take')
        for L, (a, b) in zip(lines, split_take(p, len(lines))):
            durs[L['n']] = trim_to(p, os.path.join(B, 'vo', f"{L['n']:03d}.wav"), a, b)
    else:
        for L in lines:
            durs[L['n']] = estimate(L)

    t, prev = LEAD, None
    for L in lines:
        if prev is not None:
            t += GAP + (SECTION_GAP if L['section'] != prev else 0)
        L['start'] = round(t, 3)
        t += durs[L['n']]
        L['end'] = round(t, 3)
        prev = L['section']
    total = round(t + TAIL, 3)
    json.dump({'mode': mode, 'total': total, 'lines': lines},
              open(os.path.join(B, 'timeline.json'), 'w'), indent=1)
    print(f'{mode}: {len(lines)} lines, {total/60:.2f} min')


if __name__ == '__main__':
    main()
