#!/usr/bin/env python3
"""Recording booth for the voice-over.

    python3 record.py            # opens http://localhost:8765 in your browser

Shows one script line at a time, with that moment of the animation looping
next to it. Space records, Space again saves the take as vo/NNN.wav and moves
on to the next line. The previous take of a line is kept in vo/.previous/.
The Review tab plays the last full build with the script highlighted as it's
spoken, so you can flag lines to re-record.

After recording, ./make.sh re-times the whole video to your voice. It works
with some lines still missing too (they keep their estimated timing).

Standard library only; needs ffprobe (part of ffmpeg) for video durations.
"""
import argparse, glob, json, os, re, shutil, subprocess, sys, threading, webbrowser
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
B = os.path.join(HERE, 'build')
VO = os.path.join(HERE, 'vo')
BOOTH = os.path.join(B, 'booth')
sys.path.insert(0, HERE)
from timeline import parse  # noqa: E402  (the script is the single source of lines)

WORKLET = """
class Tap extends AudioWorkletProcessor {
  process(inputs) { const ch = inputs[0] && inputs[0][0]; if (ch) this.port.postMessage(ch.slice(0)); return true; }
}
registerProcessor('tap', Tap);
"""


def duration(path):
    try:
        out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                             capture_output=True, text=True, timeout=20).stdout.strip()
        return float(out)
    except Exception:
        return None


def matching_pair(video, tl_path):
    """(video, timeline) if the video was rendered from that timeline, else None."""
    if not (os.path.exists(video) and os.path.exists(tl_path)):
        return None
    tl = json.load(open(tl_path))
    d = duration(video)
    if d is None or abs(d - tl['total']) > 1.5 or os.path.getmtime(video) < os.path.getmtime(tl_path):
        return None
    return tl


def refresh_preview():
    """Snapshot build/picture.mp4 + its timeline, so a rebuild in progress can't break the preview."""
    os.makedirs(BOOTH, exist_ok=True)
    src_v, src_t = os.path.join(B, 'picture.mp4'), os.path.join(B, 'timeline.json')
    dst_v, dst_t = os.path.join(BOOTH, 'preview.mp4'), os.path.join(BOOTH, 'preview.json')
    tl = matching_pair(src_v, src_t)
    if tl and (not os.path.exists(dst_v) or os.path.getmtime(src_v) > os.path.getmtime(dst_v)):
        shutil.copy2(src_v, dst_v)
        json.dump(tl, open(dst_t, 'w'))
    return json.load(open(dst_t)) if os.path.exists(dst_v) and os.path.exists(dst_t) else None


def final_video():
    """The newest full build (with voice) and its timeline, for the Review tab."""
    cands = [p for p in glob.glob(os.path.join(B, '*.mp4'))
             if os.path.basename(p) not in ('picture.mp4',) and not re.match(r'seg\d+\.mp4$', os.path.basename(p))]
    if not cands:
        return None, None
    v = max(cands, key=os.path.getmtime)
    tl = matching_pair(v, os.path.join(B, 'timeline.json'))
    return (v, tl) if tl else (None, None)


def takes():
    out = {}
    for p in glob.glob(os.path.join(VO, '[0-9][0-9][0-9].*')):
        m = re.match(r'(\d{3})\.', os.path.basename(p))
        if m:
            out[int(m.group(1))] = {'mtime': os.path.getmtime(p), 'file': os.path.basename(p)}
    return out


class Booth(BaseHTTPRequestHandler):
    server_version = 'Booth/1.0'
    protocol_version = 'HTTP/1.1'

    def log_message(self, fmt, *args):
        pass

    def send_json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def send_bytes(self, body, ctype):
        self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, path, ctype):
        """Serve a file with HTTP Range support (browsers need it to seek in video)."""
        if not path or not os.path.exists(path):
            return self.send_error(404)
        size = os.path.getsize(path)
        start, end = 0, size - 1
        rng = self.headers.get('Range')
        m = re.match(r'bytes=(\d*)-(\d*)$', rng or '')
        if m and (m.group(1) or m.group(2)):
            if m.group(1):
                start = int(m.group(1))
                end = int(m.group(2)) if m.group(2) else size - 1
            else:
                start = max(0, size - int(m.group(2)))
            end = min(end, size - 1)
            if start > end:
                self.send_response(416)
                self.send_header('Content-Range', f'bytes */{size}')
                self.end_headers()
                return
            self.send_response(206)
            self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        else:
            self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Length', str(end - start + 1))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        with open(path, 'rb') as f:
            f.seek(start)
            left = end - start + 1
            try:
                while left > 0:
                    chunk = f.read(min(1 << 20, left))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    left -= len(chunk)
            except (BrokenPipeError, ConnectionResetError):
                pass  # the browser cancelled the request while seeking; normal

    def do_GET(self):
        path = urlparse(self.path).path
        if path in ('/', '/index.html'):
            return self.send_file(os.path.join(HERE, 'record.html'), 'text/html; charset=utf-8')
        if path == '/worklet.js':
            return self.send_bytes(WORKLET.encode(), 'text/javascript')
        if path == '/api/state':
            prev = refresh_preview()
            fv, ftl = final_video()
            lines = parse()
            pt = {L['n']: L for L in prev['lines']} if prev else {}
            ft = {L['n']: L for L in ftl['lines']} if ftl else {}
            tk = takes()
            return self.send_json({
                'title': open(os.path.join(HERE, 'script.md'), encoding='utf-8').readline().lstrip('# ').strip(),
                'lines': [{'n': L['n'], 'text': L['text'], 'section': L['section'],
                           'preview': [pt[L['n']]['start'], pt[L['n']]['end']] if L['n'] in pt else None,
                           'final': [ft[L['n']]['start'], ft[L['n']]['end']] if L['n'] in ft else None,
                           'take': tk.get(L['n'])} for L in lines],
                'preview': bool(prev),
                'final': os.path.basename(fv) if fv else None,
                'finalMtime': os.path.getmtime(fv) if fv else None,
                'finalMode': ftl['mode'] if ftl else None,
            })
        m = re.match(r'/fonts/([\w-]+\.ttf)$', path)
        if m:
            return self.send_file(os.path.join(HERE, 'fonts', m.group(1)), 'font/ttf')
        if path == '/preview.mp4':
            return self.send_file(os.path.join(BOOTH, 'preview.mp4'), 'video/mp4')
        if path == '/final.mp4':
            return self.send_file(final_video()[0], 'video/mp4')
        m = re.match(r'/vo/(\d{3})$', path)
        if m:
            t = takes().get(int(m.group(1)))
            return self.send_file(os.path.join(VO, t['file']) if t else None, 'audio/wav' if t and t['file'].endswith('.wav') else 'audio/mpeg')
        self.send_error(404)

    def do_POST(self):
        m = re.match(r'/api/take/(\d{3})$', urlparse(self.path).path)
        n = int(self.headers.get('Content-Length') or 0)
        if not m or n <= 44 or n > 200 * 1024 * 1024:
            return self.send_error(400)
        data = self.rfile.read(n)
        if data[:4] != b'RIFF' or data[8:12] != b'WAVE':
            return self.send_error(400, 'expected a WAV file')
        num = m.group(1)
        os.makedirs(os.path.join(VO, '.previous'), exist_ok=True)
        for old in glob.glob(os.path.join(VO, f'{num}.*')):      # keep the last take of this line, just in case
            os.replace(old, os.path.join(VO, '.previous', os.path.basename(old)))
        tmp = os.path.join(VO, f'.{num}.wav.part')
        with open(tmp, 'wb') as f:
            f.write(data)
        os.replace(tmp, os.path.join(VO, f'{num}.wav'))
        self.send_json({'ok': True, 'take': takes().get(int(num))})


def main():
    ap = argparse.ArgumentParser(description='Recording booth for the voice-over.')
    ap.add_argument('--port', type=int, default=8765)
    ap.add_argument('--no-browser', action='store_true')
    a = ap.parse_args()
    os.makedirs(VO, exist_ok=True)
    srv = ThreadingHTTPServer(('127.0.0.1', a.port), Booth)
    url = f'http://localhost:{a.port}'
    print(f'Recording booth: {url}   (Ctrl+C to stop)')
    if not refresh_preview():
        print('No animation preview yet: run ./make.sh once so the booth can show each line\'s animation.')
    if not a.no_browser:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped. Next: ./make.sh to build the video with your voice.')


if __name__ == '__main__':
    main()
