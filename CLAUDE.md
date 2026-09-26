# Notes for AI assistants

This repository holds the code for the Hidden Variable YouTube channel, one folder per video.

- Before writing a script, designing scenes or changing how a video looks or sounds, read [STYLE.md](STYLE.md) and follow it, so every video matches the series.
- Shared code lives in `engine/`; a video folder holds only `script.md`, `scenes.js` and a README. `01 FTL Time Machine` is the reference implementation. Reuse `engine/lib.js` helpers rather than building a new pipeline, and keep engine changes backwards compatible with earlier videos.
- This repository is public. Never commit voice recordings, music, rendered videos, credentials or personal information.
