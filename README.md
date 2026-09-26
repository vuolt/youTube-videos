# YouTube Videos

The code behind my animated explainer videos. Every frame is drawn in code: each scene is a canvas animation with a `render(t)` function, a headless browser renders it frame by frame, and ffmpeg turns the frames into a video. The sound effects and the background music are synthesized in Python.

The voice-over is mine, recorded separately, so it isn't in here. Without it, the build makes a silent-voice "animatic" timed from the script's word counts, which is enough to watch every animation and try your own changes.

## Videos

| # | Video | Folder |
|---|-------|--------|
| 1 | Every Sci-Fi Shortcut Is Secretly a Time Machine | [`01 FTL Time Machine`](01%20FTL%20Time%20Machine) |

Each folder is self-contained, with its own README and setup steps.

## Try it

You need Node.js, ffmpeg and Python 3. On a Mac with Homebrew:

```
brew install node ffmpeg python
git clone https://github.com/vuolt/youTube-videos.git
cd "youTube-videos/01 FTL Time Machine"
npm install
npx playwright install chromium
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
./make.sh
```

The video lands in `build/`. The fastest way to play is `node render.js --stills 30,90,200` after running `./make.sh` once: it saves single frames at those seconds to `build/stills/`, so you can change a colour or a timing in `scenes.js` and see it in a couple of seconds. The folder's README explains the rest.

## Licence

- **Code** (`.js`, `.py`, `.sh`, `.html` and the config files): [MIT](LICENSE). Use it for anything, including your own videos, as long as you keep the copyright notice.
- **Scripts** (each video's `script.md`, the narration text): [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/). You can read it, share it unchanged for non-commercial purposes with credit, and use it privately to run and experiment with the code. Please don't publish re-rendered or re-voiced versions of the videos.
- **Fonts**: [Poppins](https://github.com/itfoundry/Poppins) is under the SIL Open Font License 1.1 and [DejaVu Sans Mono](https://dejavu-fonts.github.io/) under the Bitstream Vera / DejaVu licence. Their licence files sit next to them in each `fonts/` folder.
- **The finished videos** on YouTube aren't in this repository and remain all rights reserved.

The videos mention films, shows and games by name (Star Trek, Star Wars, Stargate, Halo, Interstellar) for commentary. Those names are trademarks of their owners; this project isn't affiliated with or endorsed by them, and it contains no imagery from them.

© 2026 Vuolt
