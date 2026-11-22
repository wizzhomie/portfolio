#!/usr/bin/env python3
"""Pixel illustrations for the eight expertise cards.

Each icon is drawn on a 16x16 grid with primitives, rendered to a contact sheet
for checking, and emitted as compact SVG paths (one path per colour).
"""
from PIL import Image, ImageDraw

GRID = 16
SCALE = 12
COL = {"a": (255, 87, 66), "w": (233, 233, 233), "d": (74, 74, 74), ".": None}
BG = (31, 31, 31)


class Grid:
    def __init__(self):
        self.g = [["." for _ in range(GRID)] for _ in range(GRID)]

    def px(self, x, y, c):
        if 0 <= x < GRID and 0 <= y < GRID:
            self.g[y][x] = c

    def rect(self, x, y, w, h, c, fill=True):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                if fill:
                    self.px(xx, yy, c)
                else:
                    if xx in (x, x + w - 1) or yy in (y, y + h - 1):
                        self.px(xx, yy, c)

    def line(self, x0, y0, x1, y1, c):
        dx, dy = abs(x1 - x0), abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx - dy
        while True:
            self.px(x0, y0, c)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 > -dy:
                err -= dy
                x0 += sx
            if e2 < dx:
                err += dx
                y0 += sy

    def dotted(self, x0, y0, x1, y1, c, every=2):
        pts = []
        dx, dy = abs(x1 - x0), abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx - dy
        while True:
            pts.append((x0, y0))
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 > -dy:
                err -= dy
                x0 += sx
            if e2 < dx:
                err += dx
                y0 += sy
        for i, (px, py) in enumerate(pts):
            if i % every == 0:
                self.px(px, py, c)


def icon_architecture():
    g = Grid()
    # blueprint frame with a parent block and two children
    g.rect(2, 1, 12, 14, "d", fill=False)
    g.rect(5, 3, 6, 3, "a")
    g.line(8, 6, 8, 8, "w")
    g.line(4, 8, 12, 8, "w")
    g.line(4, 8, 4, 10, "w")
    g.line(12, 8, 12, 10, "w")
    g.rect(2, 10, 4, 3, "w")
    g.rect(10, 10, 4, 3, "w")
    return g


def icon_document():
    g = Grid()
    g.rect(3, 1, 10, 14, "w", fill=False)
    for y in (4, 6, 8, 10, 12):
        g.rect(5, y, 6 if y < 10 else 4, 1, "d")
    g.rect(5, 4, 6, 1, "a")
    for x, y in ((1, 1), (14, 1), (1, 14), (14, 14)):
        g.rect(x - 1 if x > 1 else x, y - 1 if y > 1 else y, 2, 2, "a")
    return g


def icon_backend():
    g = Grid()
    for y in (2, 7, 12):
        g.rect(2, y, 12, 3, "w", fill=False)
        g.rect(4, y + 1, 5, 1, "d")
        g.px(11, y + 1, "a")
    return g


def stamp(g, rows, x0=0, y0=0, flip_colors=None):
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != ".":
                g.px(x0 + i, y0 + j, (flip_colors or {}).get(ch, ch))


def icon_agents():
    g = Grid()
    g.rect(6, 6, 4, 4, "a")
    for x, y in ((1, 1), (12, 1), (1, 12), (12, 12)):
        g.rect(x, y, 3, 3, "w")
    g.line(4, 4, 5, 5, "d"); g.line(11, 4, 10, 5, "d")
    g.line(4, 11, 5, 10, "d"); g.line(11, 11, 10, 10, "d")
    return g


def icon_llm():
    g = Grid()
    g.rect(2, 2, 12, 8, "w", fill=False)
    g.rect(2, 2, 12, 1, "w")
    g.px(4, 10, "w"); g.px(4, 11, "w"); g.px(5, 11, "w")
    g.px(5, 5, "a"); g.px(7, 5, "a"); g.px(9, 5, "a")
    g.px(5, 7, "d"); g.px(7, 7, "d")
    return g


def icon_interface():
    g = Grid()
    g.rect(1, 2, 11, 9, "w", fill=False)
    g.rect(1, 2, 11, 1, "w")
    for x in (3, 4, 5):
        g.px(x, 3, "a")
    g.rect(3, 6, 3, 1, "d")
    g.rect(3, 8, 2, 1, "d")
    stamp(g, [
        "a...",
        "aa..",
        "aaa.",
        "aaaa",
        "aaa.",
        "a.a.",
    ], 7, 5)
    return g


def icon_logic():
    g = Grid()
    stamp(g, [
        "...a...",
        "..aaa..",
        ".aaaaa.",
        "aaaaaaa",
        ".aaaaa.",
        "..aaa..",
        "...a...",
    ], 4, 1)
    g.line(7, 8, 7, 10, "w")
    g.line(3, 10, 11, 10, "w")
    g.line(3, 10, 3, 11, "d")
    g.line(11, 10, 11, 11, "d")
    g.rect(1, 12, 4, 3, "a")
    g.rect(10, 12, 4, 3, "d")
    return g


def icon_rnd():
    g = Grid()
    for x, h in ((0, 3), (3, 6), (6, 9)):
        g.rect(x, 14 - h, 3, h, "a" if x == 6 else "w")
    g.line(0, 14, 15, 14, "d")
    stamp(g, [
        ".wwww..",
        "w....w.",
        "w....w.",
        "w....w.",
        "w....w.",
        ".wwww..",
        "......w",
        ".......w",
    ], 9, 1)
    return g


ICONS = [
    ("System architecture", icon_architecture),
    ("Multi-agent delivery", icon_agents),
    ("Document AI", icon_document),
    ("LLM engineering", icon_llm),
    ("Interface & motion", icon_interface),
    ("Business logic", icon_logic),
    ("Backend & infrastructure", icon_backend),
    ("R&D & evaluation", icon_rnd),
]


def svg_paths(g):
    """One path per colour, runs merged horizontally."""
    out = {}
    for c in "awd":
        cmds = []
        for y in range(GRID):
            x = 0
            while x < GRID:
                if g.g[y][x] == c:
                    run = 0
                    while x + run < GRID and g.g[y][x + run] == c:
                        run += 1
                    cmds.append(f"M{x} {y}h{run}v1h-{run}z")
                    x += run
                else:
                    x += 1
        if cmds:
            out[c] = "".join(cmds)
    return out


def render_sheet(path):
    pad, label_h = 26, 30
    cols = 4
    cell = GRID * SCALE + pad
    w = cols * cell + pad
    rows = (len(ICONS) + cols - 1) // cols
    h = rows * (cell + label_h) + pad
    img = Image.new("RGB", (w, h), (21, 21, 21))
    d = ImageDraw.Draw(img)
    for i, (name, fn) in enumerate(ICONS):
        g = fn()
        cx = pad + (i % cols) * cell
        cy = pad + (i // cols) * (cell + label_h)
        d.rectangle([cx - 6, cy - 6, cx + GRID * SCALE + 5, cy + GRID * SCALE + 5], fill=BG)
        for y in range(GRID):
            for x in range(GRID):
                c = COL[g.g[y][x]]
                if c:
                    d.rectangle([cx + x * SCALE, cy + y * SCALE,
                                 cx + x * SCALE + SCALE - 1, cy + y * SCALE + SCALE - 1], fill=c)
        d.text((cx, cy + GRID * SCALE + 8), name, fill=(200, 200, 200))
    img.save(path)
    print("sheet", img.size)


if __name__ == "__main__":
    render_sheet("/tmp/icons-sheet.png")
    frag = []
    for name, fn in ICONS:
        paths = svg_paths(fn())
        body = "".join(f'<path class="{c}" d="{d}"/>' for c, d in paths.items())
        frag.append(f'<svg class="art" viewBox="0 0 {GRID} {GRID}" shape-rendering="crispEdges" aria-hidden="true">'
                    f'{body}</svg>')
    open("/tmp/icons.html", "w").write("\n".join(frag))
    print("svg bytes:", sum(len(f) for f in frag))
