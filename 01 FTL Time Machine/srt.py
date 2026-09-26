#!/usr/bin/env python3
"""Write build/subtitles.srt (sentence-level, one cue per script line) for YouTube."""
import json, os
B = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build')
tl = json.load(open(os.path.join(B, 'timeline.json')))
def ts(s):
    ms = int(round(s * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); sec, ms = divmod(ms, 1000)
    return f'{h:02d}:{m:02d}:{sec:02d},{ms:03d}'
out = []
for i, L in enumerate(tl['lines'], 1):
    out.append(f"{i}\n{ts(L['start'])} --> {ts(L['end'] + 0.2)}\n{L['text']}\n")
open(os.path.join(B, 'subtitles.srt'), 'w', encoding='utf-8').write('\n'.join(out))
print('subtitles.srt:', len(out), 'cues')
