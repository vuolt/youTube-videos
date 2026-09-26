# YouTube Videos

The code behind my animated explainer videos. Every frame is drawn in code: each scene is a canvas animation with a `render(t)` function, a headless browser renders it frame by frame, and ffmpeg turns the frames into a video. The sound effects and the background music are synthesized in Python.

The voice-over is mine, recorded separately, so it isn't in here. Without it, the build makes a silent-voice "animatic" timed from the script's word counts, which is enough to watch every animation and try your own changes.

## Videos

| # | Video | Folder |
|---|-------|--------|
| 1 | Every Sci-Fi Shortcut Is Secretly a Time Machine | [`01 FTL Time Machine`](01%20FTL%20Time%20Machine) |

The look, sound and script conventions every video follows are in [STYLE.md](STYLE.md).

## How it's organised

- **A video folder** (`01 FTL Time Machine/`) holds only what's unique to that video: `script.md` (the narration, one numbered line per recording, plus fact-check notes and sources) and `scenes.js` (its animations). Recordings go in its `vo/` folder and renders in its `build/` folder; neither is in the repository.
- **`engine/`** is shared by every video: the drawing helpers and scene engine (`lib.js`), the frame renderer (`render.js`), timing (`timeline.py`), sound (`audio.py`), subtitles (`srt.py`), the recording booth page and the fonts.
- **`make.sh`** builds a video, and **`record.py`** is the recording booth.

Every animation is tied to a script line (`K(n, f)` = f of the way through line n), so when the voice changes, every scene and subtitle re-times itself.

## Try it

You need Node.js, ffmpeg and Python 3. On a Mac with Homebrew:

```
brew install node ffmpeg python
git clone https://github.com/vuolt/youTube-videos.git
cd youTube-videos
npm install
npx playwright install chromium
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
./make.sh 01
```

`./make.sh 01` builds the video whose folder starts with "01" and writes it to that folder's `build/`. Other options:

```
WORKERS=6 ./make.sh 01           # render 6 frames in parallel (about your CPU cores minus two)
FROM=330 TO=420 ./make.sh 01     # just seconds 330–420, for a quick check
SUBS=1 ./make.sh 01              # burn the subtitles into the picture
node engine/render.js --video "01 FTL Time Machine" --stills 30,90,200   # single frames to build/stills/
node engine/render.js --video "01 FTL Time Machine" --check              # overlapping or off-screen text
```

A full render takes several minutes per minute of video on a laptop, so `--stills` is the fastest way to play: change a colour or a timing in `scenes.js` and look at a frame in a couple of seconds (after one full `./make.sh` run).

## Recording the voice-over

```
python3 record.py
```

The recording booth opens in your browser. Pick the video you're working on, and it shows one script line at a time, with that line's moment of the animation looping next to it (run `./make.sh` once first, so there's an animation to show).

- **Space** starts recording; **Space** again saves the take as `vo/023.wav` and moves to the next line. Recording a line again replaces it; the previous take is kept in `vo/.previous/`.
- **P** plays the take back, **←/→** move between lines, and the strip at the bottom shows what's done. Stop any time and carry on later: it picks up at the first unrecorded line.
- The **Review** tab plays the last build with the script highlighted as it's spoken. **F** flags a line for a retake, **R** jumps back to record it.

Then stop the booth (Ctrl+C) and run `./make.sh 01`. It also builds with lines still missing: those keep their estimated timing. Silence at the start and end of each take is trimmed automatically.

Alternatively, record everything in one go as `vo/take.wav` (or `.m4a`) with a clear 2-second pause between lines; it's split into lines automatically.

Subtitles go into the video as a switchable track, and `build/subtitles.srt` is the file to upload to YouTube as captions.

## Music

By default the build synthesizes a quiet ambient bed. To use a library track instead (for example from the YouTube Audio Library), save it as `music/track.mp3` inside the video's folder. It's looped to the video's length and lowered automatically under the voice.

## Licence

- **Code** (`.js`, `.py`, `.sh`, `.html` and the config files): [MIT](LICENSE). Use it for anything, including your own videos, as long as you keep the copyright notice.
- **Scripts** (each video's `script.md`, the narration text): [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/). You can read it, share it unchanged for non-commercial purposes with credit, and use it privately to run and experiment with the code. Please don't publish re-rendered or re-voiced versions of the videos.
- **Fonts**: [Poppins](https://github.com/itfoundry/Poppins) is under the SIL Open Font License 1.1 and [DejaVu Sans Mono](https://dejavu-fonts.github.io/) under the Bitstream Vera / DejaVu licence. Their licence files sit next to them in `engine/fonts/`.
- **The finished videos** on YouTube aren't in this repository and remain all rights reserved.

The videos mention films, shows and games by name (Star Trek, Star Wars, Stargate, Halo, Interstellar) for commentary. Those names are trademarks of their owners; this project isn't affiliated with or endorsed by them, and it contains no imagery from them.

© 2026 Vuolt
