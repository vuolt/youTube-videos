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
- `record.py` + `record.html`: the recording booth for the voice-over (see below).

## Recording the voice-over
The video is timed to the voice, not the other way round: record each line at your own pace, and `./make.sh` re-times every scene and subtitle to your recordings.

**The recording booth** (recommended). From this folder, after running `./make.sh` once so it has the animation to show:
```
python3 record.py
```
It opens in your browser and shows one line at a time, with that line's moment of the animation looping next to it.
- **Space** starts recording; **Space** again saves the take as `vo/023.wav` and moves to the next line. Record a line again to replace it (the previous take is kept in `vo/.previous/`).
- **P** plays the take back, **←/→** move between lines, and the strip at the bottom shows what's done. You can stop any time and carry on later.
- The **Review** tab plays the last build with the script highlighted as it's spoken. **F** flags a line for a retake, **R** jumps back to record it.

Stop the booth with Ctrl+C and run `./make.sh`. It builds fine with lines still missing: those keep their estimated timing.

**Or one take:** record everything in one go as `vo/take.wav` (or `.m4a`), with a clear 2-second pause between lines and no long pauses inside a line. It's split into lines automatically.

Silence at the start and end of each clip is trimmed automatically. For consistent sound, record in one sitting, in a small soft room, at the same distance from the mic. Subtitles go into the video as a switchable track (View → Subtitles in QuickTime); `SUBS=1 ./make.sh` burns them into the picture instead. Upload `build/subtitles.srt` to YouTube as captions.

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
