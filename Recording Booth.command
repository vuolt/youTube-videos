#!/bin/bash
# macOS: double-click this file to open the recording booth in your browser.
# Keep this window open while you record or build; close it to stop.
cd "$(dirname "$0")" || exit 1

fail() { echo; echo "$1"; echo; read -r -p "Press Return to close." _; exit 1; }
for tool in python3 node ffmpeg; do
  command -v "$tool" >/dev/null || fail "$tool is missing. Install it once in Terminal with: brew install python node ffmpeg"
done

# First run only: set up the Python packages and the renderer.
if [ ! -x .venv/bin/python3 ]; then
  echo "First run: installing the Python packages (a minute or two)..."
  python3 -m venv .venv && .venv/bin/python3 -m pip install -r requirements.txt \
    || { rm -rf .venv; fail "Setting up Python failed (see above)."; }
fi
if [ ! -d node_modules/playwright ]; then
  echo "First run: installing the renderer..."
  npm install && npx playwright install chromium || fail "Setting up the renderer failed (see above)."
fi

source .venv/bin/activate
python3 record.py
