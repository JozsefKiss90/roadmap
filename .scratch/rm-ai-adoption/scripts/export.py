"""Exports each infographic of rm-ai-adoption.html as a 1920x1080 PNG.

Run: python scripts/export.py     (from .scratch/rm-ai-adoption; needs Chrome and network for the fonts)

Each infographic is written alone to a temporary page and captured by headless
Chrome at a 1920x1080 window, so the PNG is exactly the infographic.
"""

from __future__ import annotations

import re
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BROWSERS = [r"C:\Program Files\Google\Chrome\Application\chrome.exe", r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"]
NAMES = ["01-overview", "02-twofold", "03-proposal-orchestrator", "04-budget-engine"]


def main() -> None:
    chrome = next((p for p in BROWSERS if Path(p).exists()), None)
    if chrome is None:
        raise SystemExit("No Chrome or Edge found at: " + ", ".join(BROWSERS))
    html = (ROOT / "rm-ai-adoption.html").read_text(encoding="utf8")
    head = html.split("<body>")[0]
    sections = re.findall(r'<section class="infographic.*?</section>', html, re.S)
    assert len(sections) == len(NAMES), len(sections)
    (ROOT / "export").mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        for name, section in zip(NAMES, sections):
            one = Path(tmp) / f"{name}.html"
            one.write_text(head + "<body style=\"padding:0;margin:0\"><style>.infographic{margin:0}</style>" + section + "</body></html>", encoding="utf8")
            out = ROOT / "export" / f"{name}.png"
            subprocess.run([chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                            "--window-size=1920,1080", "--virtual-time-budget=10000", f"--user-data-dir={tmp}/profile",
                            f"--screenshot={out}", one.as_uri()], check=True, capture_output=True, timeout=120)
            print("wrote", out.relative_to(ROOT))


if __name__ == "__main__":
    main()
