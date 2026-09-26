#!/usr/bin/env python3
"""Shared helpers: find video folders and read their scripts.

A video folder is any folder at the top of the repository that contains a
script.md. Used by the build scripts and the recording booth.

    python3 engine/video.py 01          -> absolute path of the matching video folder
    python3 engine/video.py --title 01  -> file-safe title from its script.md
"""
import os, re, sys

ENGINE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(ENGINE)


def videos():
    """All video folders, sorted by name."""
    out = []
    for name in sorted(os.listdir(ROOT)):
        p = os.path.join(ROOT, name)
        if not name.startswith('.') and os.path.isfile(os.path.join(p, 'script.md')):
            out.append(p)
    return out


def resolve(arg=''):
    """Turn '', a path, or part of a folder name ('01', 'FTL') into a video folder."""
    arg = (arg or '').strip()
    if not arg:
        if os.path.isfile(os.path.join(os.getcwd(), 'script.md')):
            return os.getcwd()
        vs = videos()
        if len(vs) == 1:
            return vs[0]
        raise SystemExit('Which video? Pass its folder, e.g. ./make.sh 01\n  ' + '\n  '.join(os.path.basename(v) for v in vs))
    if os.path.isfile(os.path.join(arg, 'script.md')):
        return os.path.abspath(arg)
    hits = [v for v in videos() if os.path.basename(v).lower().startswith(arg.lower())] or \
           [v for v in videos() if arg.lower() in os.path.basename(v).lower()]
    if len(hits) == 1:
        return hits[0]
    names = '\n  '.join(os.path.basename(v) for v in (hits or videos()))
    raise SystemExit(f'No single video matches "{arg}". Videos:\n  {names}')


def title(video):
    with open(os.path.join(video, 'script.md'), encoding='utf-8') as f:
        for row in f:
            if row.startswith('# '):
                return row[2:].strip()
    return os.path.basename(video)


def file_title(video):
    return re.sub(r'[\\/:*?"<>|]+', '-', title(video)).strip()


def parse(video):
    """The numbered voice-over lines of a script: [{n, text, section}]."""
    src = open(os.path.join(video, 'script.md'), encoding='utf-8').read().split('\n---')[0]
    lines, section = [], ''
    for row in src.splitlines():
        if row.startswith('## '):
            section = row[3:].strip()
        m = re.match(r'^(\d+)\. (.+)$', row)
        if m:
            lines.append({'n': int(m.group(1)), 'text': m.group(2).strip(), 'section': section})
    return lines


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == '--title':
        print(file_title(resolve(a[1] if len(a) > 1 else '')))
    else:
        print(resolve(a[0] if a else ''))
