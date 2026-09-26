# Hidden Variable: house style

Every video on the channel should feel like part of the same series. This file records the decisions behind video 1 so later videos keep the same look, sound and voice. If a new video needs something new (a new colour role, a new kind of diagram), add it here, so the next one inherits it.

Video 1 (`01 FTL Time Machine`) is the reference implementation. When this file and the code disagree, the code in `lib.js` is the source of truth for exact values.

## 1. What every video is

- **One hidden variable per video:** the one detail nobody mentions, which changes how you see the whole topic. The video builds up to it, reveals it, and shows why it matters.
- **Plain language:** no equations and no jargon. If a technical term is unavoidable, say it once and explain it with a picture. Every idea gets a visual and an everyday example.
- **Honest framing:** say exactly what science shows and what it doesn't. "Physicists think X is very unlikely" is not "X is proven impossible". Name open questions as open.
- **Researched:** every factual claim is checked against a primary source, and the sources are listed in the video description.
- **Length:** about 8–10 minutes, around 1,300 spoken words.

## 2. The script (`script.md`)

- The script is code: `timeline.py` reads it, so the format matters.
  - `## Section name` headings split the video into sections (with a slightly longer pause between them).
  - Each spoken line is `N. Text` on its own line, numbered from 1. One line is one sentence or two short ones, about 5–20 words.
  - Everything after a line containing only `---` is notes and isn't spoken: a **Fact-check notes** section and a **References for the video description** section.
- **Structure that worked:**
  1. **Cold open (about 30–45 s):** a concrete, relatable mini-story that sets up the question. Video 1: a text message from your future self.
  2. **The common belief:** what everyone assumes, stated fairly.
  3. **The build:** the everyday rule, then its surprising consequence, one step per section.
  4. **The reveal:** the hidden variable, said in one short sentence that can stand on screen alone.
  5. **"So which one gives?":** the honest state of the science, including the minority views.
  6. **Close:** come back to the cold-open image, and end on one memorable reframing line.
- **Writing for the ear:** short sentences, active voice, no parentheses. Write numbers as they're said ("three hundred thousand kilometres"). Put credits in the line itself ("In 1988, Kip Thorne and his colleagues showed…").
- **Other people's work:** films, shows and games may be named in words. Never use their imagery, logos, characters or music. Everything on screen is our own design.

## 3. Visual identity

**Frame:** 1920×1080, 30 fps. Everything is drawn on a canvas by `render(t)`.

**Background:** deep navy radial gradient (`#0c1330` in the centre fading to `#04050c`), a slow drift of twinkling stars, and a soft vignette. Use `background()` and `vignette()` from `lib.js`. Topics that aren't about space keep the same navy base; the stars can be dimmed (`starAlpha`) or swapped for a subtle grid.

**Colour roles.** The meaning stays the same in every video:

| Role | Colour | Used for |
|------|--------|----------|
| Background | `#04050c` / `#0a0f24` | base, card fills |
| Text | `#eef2ff` | main captions |
| Dim | `#8a93b8` | secondary lines, labels, inactive items |
| Faint | `#3a4266` | grid lines, scaffolding |
| **Cyan** `light` | `#5ce1ff` | the rule, the normal case, the "safe" path; the channel's signature colour |
| **Amber** `ftl` | `#ffb547` | the thing that challenges the rule, the new idea |
| **Pink** `bad` | `#ff4f8b` | paradox, danger, contradiction, "this breaks" |
| **Green** `good` | `#7dffb2` | confirmed, tested, agreed |

Only one or two accent colours should be on screen at a time. Glow (`glow:` 12–20) is reserved for the single most important element in a shot.

**Type:**
- Poppins for everything (300 Light, 400 Regular, 500 Medium, 700 Bold). DejaVu Sans Mono Bold for numbers that change (clocks, counters, dates).
- The key line of a section: 80–96 px, bold, in its colour role, with glow.
- Standard captions: 50–70 px, bold, white, with key words highlighted in their colour role (`hl:`).
- Secondary line: about 44 px in dim.
- Chips (rounded pills with a coloured outline): 30–42 px, for names, dates, sources and labels ("Kip Thorne & colleagues, 1988", "TRICK 1 · move space, not the ship").
- Subtitles: 38 px Medium, white, in a rounded dark bar (62 % black) at the bottom.

**Layout:**
- One idea on screen at a time; a caption is replaced, not stacked.
- Top captions sit at about y = 80–150; big statements sit centred.
- Keep the bottom ~200 px free of important text, because the subtitle bar lives there.
- Every video must pass `node render.js --check`, which flags overlapping text, text running off-screen, and anything colliding with the subtitles.

**Illustration style:** flat, geometric and clean. Thin glowing lines, dots, rings, rounded cards (24 px radius, `rgba(14,20,46,0.88)` fill, thin outline). People are simple stick figures (`person()`); the ship is our own arrowhead design (`ship()`); clocks are `clockPanel()`. Reuse and extend these helpers instead of inventing a new drawing style per video.

## 4. Motion

- Every animation is timed to the script with `K(n, f)` ("f of the way through line n"), never to fixed seconds, so a change of voice re-times everything.
- Captions pop in word by word (0.09 s per word, rising 24 px as they fade in).
- Easing: cubic in-out (`ease`) for moves, `easeOut` for entrances, `back` for a small pop on chips. Fades take 0.3–0.6 s. Scenes crossfade over 0.7 s.
- Nothing moves without a reason. Hold a shot still long enough to read it.
- Everything is deterministic (seeded `rng`), so a re-render gives the same frames.

## 5. Sound

- **Voice:** one human narrator for every video, recorded line by line in the recording booth (`record.py`). Same mic, same room and the same distance from the mic every time, so episodes sound alike. Natural pace; the video is re-timed to the voice, never the other way round.
- **Sound effects:** synthesized in `audio.py`, triggered by cues listed next to each scene: `whoosh`, `pop`, `blip`, `tick`, `ping`, `ding`, `chime`, `zap`, `glitch`, `riser`, `swell`, `boom`, `buzz`, `steps`. At most one effect per visual beat, and never under a key line.
- **Music:** a quiet ambient pad (D minor, 8 s chords) synthesized by `audio.py`, or a licensed library track in `music/track.mp3` (never committed). It's automatically lowered under the voice.
- **Loudness:** the final mix is normalised to −15 LUFS.

## 6. Subtitles

Sentence-level, one cue per script line, written by `srt.py`. They're a switchable track in the MP4, and `build/subtitles.srt` is uploaded to YouTube. Burn them in only for Shorts (`SUBS=1`).

## 7. Starting a new video

1. Copy the previous video's folder to `NN Short Name` (for example `02 Why The Sky Is Dark`).
2. Keep the engine files as they are: `lib.js`, `render.js`, `timeline.py`, `audio.py`, `srt.py`, `record.py`, `record.html`, `make.sh`, `index.html`, `fonts/`, `package.json`, `requirements.txt`, `.gitignore`.
3. Replace `script.md` with the new script, following section 2.
4. Replace the scenes in `scenes.js` (keep the engine block at the bottom). New drawing helpers that could serve later videos go in `lib.js`.
5. Update the folder's `README.md` and add the video to the table in the top-level README.
6. Run `./make.sh` once for the animatic, record the voice with `python3 record.py`, run `./make.sh` again, and run `node render.js --check` before the final render.
