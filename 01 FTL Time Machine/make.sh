#!/usr/bin/env bash
# Build the video end to end.
#   ./make.sh            full render with a switchable subtitle track
#   SUBS=1 ./make.sh     burn subtitles into the picture (default: switchable subtitle track)
#   FROM=300 TO=420 ./make.sh   render just a section, for quick checks
# Needs: node + playwright (Chromium), ffmpeg, python3 with numpy + scipy.
set -euo pipefail
cd "$(dirname "$0")"
python3 timeline.py
node render.js --cues
python3 audio.py
python3 srt.py
SUBS=${SUBS:-0}   # 1 = burn subtitles into the picture; default adds them as a switchable track
node render.js --subs "$SUBS" --workers "${WORKERS:-2}" ${FROM:+--from $FROM} ${TO:+--to $TO} --out build/picture.mp4
SS=${FROM:-0}; DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 build/picture.mp4)
ffmpeg -v error -y -i build/picture.mp4 -ss "$SS" -t "$DUR" -i build/mix.wav -i build/subtitles.srt \
  -map 0:v -map 1:a -map 2:s -af loudnorm=I=-15:TP=-1.5:LRA=11 -c:v copy -c:a aac -b:a 192k -ar 48000 \
  -c:s mov_text -metadata:s:s:0 language=eng -shortest -movflags +faststart \
  "build/Every Sci-Fi Shortcut Is Secretly a Time Machine.mp4"
echo "done: build/Every Sci-Fi Shortcut Is Secretly a Time Machine.mp4"
