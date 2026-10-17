#!/usr/bin/env python3
"""Require a complete, same-origin Godot export before container packaging."""
from html.parser import HTMLParser
from pathlib import Path
import sys

WEB = Path(__file__).resolve().parents[1] / "web"
GODOT = WEB / "godot"


class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "img", "link"}:
            value = dict(attrs).get("src") or dict(attrs).get("href")
            if value and not value.startswith(("data:", "https:", "http:")):
                self.paths.append(value)


def check():
    required = [GODOT / ("index" + extension) for extension in
                (".html", ".js", ".wasm", ".pck", ".png",
                 ".audio.worklet.js", ".audio.position.worklet.js")]
    required += [GODOT / "bootstrap-1.js", WEB / "godot-bridge.js"]
    missing = [str(path.relative_to(WEB)) for path in required
               if not path.is_file() or path.stat().st_size == 0]
    if not missing:
        refs = References()
        refs.feed((GODOT / "index.html").read_text(encoding="utf-8"))
        for url in refs.paths:
            target = (WEB / url.lstrip("/")) if url.startswith("/") else GODOT / url
            if not target.resolve().is_relative_to(WEB.resolve()) or not target.is_file():
                missing.append(url)
    if missing:
        raise SystemExit("Incomplete Godot Web export: " + ", ".join(missing) +
                         ". Run scripts/export_web.sh with Godot 4.5.1 before building Docker.")
    print("Godot Web export and referenced same-origin assets: OK")


if __name__ == "__main__":
    check()
