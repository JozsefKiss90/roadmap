"""Writes the four standalone diagrams and the page that holds the four infographics.

Run: python scripts/build.py     (from .scratch/rm-ai-adoption)

Output is static: inline CSS and inline SVG, no script. Google Fonts is the only
external request. Icons are Lucide (ISC licence), copied into scripts/icons.json.
Colours and type follow the light skin of references/style-guide.md.
"""

from __future__ import annotations

import base64
import json
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ICONS = json.loads((ROOT / "scripts" / "icons.json").read_text(encoding="utf8"))

PAPER, PAPER2, INK, MUTED, SOFT = "#f6f1e7", "#ece6d8", "#14213d", "#46557a", "#55638a"
RULE, ACCENT, TINT, WHITE = "#c4bfb1", "#1f4fd8", "rgba(31,79,216,0.08)", "#ffffff"
SANS = "'Geist', system-ui, sans-serif"
SERIF = "'Instrument Serif', 'Noto Serif', serif"
MONO = "'Geist Mono', ui-monospace, monospace"
FONTS = ("https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600"
         "&family=Geist+Mono:wght@400;500;600&display=swap")
DASH = "6,5"  # planned or proposed: outline, dashed
FOOT = "Kiss József · [Department] · ELTE · November 2026"


# ---------------------------------------------------------------- primitives

def icon(name: str, x: float = 0, y: float = 0, size: float = 24, colour: str = INK) -> str:
    """One Lucide icon. One stroke weight throughout: 1.75 in the icon's own 24-unit grid."""
    return (f'<svg x="{x}" y="{y}" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{colour}" '
            f'stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICONS[name]}</svg>')


def text(x, y, s, size=20, weight=600, fill=INK, family=SANS, anchor="start", spacing=None, part=False) -> str:
    extra = f' letter-spacing="{spacing}"' if spacing else ""
    extra += ' data-part=""' if part else ""
    return (f'<text x="{x}" y="{y}" fill="{fill}" font-size="{size}" font-weight="{weight}" '
            f'font-family="{family}" text-anchor="{anchor}"{extra}>{escape(s)}</text>')


def sub(x, y, s, anchor="start", fill=MUTED, size=13) -> str:
    return text(x, y, s, size=size, weight=400, fill=fill, family=MONO, anchor=anchor)


def box(x, y, w, h, kind="solid", rx=6) -> str:
    """solid: exists today. planned: outline, dashed. focal: the one accent."""
    mask = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{PAPER}"/>'
    if kind == "planned":
        return mask + (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="none" stroke="{MUTED}" '
                       f'stroke-width="1.5" stroke-dasharray="{DASH}"/>')
    fill, stroke, sw = {"solid": (WHITE, INK, 1.5), "focal": (TINT, ACCENT, 2)}[kind]
    return mask + f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'


def line(d: str, prefix: str, colour=MUTED, marker="arrow", dashed=False, width=1.5) -> str:
    dash = f' stroke-dasharray="{DASH}"' if dashed else ""
    end = f' marker-end="url(#{prefix}{marker})"' if marker else ""
    return f'<path d="{d}" fill="none" stroke="{colour}" stroke-width="{width}"{dash}{end}/>'


def defs(prefix: str, extra: str = "") -> str:
    def m(mid, colour):
        return (f'<marker id="{prefix}{mid}" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">'
                f'<polygon points="0 0, 8 3, 0 6" fill="{colour}"/></marker>')
    return f'<defs>{m("arrow", MUTED)}{m("arrow-accent", ACCENT)}{extra}</defs>'


def legend(y: float, w: float, items: list[tuple[str, str]], prefix: str) -> str:
    """Horizontal key along the foot of a diagram. Not a labelled part."""
    out = [f'<line x1="24" y1="{y - 20}" x2="{w - 24}" y2="{y - 20}" stroke="{RULE}" stroke-width="1"/>']
    x = 24
    for kind, label in items:
        if kind == "solid":
            out.append(f'<rect x="{x}" y="{y - 12}" width="32" height="16" rx="3" fill="{WHITE}" stroke="{INK}" stroke-width="1.5"/>')
        elif kind == "planned":
            out.append(f'<rect x="{x}" y="{y - 12}" width="32" height="16" rx="3" fill="none" stroke="{MUTED}" stroke-width="1.5" stroke-dasharray="{DASH}"/>')
        elif kind == "hatch":
            out.append(f'<rect x="{x}" y="{y - 12}" width="32" height="16" fill="url(#{prefix}hatch)" stroke="{ACCENT}" stroke-width="1.5"/>')
        elif kind == "cobalt":
            out.append(f'<rect x="{x}" y="{y - 12}" width="32" height="16" fill="{ACCENT}"/>')
        elif kind == "focal":
            out.append(f'<rect x="{x}" y="{y - 12}" width="32" height="16" rx="3" fill="{TINT}" stroke="{ACCENT}" stroke-width="2"/>')
        out.append(sub(x + 44, y + 1, label, fill=MUTED, size=14))
        x += 44 + len(label) * 8.7 + 40
    return "".join(out)


def svg(slug: str, w: int, h: int, title: str, desc: str, body: str, prefix: str, extra_defs: str = "") -> str:
    return (f'<svg viewBox="0 0 {w} {h}" width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg" role="img" '
            f'aria-labelledby="{slug}-title {slug}-desc" data-diagram="{slug}">'
            f'<title id="{slug}-title">{escape(title)}</title><desc id="{slug}-desc">{escape(desc)}</desc>'
            f'{defs(prefix, extra_defs)}<rect width="100%" height="100%" fill="{PAPER}"/>{body}</svg>')


# ------------------------------------------------------------- the diagrams

STAGES = [("hammer", "Built"), ("play", "In use"), ("trending-up", "Scaling next")]


def stage_marks(x: float, y: float, current: int, r: float = 16, gap: float = 48) -> str:
    """Three stage marks. Reached: solid. Current: filled. Not reached: dashed outline."""
    out = [f'<line x1="{x}" y1="{y}" x2="{x + 2 * gap}" y2="{y}" stroke="{RULE}" stroke-width="1.5"/>']
    for i, (name, _) in enumerate(STAGES):
        cx = x + i * gap
        if i == current:
            out.append(f'<circle cx="{cx}" cy="{y}" r="{r}" fill="{INK}" stroke="{INK}" stroke-width="1.5"/>')
            colour = PAPER
        elif i < current:
            out.append(f'<circle cx="{cx}" cy="{y}" r="{r}" fill="{PAPER}" stroke="{INK}" stroke-width="1.5"/>')
            colour = INK
        else:
            out.append(f'<circle cx="{cx}" cy="{y}" r="{r}" fill="{PAPER}" stroke="{MUTED}" stroke-width="1.5" stroke-dasharray="4,4"/>')
            colour = MUTED
        out.append(icon(name, cx - r * 0.56, y - r * 0.56, r * 1.12, colour))
    return "".join(out)


def overview_path() -> str:
    W, H = 1824, 400
    steps = [
        ("Choose the call", "binoculars", "Twofold", 1, "user-pen", "Its author"),
        ("Write the proposal", "workflow", "Proposal Orchestrator", 0, "user-pen", "Its author"),
        ("Build the budget", "sheet", "Budget Engine", 0, "users", "Colleagues, with the author's support"),
    ]
    cw, ch, y0, gap = 464, 304, 40, 192
    b = []
    for i in range(2):  # handovers, drawn before the cards
        x1 = 28 + i * (cw + gap) + cw
        mid, y = x1 + gap / 2, y0 + ch / 2
        b.append(line(f"M{x1},{y} H{mid - 36}", "ov-", marker=None))
        b.append(line(f"M{mid + 36},{y} H{x1 + gap - 2}", "ov-"))
        b.append(f'<circle cx="{mid}" cy="{y}" r="36" fill="{PAPER}"/><circle cx="{mid}" cy="{y}" r="36" fill="{WHITE}" stroke="{INK}" stroke-width="1.5"/>')
        b.append(icon("user", mid - 18, y - 18, 36))
        b.append(sub(mid, y + 64, "a person", anchor="middle", size=14) + sub(mid, y + 84, "hands over", anchor="middle", size=14))
    for i, (step, ic, name, cur, lead_ic, lead) in enumerate(steps):
        x = 28 + i * (cw + gap)
        b.append(box(x, y0, cw, ch, "solid", rx=8))
        b.append(text(x + 32, y0 + 60, step, size=40, weight=400, family=SERIF, part=True))
        b.append(f'<line x1="{x + 32}" y1="{y0 + 84}" x2="{x + cw - 32}" y2="{y0 + 84}" stroke="{RULE}" stroke-width="1"/>')
        b.append(icon(ic, x + 32, y0 + 108, 44))
        b.append(text(x + 92, y0 + 140, name, size=28))
        b.append(stage_marks(x + 50, y0 + 204, cur, r=18, gap=52))
        b.append(text(x + 196, y0 + 211, STAGES[cur][1], size=20, weight=500))
        b.append(icon(lead_ic, x + 34, y0 + 244, 30))
        head, _, rest = lead.partition(", ")
        b.append(text(x + 92, y0 + 266, head, size=20, weight=500))
        if rest:
            b.append(sub(x + 92, y0 + 288, rest))
    return svg("overview-path", W, H, "The path: three steps, three mechanisms",
               "A proposal's path in three steps, choose the call, write the proposal and build the budget, each with "
               "one mechanism, its stage and its lead, and a person at each handover between steps.",
               "".join(b), "ov-")


def twofold() -> str:
    W, H = 1240, 620
    hatch = (f'<pattern id="tf-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
             f'<rect width="8" height="8" fill="{PAPER}"/><line x1="0" y1="0" x2="0" y2="8" stroke="{ACCENT}" stroke-width="2.5"/></pattern>')
    b = []
    # The two streams. On offer: cobalt outline with hatching. Awarded: planned until live, so outline and dashed.
    b.append(f'<polygon points="352,152 432,152 432,272 484,272 484,296 408,296 408,176 352,176" fill="url(#tf-hatch)" stroke="{ACCENT}" stroke-width="1.5"/>')
    b.append(f'<polygon points="352,444 408,444 408,324 484,324 484,348 432,348 432,468 352,468" fill="none" stroke="{ACCENT}" stroke-width="1.5" stroke-dasharray="{DASH}"/>')
    b.append(sub(448, 420, "PLANNED", fill=MUTED, size=13))
    # Two jobs leave on the right.
    b.append(line("M756,288 H816 a8,8 0 0 0 8,-8 V172 a8,8 0 0 1 8,-8 H890", "tf-"))
    b.append(line("M756,332 H816 a8,8 0 0 1 8,8 V448 a8,8 0 0 0 8,8 H890", "tf-", dashed=True))
    nodes = [
        (24, 120, 328, "globe", "Funding & Tenders portal", "money on offer"),
        (24, 412, 328, "database", "CORDIS", "money awarded"),
        (892, 120, 324, "calendar-clock", "Weekly monitoring", "by research field"),
        (892, 412, 324, "scale", "Occasional deliberation", "with the funded track record"),
    ]
    for x, y, w, ic, name, s in nodes:
        planned = name == "Occasional deliberation"  # it rests on the awarded half, which is not live
        b.append(box(x, y, w, 88, "planned" if planned else "solid"))
        b.append(icon(ic, x + 16, y + 28, 32, MUTED if planned else INK))
        b.append(text(x + 60, y + 40, name, size=18, part=True))
        b.append(sub(x + 60, y + 64, s))
    b.append(box(484, 236, 272, 148))
    b.append(icon("tags", 604, 256, 32))
    b.append(text(620, 324, "Subject-area tagging", size=20, anchor="middle", part=True))
    b.append(sub(620, 350, "curated by hand", anchor="middle"))
    b.append(legend(584, W, [("hatch", "on offer"), ("cobalt", "awarded, once live"), ("planned", "planned")], "tf-"))
    return svg("twofold", W, H, "Twofold: money on offer and money awarded, joined",
               "Two public sources, the Funding and Tenders portal for money on offer and CORDIS for money awarded, "
               "join through hand-curated subject-area tagging and serve two jobs: weekly monitoring and occasional "
               "deliberation. The awarded stream is planned.",
               "".join(b), "tf-", hatch)


def proposal_orchestrator() -> str:
    W, H = 1240, 620
    b = []
    y = 328
    # A person stands above the chain.
    b.append(f'<path d="M256,180 V156 a8,8 0 0 1 8,-8 H1208 a8,8 0 0 1 8,8 V180" fill="none" stroke="{MUTED}" stroke-width="1.5"/>')
    b.append(f'<line x1="736" y1="112" x2="736" y2="148" stroke="{MUTED}" stroke-width="1.5"/>')
    # The chain, left to right, a gate on every link.
    b.append(line(f"M232,{y} H268", "po-"))
    xs = [284, 340, 396, 452, 508, 564]
    for a, c in zip(xs, xs[1:]):
        b.append(line(f"M{a + 12},{y} H{c - 12}", "po-", marker=None, colour=INK))
        b.append(f'<rect x="{(a + c) / 2 - 2}" y="{y - 12}" width="4" height="24" fill="{INK}"/>')
    b.append(line(f"M576,{y} H646", "po-"))
    b.append(line(f"M786,{y} H846", "po-", colour=ACCENT, marker="arrow-accent", width=2))
    b.append(line(f"M1024,{y} H1086", "po-"))
    b.append(f'<rect x="1048" y="{y - 12}" width="4" height="24" fill="{INK}"/>')
    for cx in xs:
        b.append(f'<circle cx="{cx}" cy="{y}" r="12" fill="{WHITE}" stroke="{INK}" stroke-width="1.5"/>')
    b.append(text(424, y + 56, "A gate on every link", size=18, anchor="middle", part=True))
    b.append(sub(424, y + 80, "only a pass moves on", anchor="middle"))
    # Person.
    b.append(box(456, 40, 560, 72))
    b.append(icon("user", 476, 60, 32))
    b.append(text(524, 84, "A person's override outranks everything", size=20, part=True))
    # Sources.
    b.append(box(24, 232, 208, 192))
    b.append(text(44, 264, "Sources", size=20, part=True))
    for i, (ic, name) in enumerate([("scale", "Funding rules"), ("file-text", "Call documents"), ("folder-open", "Proposal data")]):
        b.append(icon(ic, 44, 284 + i * 44, 24))
        b.append(text(80, 302 + i * 44, name, size=16, weight=500))
    # Budget gate: the focal element.
    b.append(box(648, 256, 136, 144, "focal"))
    b.append(icon("door-closed", 698, 276, 36, ACCENT))
    b.append(text(716, 348, "Budget gate", size=19, anchor="middle", part=True))
    b.append(sub(716, 428, "blocks drafting", anchor="middle", fill=ACCENT) + sub(716, 448, "when it fails", anchor="middle", fill=ACCENT))
    # Drafting, three sections in parallel.
    b.append(box(848, 256, 176, 144))
    b.append(text(936, 296, "Drafting", size=20, anchor="middle", part=True))
    for i in range(3):
        b.append(f'<rect x="872" y="{316 + i * 24}" width="128" height="12" rx="3" fill="{PAPER2}" stroke="{INK}" stroke-width="1"/>')
    b.append(sub(936, 428, "three sections", anchor="middle") + sub(936, 448, "in parallel", anchor="middle"))
    # Proposal.
    b.append(box(1088, 264, 128, 128))
    b.append(icon("file-check", 1134, 284, 36))
    b.append(text(1152, 364, "Proposal", size=20, anchor="middle", part=True))
    b.append(legend(584, W, [("solid", "runs today"), ("focal", "the gate that blocks drafting")], "po-"))
    return svg("proposal-orchestrator", W, H, "Proposal Orchestrator: from sources to a gated proposal",
               "Funding rules, call documents and proposal data enter a chain with a gate on every link. The budget gate "
               "blocks drafting when it fails. Three sections are drafted in parallel and a proposal leaves. A person's "
               "override outranks everything.",
               "".join(b), "po-")


def budget_engine() -> str:
    W, H = 1240, 620
    b = []
    y = 300
    # Private boundary: proposed.
    b.append(f'<rect x="256" y="96" width="600" height="424" rx="8" fill="none" stroke="{MUTED}" stroke-width="1.5" stroke-dasharray="{DASH}"/>')
    b.append(f'<rect x="280" y="80" width="292" height="32" fill="{PAPER}"/>')
    b.append(icon("lock", 292, 84, 24, MUTED))
    b.append(text(326, 103, "Private boundary", size=19, part=True))
    b.append(sub(490, 102, "PROPOSED"))
    # Connectors.
    b.append(line(f"M208,{y} H302", "be-", dashed=True))
    b.append(line(f"M536,{y} H590", "be-", colour=ACCENT, marker="arrow-accent", width=2))
    b.append(line("M708,350 V398", "be-", dashed=True))
    b.append(line(f"M824,{y} H894", "be-"))
    b.append(line(f"M1024,{y} H1086", "be-"))
    # Partner data: intake is proposed.
    b.append(box(24, 250, 184, 100, "planned"))
    b.append(icon("users", 44, 270, 28, MUTED))
    b.append(text(44, 322, "Partner data", size=19, part=True))
    b.append(sub(44, 342, "intake, proposed", size=12))
    # The engine: focal, today.
    b.append(box(304, 228, 232, 144, "focal"))
    b.append(icon("sheet", 402, 248, 36, ACCENT))
    b.append(text(420, 318, "Budget Engine", size=21, anchor="middle", part=True))
    b.append(sub(420, 344, "computes every figure", anchor="middle", fill=ACCENT))
    # Today's output.
    b.append(box(592, 250, 232, 100))
    b.append(icon("file-check", 608, 266, 28))
    b.append(text(648, 290, "Blank workbook", size=19, part=True))
    b.append(sub(608, 330, "built and checked, today"))
    # Proposed: filling and evaluating.
    b.append(box(592, 400, 232, 88, "planned"))
    b.append(text(608, 436, "Filled and evaluated", size=18, part=True))
    b.append(sub(608, 464, "real data, proposed"))
    # A named person approves.
    b.append(box(896, 236, 128, 128))
    b.append(icon("user-check", 942, 256, 36))
    b.append(text(960, 322, "Approves", size=19, anchor="middle", part=True))
    b.append(sub(960, 346, "a named person", anchor="middle", size=12))
    # The funder.
    b.append(box(1088, 250, 128, 100))
    b.append(icon("landmark", 1136, 266, 32))
    b.append(text(1152, 330, "Funder", size=19, anchor="middle", part=True))
    b.append(legend(584, W, [("solid", "today"), ("planned", "proposed"), ("focal", "where every figure is computed")], "be-"))
    return svg("budget-engine", W, H, "Budget Engine: figures by fixed code, approval by a person",
               "The Budget Engine builds and checks a blank planning workbook today. A private boundary, partner data "
               "intake, and filling and evaluating with real data are proposed. A named person approves before anything "
               "reaches the funder.",
               "".join(b), "be-")


# ------------------------------------------------- small drawings on the page

def hosting(slug: str, rows: list[tuple[str, str, str, bool]]) -> str:
    """The hosting statement as a drawing: one row per fact, dashed when planned."""
    W, rh, gap = 520, 52, 8
    H = len(rows) * rh + (len(rows) - 1) * gap + 2
    b = []
    for i, (ic, title, s, planned) in enumerate(rows):
        y = 1 + i * (rh + gap)
        b.append(box(1, y, W - 2, rh, "planned" if planned else "solid"))
        b.append(icon(ic, 14, y + 13, 26, MUTED if planned else INK))
        b.append(text(54, y + 22, title, size=16, part=True))
        b.append(sub(54, y + 42, s, size=13))
    return svg(f"{slug}-hosting", W, H, "Hosting statement", " ".join(f"{t}: {s}." for _, t, s, _ in rows), "".join(b), f"{slug}-hosting-")


def gate_result() -> str:
    W, H = 552, 284
    b = []
    for i, (ic, name, lines, heavy) in enumerate([
        ("circle-check", "Pass", ["the run", "moves on"], False),
        ("octagon-x", "Block", ["the run stops,", "one failure origin named"], True),
    ]):
        x = 1 + i * 282
        b.append(f'<rect x="{x}" y="1" width="268" height="{H - 2}" rx="8" fill="{WHITE}" stroke="{INK}" stroke-width="{3 if heavy else 1.5}"/>')
        b.append(icon(ic, x + 102, 36, 64))
        b.append(text(x + 134, 152, name, size=40, weight=400, family=SERIF, anchor="middle", part=True))
        for j, l in enumerate(lines):
            b.append(sub(x + 134, 196 + j * 24, l, anchor="middle", size=15))
    return svg("gate-result", W, H, "One gate result", "A gate either passes and the run moves on, or blocks: the run stops and names one failure origin.", "".join(b), "gr-")


# ------------------------------------------------------------------ the page

BENEFIT_ICON = {"Automate": "cog", "Simplify": "filter", "Accelerate": "gauge", "Innovate": "lightbulb", "Adapt": "refresh-cw"}
RULE_ICON = ["user-check", "calculator", "quote", "octagon-alert"]
RULES_FULL = [
    "A person decides; the AI advises.",
    "Figures are computed by fixed code, never by the model.",
    "Every claim cites its source and date.",
    "A declared failure beats a made-up result.",
]


def hicon(name: str, size: int = 24, colour: str = INK) -> str:
    return icon(name, 0, 0, size, colour)


def header(m: dict) -> str:
    cur = m["stage_index"]
    marks = (f'<svg width="136" height="40" viewBox="0 0 136 40" aria-hidden="true">{stage_marks(20, 20, cur, r=18, gap=48)}</svg>')
    descriptor = f'<p class="descriptor">{escape(m["descriptor"])}</p>' if m.get("descriptor") else ""
    return f'''<header class="head">
      <div class="mark">{hicon(m["icon"], 48)}</div>
      <div class="id"><h2 data-slot="name">{escape(m["name"])}</h2>{descriptor}</div>
      <p class="promise" data-slot="promise">{escape(m["promise"])}</p>
      <div class="meta">
        <div class="stage" data-slot="stage" title="Stage: {escape(m["stage_full"])}">{marks}<span><b>{escape(m["stage"][0])}</b> {escape(m["stage"][1])}</span></div>
        <div class="lead" data-slot="lead" title="Lead: {escape(m["lead_full"])}">{hicon(m["lead_icon"], 30)}<span>{escape(m["lead"])}</span></div>
      </div>
    </header>'''


def benefits(items: list[tuple[str, str, str, bool]]) -> str:
    cells = []
    for name, short, full, planned in items:
        cls = "benefit planned" if planned else "benefit"
        cells.append(f'<div class="{cls}" title="{escape(full)}{" (planned)" if planned else ""}">'
                     f'{hicon(BENEFIT_ICON[name], 36, MUTED if planned else INK)}<div><b>{name}</b><span>{escape(short)}</span></div></div>')
    return f'<div class="benefits">{"".join(cells)}</div>'


def rules(items: list[tuple[str, str]]) -> str:
    cells = [f'<div class="rule" title="{escape(full)}">{hicon(RULE_ICON[i], 32)}<span>{escape(short)}</span></div>'
             for i, (short, full) in enumerate(items)]
    return f'<div class="rules">{"".join(cells)}</div>'


def mechanism(m: dict, diagram: str) -> str:
    return f'''<section class="infographic" id="{m["id"]}">
    {header(m)}
    <div class="middle">
      <div class="diagram">{diagram}</div>
      <div class="side">{benefits(m["benefits"])}<div class="shot">{m["shot"]}</div></div>
    </div>
    <div class="bottom">
      {rules(m["rules"])}
      <div class="hosting">{m["hosting"]}</div>
      <div class="next" title="Next step: {escape(m["next_full"])}">{hicon("arrow-right", 32, MUTED)}<span>{escape(m["next"])}</span></div>
    </div>
    <p class="foot">{FOOT}</p>
  </section>'''


def overview(diagram: str) -> str:
    bens = "".join(f'<div class="ben">{hicon(ic, 34)}<b>{name}</b></div>' for name, ic in BENEFIT_ICON.items())
    rule_short = ["A person decides", "Fixed code computes every figure", "Every claim cites its source", "A declared failure beats a made-up result"]
    rule_cells = "".join(f'<div class="rule" title="{escape(full)}">{hicon(RULE_ICON[i], 32)}<span>{escape(s)}</span></div>'
                         for i, (s, full) in enumerate(zip(rule_short, RULES_FULL)))
    asks = [
        ("Make the Proposal Orchestrator official", "Official departmental standing for the Proposal Orchestrator."),
        ("Approve the workstation: no budget", "The workstation as its approved host. It is already available; this is approval to use it, not budget."),
        ("Colleague time for the Budget Engine", "Colleague time to use and develop the Budget Engine."),
    ]
    ask_cells = "".join(f'<div class="ask" title="{escape(full)}"><i></i><span>{escape(s)}</span></div>' for s, full in asks)
    return f'''<section class="infographic overview" id="overview">
    <header class="ohead">
      <h1>AI in research management: three mechanisms, one strategy</h1>
      <div class="bens">{bens}</div>
    </header>
    <div class="path">{diagram}</div>
    <div class="obottom">
      <div class="behave"><h3>How every mechanism behaves</h3><div class="rules">{rule_cells}</div></div>
      <div class="asks">{ask_cells}</div>
    </div>
    <p class="foot">{FOOT}</p>
  </section>'''


CSS = f"""
*, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ background: {PAPER2}; color: {INK}; font-family: {SANS}; padding: 40px 0; }}
.infographic {{ width: 1920px; height: 1080px; margin: 0 auto 40px; background: {PAPER}; padding: 36px 48px 0;
  display: flex; flex-direction: column; overflow: hidden; }}
.infographic svg {{ display: block; flex: none; }}
.head {{ display: flex; align-items: center; gap: 24px; height: 112px; flex: none; }}
.mark {{ width: 84px; height: 84px; border: 1.5px solid {INK}; border-radius: 10px; background: {WHITE};
  display: flex; align-items: center; justify-content: center; flex: none; }}
.id {{ flex: none; }}
h2 {{ font-family: {SERIF}; font-weight: 400; font-size: 68px; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; }}
.descriptor {{ font-family: {MONO}; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; color: {MUTED}; margin-top: 8px; white-space: nowrap; }}
.promise {{ font-family: {SERIF}; font-style: italic; font-size: 36px; line-height: 1.1; color: {MUTED}; flex: 1;
  padding-left: 24px; border-left: 1.5px solid {RULE}; }}
.meta {{ display: flex; flex-direction: column; gap: 10px; flex: none; }}
.stage, .lead {{ display: flex; align-items: center; gap: 14px; font-size: 20px; font-weight: 500; white-space: nowrap; }}
.stage b {{ font-weight: 600; }}
.lead svg {{ margin: 0 3px; }}
.middle {{ display: flex; gap: 32px; height: 620px; margin-top: 16px; flex: none; }}
.diagram {{ width: 1240px; flex: none; }}
.side {{ flex: 1; display: flex; flex-direction: column; gap: 20px; min-width: 0; }}
.benefits {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; flex: none; }}
.benefit {{ display: flex; align-items: center; gap: 14px; height: 146px; padding: 0 18px; background: {WHITE};
  border: 1.5px solid {INK}; border-radius: 8px; }}
.benefit.planned {{ background: none; border: 1.5px dashed {MUTED}; color: {MUTED}; }}
.benefit b {{ display: block; font-size: 24px; font-weight: 600; line-height: 1.2; }}
.benefit span {{ display: block; font-size: 18px; line-height: 1.25; color: {MUTED}; margin-top: 4px; }}
.shot {{ flex: 1; min-height: 0; display: flex; }}
.shot img {{ width: 100%; height: 100%; object-fit: contain; background: {WHITE}; border: 1.5px solid {INK}; border-radius: 8px; }}
.shot .pending {{ flex: 1; border: 1.5px dashed {MUTED}; border-radius: 8px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 12px; color: {MUTED}; font-family: {MONO}; font-size: 15px;
  letter-spacing: 0.1em; text-transform: uppercase; }}
.bottom {{ display: flex; gap: 32px; align-items: stretch; height: 190px; margin-top: 24px; padding-top: 20px;
  border-top: 1.5px solid {RULE}; flex: none; }}
.rules {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px 28px; flex: 1; align-content: center; }}
.rule {{ display: flex; align-items: center; gap: 14px; font-size: 21px; font-weight: 500; line-height: 1.2; }}
.hosting {{ width: 520px; flex: none; display: flex; align-items: center; }}
.next {{ width: 300px; flex: none; border: 1.5px dashed {MUTED}; border-radius: 8px; padding: 0 20px; display: flex;
  align-items: center; gap: 14px; font-family: {SERIF}; font-size: 28px; line-height: 1.12; }}
.foot {{ margin-top: auto; height: 44px; line-height: 44px; font-family: {MONO}; font-size: 13px; letter-spacing: 0.08em; color: {MUTED}; flex: none; }}
.ohead {{ flex: none; }}
h1 {{ font-family: {SERIF}; font-weight: 400; font-size: 68px; line-height: 1.05; letter-spacing: -0.01em; }}
.bens {{ display: flex; gap: 56px; margin-top: 28px; }}
.ben {{ display: flex; align-items: center; gap: 12px; font-size: 26px; }}
.ben b {{ font-weight: 600; }}
.path {{ margin-top: 56px; flex: none; }}
.obottom {{ display: flex; gap: 48px; margin-top: 56px; padding-top: 36px; border-top: 1.5px solid {RULE}; height: 312px; flex: none; }}
.behave {{ flex: 1; }}
h3 {{ font-family: {SERIF}; font-weight: 400; font-size: 40px; line-height: 1; margin-bottom: 36px; }}
.behave .rules {{ gap: 32px 32px; }}
.behave .rule {{ font-size: 25px; }}
.asks {{ counter-reset: ask; width: 700px; flex: none; border: 2px solid {ACCENT}; border-radius: 8px; background: {WHITE}; padding: 0 28px;
  display: flex; flex-direction: column; justify-content: center; gap: 26px; }}
.ask {{ display: flex; align-items: center; gap: 18px; font-size: 28px; font-weight: 600; line-height: 1.15; }}
.ask i::before {{ counter-increment: ask; content: counter(ask); }}
.ask i {{ font-style: normal; font-family: {MONO}; font-size: 18px; font-weight: 600; width: 40px; height: 40px; border-radius: 50%;
  border: 2px solid {ACCENT}; color: {ACCENT}; display: flex; align-items: center; justify-content: center; flex: none; }}
@media print {{ body {{ background: none; padding: 0; }} .infographic {{ margin: 0; break-after: page; }} }}
"""


def standalone(slug: str, eyebrow: str, title: str, drawing: str, width: int) -> str:
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{escape(title)}</title>
  <link href="{FONTS}" rel="stylesheet">
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: {SANS}; background: {PAPER}; color: {INK}; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 3rem 2rem; }}
    .frame {{ max-width: {width}px; width: 100%; }}
    .diagram-container {{ width: 100%; overflow-x: auto; }}
    .eyebrow {{ font-family: {MONO}; font-size: 0.72rem; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase; color: {MUTED}; margin-bottom: 0.5rem; }}
    h1 {{ font-family: {SERIF}; font-size: 2rem; font-weight: 400; letter-spacing: -0.02em; line-height: 1.15; margin-bottom: 1.5rem; }}
    svg {{ width: 100%; height: auto; min-width: {width}px; display: block; }}
    @media print {{ .diagram-container {{ overflow-x: visible; }} svg {{ min-width: 0; }} }}
  </style>
</head>
<body>
  <div class="frame">
    <p class="eyebrow">{escape(eyebrow)}</p>
    <h1>{escape(title)}</h1>
    <div class="diagram-container">
      {drawing}
    </div>
  </div>
</body>
</html>
'''


def page(sections: list[str]) -> str:
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1920">
  <title>RM AI adoption strategy</title>
  <link href="{FONTS}" rel="stylesheet">
  <style>{CSS}</style>
</head>
<body>
  {chr(10).join(sections)}
</body>
</html>
'''


def main() -> None:
    drawings = {
        "overview-path": ("Process · RM AI adoption strategy", "The path: three steps, three mechanisms", overview_path(), 1824),
        "twofold": ("Data flow · Twofold", "Money on offer and money awarded, joined for two jobs", twofold(), 1240),
        "proposal-orchestrator": ("Process · Proposal Orchestrator", "From sources to a gated proposal", proposal_orchestrator(), 1240),
        "budget-engine": ("Architecture · Budget Engine", "Figures by fixed code, approval by a person", budget_engine(), 1240),
    }
    for slug, (eyebrow, title, drawing, width) in drawings.items():
        (ROOT / "diagrams" / f"{slug}.html").write_text(standalone(slug, eyebrow, title, drawing, width), encoding="utf8", newline="\n")

    shot = base64.b64encode((ROOT / "assets" / "budget-engine-workbook.png").read_bytes()).decode()
    mechanisms = [
        {
            "id": "twofold", "icon": "binoculars", "name": "Twofold",
            "descriptor": "European research funding, on offer and awarded",
            "promise": "See the call. See who has been funded.",
            "stage_index": 1, "stage": ("In use:", "open calls"), "stage_full": "In use, for open calls",
            "lead_icon": "user-pen", "lead": "Its author", "lead_full": "Its author",
            "benefits": [
                ("Simplify", "In one place", "Calls and track record in one place", False),
                ("Accelerate", "By research field", "Weekly monitoring by research field", False),
                ("Innovate", "Cites data", "An assistant that cites the data", False),
                ("Adapt", "What changed", "\"What changed\" on watched calls", True),
            ],
            "shot": f'<div class="pending" title="Capture of the open-calls view: neither deployed address served the app when this was built.">{hicon("image", 40, MUTED)}Open-calls view pending</div>',
            "rules": [
                ("Informs, never decides", "It informs the decision to commit proposal effort and never makes it."),
                ("Counts from data", "Counts and sums come from the data, not from the assistant."),
                ("Source and date", "Every figure answers \"says who, as of when\"."),
                ("Empty: a finding", "An empty result is shown as a finding with its scope."),
            ],
            "hosting": hosting("twofold", [
                ("globe", "A web app over public funding data", "Funding & Tenders portal, CORDIS", False),
                ("file-x", "Holds no proposal data", "public sources only", False),
            ]),
            "next": "Track record live", "next_full": "The funded track record goes live",
        },
        {
            "id": "proposal-orchestrator", "icon": "workflow", "name": "Proposal Orchestrator",
            "promise": "From sources to a gated proposal draft.",
            "stage_index": 0, "stage": ("Built:", "tested on 2 MSCA proposals"), "stage_full": "Built; tested on 2 MSCA proposals",
            "lead_icon": "user-pen", "lead": "Its author", "lead_full": "Its author",
            "benefits": [
                ("Automate", "Sources to draft", "Sources to a gated draft", False),
                ("Accelerate", "Three parallel sections", "Three sections drafted in parallel", False),
                ("Innovate", "No made-up results", "Gates that block a made-up result", False),
                ("Adapt", "Rules as sources", "New call rules enter as a source", False),
            ],
            "shot": gate_result(),
            "rules": [
                ("Person outranks all", "A person's override outranks every rule and every agent."),
                ("Fixed-code budgets", "Unit-cost budgets are derived by fixed code from published rates."),
                ("Sources ranked by authority", "Sources are ranked by authority; a lower one never overrides a higher one."),
                ("Failed gate stops run", "A failed gate stops the run and names one failure origin."),
            ],
            "hosting": hosting("proposal-orchestrator", [
                ("monitor", "The department's workstation, today", "calls Claude for language work", False),
                ("calculator", "Gates and unit-cost budget", "never call a model", False),
                ("cpu", "Local models, same workstation", "32 GB VRAM, 128 GB DDR5 · planned", True),
            ]),
            "next": "Department-wide: 5+ proposals in parallel",
            "next_full": "Becomes the department's working instrument for 5+ proposals in parallel (planned workload)",
        },
        {
            "id": "budget-engine", "icon": "sheet", "name": "Budget Engine",
            "promise": "Every figure computed, every budget approved by a person.",
            "stage_index": 0, "stage": ("Built:", "blank planning workbooks"), "stage_full": "Built, for blank planning workbooks",
            "lead_icon": "users", "lead": "Colleagues, with the author's support", "lead_full": "Colleagues, with the author's support",
            "benefits": [
                ("Automate", "Built and checked", "Workbook built and checked", False),
                ("Simplify", "Data captured once", "Partner data captured once", True),
                ("Accelerate", "Rebuild on change", "Rebuild when partners change", True),
                ("Adapt", "New guide, new profile", "A new Programme Guide becomes a new profile", True),
            ],
            "shot": f'<img src="data:image/png;base64,{shot}" alt="A blank Rate Table from a planning workbook the Budget Engine built: one row per beneficiary, with empty cells for a person to fill.">',
            "rules": [
                ("Named person approves", "Only a named person approves and submits a budget."),
                ("Model never calculates", "The model interprets and explains; it never calculates a figure."),
                ("Findings cite rules", "Every finding cites the rule it rests on."),
                ("Checks pass first", "A workbook is delivered only after its checks pass."),
            ],
            "hosting": hosting("budget-engine", [
                ("laptop", "Runs locally, today", "a person enters all data", False),
                ("cloud", "One private AWS account, one EU region", "no public internet path · proposed", True),
                ("lock", "Prompts not used to train models", "inside that account · proposed", True),
            ]),
            "next": "Private AWS, real partner data",
            "next_full": "Private deployment on AWS that reads real partner data",
        },
    ]
    sections = [overview(drawings["overview-path"][2])]
    for m, slug in zip(mechanisms, ["twofold", "proposal-orchestrator", "budget-engine"]):
        sections.append(mechanism(m, drawings[slug][2]))
    (ROOT / "rm-ai-adoption.html").write_text(page(sections), encoding="utf8", newline="\n")
    print("built", len(sections), "infographics and", len(drawings), "diagrams")


if __name__ == "__main__":
    main()
