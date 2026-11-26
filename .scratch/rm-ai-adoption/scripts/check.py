"""Acceptance checks for the four infographics (spec.md, "Acceptance checks").

Run: python scripts/check.py     (from .scratch/rm-ai-adoption)

Checks 1, 3, 4 and 6 are measured here. Check 2 is measured as far as the
header slots go. Checks 5 and 7 need a person or an agent to look.

How the words are counted: every word a viewer can read in an infographic that
is not inside a drawing (an <svg> element). Icons carry no text. Tooltips
(title attributes) are not visible and are not counted.
"""

from __future__ import annotations

import re
import struct
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "rm-ai-adoption.html"
DIAGRAMS = ["overview-path", "twofold", "proposal-orchestrator", "budget-engine"]
EXPORTS = ["01-overview", "02-twofold", "03-proposal-orchestrator", "04-budget-engine"]

# The light skin of references/style-guide.md, plus white (the `backend` node fill).
PAPER, PAPER2, WHITE = "#f6f1e7", "#ece6d8", "#ffffff"
TINT_ON_PAPER = "#e5e4e6"  # accent-tint, rgba(31,79,216,0.08), composited over paper: the focal boxes
TEXT_COLOURS = {"#14213d", "#46557a", "#55638a", "#1f4fd8"}
MARK_COLOURS = TEXT_COLOURS | {"#c4bfb1", PAPER, PAPER2, WHITE, "none", "transparent", "currentcolor"}
MARK_COLOURS |= {"rgba(31,79,216,0.08)", "rgba(20,33,61,0.05)", "url(#tf-hatch)"}

# "Ask" is itself a defined term, so its entry in the Next step's avoid list is
# not matched here: the word does not appear on any infographic in any case.
SKIP_AVOID = {"ask"}


def avoid_words() -> list[str]:
    words: list[str] = []
    for line in (ROOT / "GLOSSARY.md").read_text(encoding="utf8").splitlines():
        if line.startswith("_Avoid_:"):
            for item in line.split(":", 1)[1].split(","):
                word = re.sub(r"\(.*?\)", "", item).strip().lower()
                if word and word not in SKIP_AVOID:
                    words.append(word)
    return sorted(set(words))


class Infographics(HTMLParser):
    """Splits the page into infographics and, in each, text in and out of drawings."""

    def __init__(self) -> None:
        super().__init__()
        self.items: list[dict] = []
        self.cur: dict | None = None
        self.svg_depth = 0
        self.skip = 0  # inside <title>/<desc>/<style>
        self.colours: set[tuple[str, str]] = set()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "section" and "infographic" in (a.get("class") or ""):
            self.cur = {"id": a.get("id"), "outside": [], "inside": [], "parts": {}, "slots": set(), "open": None}
            self.items.append(self.cur)
        if self.cur is None:
            return
        if tag == "svg":
            if self.svg_depth == 0 and a.get("data-diagram"):
                self.cur["open"] = a["data-diagram"]
                self.cur["parts"][a["data-diagram"]] = 0
            self.svg_depth += 1
        if tag in ("title", "desc", "style"):
            self.skip += 1
        if a.get("data-part") is not None and self.cur["open"]:
            self.cur["parts"][self.cur["open"]] += 1
        if a.get("data-slot"):
            self.cur["slots"].add(a["data-slot"])
        for key in ("fill", "stroke"):
            if a.get(key):
                self.colours.add((tag if tag in ("text", "tspan") else "mark", a[key].replace(" ", "").lower()))

    def handle_endtag(self, tag):
        if self.cur is None:
            return
        if tag in ("title", "desc", "style"):
            self.skip -= 1
        if tag == "svg":
            self.svg_depth -= 1
            if self.svg_depth == 0:
                self.cur["open"] = None
        if tag == "section":
            self.cur = None

    def handle_data(self, data):
        if self.cur is None or self.skip or not data.strip():
            return
        (self.cur["inside"] if self.svg_depth else self.cur["outside"]).append(data.strip())


def words(chunks: list[str]) -> list[str]:
    return [w for w in " ".join(chunks).split() if re.search(r"\w", w)]


def lum(hex_colour: str) -> float:
    r, g, b = (int(hex_colour[i:i + 2], 16) / 255 for i in (1, 3, 5))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def ratio(a: str, b: str) -> float:
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def png_size(path: Path) -> tuple[int, int]:
    head = path.read_bytes()[:24]
    return struct.unpack(">II", head[16:24])


def main() -> int:
    fails: list[str] = []
    ok = lambda msg: print("ok  ", msg)
    bad = lambda msg: (fails.append(msg), print("FAIL", msg))

    # 1. Four infographics, four PNGs at 1920x1080, four standalone diagram sources.
    page = Infographics()
    page.feed(PAGE.read_text(encoding="utf8"))
    (ok if len(page.items) == 4 else bad)(f"check 1: {len(page.items)} infographics in the page")
    for name in EXPORTS:
        p = ROOT / "export" / f"{name}.png"
        if not p.exists():
            bad(f"check 1: export/{name}.png is missing")
        else:
            (ok if png_size(p) == (1920, 1080) else bad)(f"check 1: export/{name}.png is {png_size(p)[0]}x{png_size(p)[1]}")
    for name in DIAGRAMS:
        (ok if (ROOT / "diagrams" / f"{name}.html").exists() else bad)(f"check 1: diagrams/{name}.html exists")

    # 2. Name, promise line, stage and lead on each mechanism infographic.
    for item in page.items[1:]:
        missing = {"name", "promise", "stage", "lead"} - item["slots"]
        (bad if missing else ok)(f"check 2: {item['id']} header slots" + (f" missing {sorted(missing)}" if missing else " present"))

    # 3. Word and part budgets.
    for item in page.items:
        n = len(words(item["outside"]))
        (ok if n <= 60 else bad)(f"check 3: {item['id']} has {n} words outside drawings (max 60)")
        for diagram, parts in item["parts"].items():
            (ok if 0 < parts <= 7 else bad)(f"check 3: {item['id']} / {diagram} has {parts} labelled parts (max 7)")

    # 4. Contrast. The drawings may use only the light-skin colours, so the first part is the part that can
    # fail when a drawing changes; the second restates the contract for those colours on every surface used.
    sources = [PAGE] + [ROOT / "diagrams" / f"{d}.html" for d in DIAGRAMS]
    for src in sources:
        p = Infographics()
        text = src.read_text(encoding="utf8")
        p.feed(text if src == PAGE else f'<section class="infographic" id="x">{text}</section>')
        unknown = {c for kind, c in p.colours if c not in MARK_COLOURS}
        text_off = {c for kind, c in p.colours if kind != "mark" and c not in TEXT_COLOURS}
        css = set(re.findall(r"#[0-9a-fA-F]{6}\b", text))
        unknown |= {c.lower() for c in css} - MARK_COLOURS
        (bad if unknown or text_off else ok)(
            f"check 4: {src.name} uses only light-skin colours"
            + (f"; off-skin {sorted(unknown | text_off)}" if unknown or text_off else "")
        )
    for colour in sorted(TEXT_COLOURS):
        for surface in (PAPER, PAPER2, WHITE, TINT_ON_PAPER):
            r = ratio(colour, surface)
            (ok if r >= 4.5 else bad)(f"check 4: text {colour} on {surface} is {r:.2f}:1 (min 4.5)")

    # 6. Avoid lists, over everything a viewer can read.
    avoid = avoid_words()
    for item in page.items:
        seen = " ".join(item["outside"] + item["inside"]).lower()
        hits = [w for w in avoid if re.search(rf"(?<![\w-]){re.escape(w)}s?(?![\w-])", seen)]
        (bad if hits else ok)(f"check 6: {item['id']} avoid-list words" + (f": {hits}" if hits else ": none"))

    print()
    print("FAILED: " + str(len(fails)) if fails else "All measured checks pass. Checks 5 and 7 are by eye.")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
