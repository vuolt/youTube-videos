#!/usr/bin/env bash
# Build a video end to end. Pass its folder, or the start of its name:
#   ./make.sh 01                   full render, with a switchable subtitle track
#   SUBS=1 ./make.sh 01            burn the subtitles into the picture instead
#   FROM=300 TO=420 ./make.sh 01   render just a section, for quick checks
#   WORKERS=6 ./make.sh 01         render 6 frames in parallel (default 2)
# From inside a video folder, ../make.sh builds that video.
# Needs: node + playwright (Chromium), ffmpeg, python3 with numpy + scipy.
set -euo pipefail
E="$(cd "$(dirname "$0")" && pwd)/engine"
V="$(python3 "$E/video.py" "${1:-}")"
OUT="build/$(python3 "$E/video.py" --title "$V").mp4"
cd "$V"
echo "Building: $(basename "$V")"
python3 "$E/timeline.py" "$V"
node "$E/render.js" --video "$V" --cues
python3 "$E/audio.py" "$V"
python3 "$E/srt.py" "$V"
SUBS=${SUBS:-0}
node "$E/render.js" --video "$V" --subs "$SUBS" --workers "${WORKERS:-2}" ${FROM:+--from $FROM} ${TO:+--to $TO} --out build/picture.mp4
SS=${FROM:-0}; DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 build/picture.mp4)
ffmpeg -v error -y -i build/picture.mp4 -ss "$SS" -t "$DUR" -i build/mix.wav -i build/subtitles.srt \
  -map 0:v -map 1:a -map 2:s -af loudnorm=I=-15:TP=-1.5:LRA=11 -c:v copy -c:a aac -b:a 192k -ar 48000 \
  -c:s mov_text -metadata:s:s:0 language=eng -shortest -movflags +faststart "$OUT"
echo "done: $(basename "$V")/$OUT"
