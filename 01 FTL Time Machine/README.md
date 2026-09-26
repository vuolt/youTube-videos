# Video 1: Every Sci-Fi Shortcut Is Secretly a Time Machine

The whole video is code. The script lines drive the timing, so once you record, every scene re-times itself to your voice.

## Files
- `script.md`: the voice-over script (69 numbered lines), fact-check notes, and the references to paste into the YouTube description. **Edit lines here**, then re-run the build.
- `scenes.js`: all 9 scenes, drawn on a canvas with `render(t)`. Every animation is tied to a script line (`K(n, f)` = f of the way through line n).
- `lib.js`: drawing helpers (stars, galaxy, captions, clocks, ship, stick figures).
- `timeline.py`: works out when each line starts, using your recordings if they're in `vo/`, otherwise estimated from word count.
- `render.js`: Playwright/Chromium renders every frame and ffmpeg encodes it. `node render.js --check` lists any text that overlaps other text or the subtitles.
- `audio.py`: synthesized sound effects, an ambient music bed, your voice-over, and ducking.
- `srt.py`: writes `build/subtitles.srt` for YouTube.
- `make.sh`: runs all of the above.

## Recording the voice-over
Put your files in `vo/` using either option:
1. **One file per line:** `vo/001.wav` … `vo/069.wav` (wav, m4a, mp3, aif and flac all work).
2. **One take:** `vo/take.wav`, with a clear 2-second pause between lines and no long pauses inside a line.

Silence at the start and end of each clip is trimmed automatically. Subtitles go into the video as a switchable track (View → Subtitles in QuickTime); `SUBS=1 ./make.sh` burns them into the picture instead. Upload `build/subtitles.srt` to YouTube as captions.

## Music
By default the build synthesizes an ambient bed. To use a YouTube Audio Library track instead, save it as `music/track.mp3`. It's looped to the video's length and lowered automatically under your voice.

Without any recordings in `vo/`, the build times every line from its word count and makes a silent-voice animatic, so you can run everything without recording anything.

## Rendering
You need Node.js, ffmpeg and Python 3. One-time setup, from this folder (on a Mac, `brew install node ffmpeg python` first):
```
npm install
npx playwright install chromium
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```
Every render, from this folder:
```
source .venv/bin/activate
WORKERS=6 ./make.sh                 # full video → build/Every Sci-Fi Shortcut Is Secretly a Time Machine.mp4
FROM=330 TO=420 ./make.sh           # just seconds 330–420, for a quick check
node render.js --stills 30,90,200   # single frames to build/stills/ (after one make.sh run)
```
`WORKERS` is how many frames render in parallel; use roughly your CPU core count minus two. A full render takes a while (several minutes per minute of video on a laptop), so use `FROM`/`TO` or `--stills` while you experiment.

## Licence
The code is MIT-licensed (see [LICENSE](../LICENSE)). The narration in `script.md` is licensed [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/). The fonts keep their own licences: Poppins under the SIL Open Font License 1.1 (`fonts/OFL-Poppins.txt`) and DejaVu Sans Mono under the Bitstream Vera / DejaVu licence (`fonts/LICENSE-DejaVu.txt`).
