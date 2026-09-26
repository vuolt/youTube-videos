#!/bin/bash
# macOS: double-click this file to open the recording booth in your browser.
# Keep this window open while you record; close it (or press Ctrl+C) to stop.
cd "$(dirname "$0")" || exit 1
[ -f .venv/bin/activate ] && source .venv/bin/activate
python3 record.py
