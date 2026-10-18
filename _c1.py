# generate_spritesheets.py
# build one animated spritesheet per character/entity type.

from pathlib import Path
import math
import json

OUT = Path(__file__).resolve().parent / "assets"
BUILD = Path(__file__).resolve().parent / "build"


def _tooth(cx, cy, r, angle_deg):
    a = math.radians(angle_deg)
    return cx + r * math.cos(a), cy + r * math.sin(a)


def _directed_arc(cx, cy, r, a0, a1, large=0):
    x0, y0 = _tooth(cx, cy, r, a0 - 0.1)
    x1, y1 = _tooth(cx, cy, r, a1 + 0.1)
    return "M %.2f %.2f L %.2f %.2f A %.2f %.2f 0 %d 1 %.2f %.2f Z" % (cx, cy, x0, y0, r, r, large, x1, y1)


def pacman_mouth(radius, open_deg, fill):
    mid = 90 - open_deg / 2
    em = 90 + open_deg / 2
    part1 = "<path fill=#08111f d=\"" + _directed_arc(0, 0, radius, -em, -mid) + "\" />"
    part2 = "<path fill=" + fill + " d=\"" + _directed_arc(0, 0, radius, mid, em) + "\" />"
    return part1 + part2


def pacman_states_sheet():
    rows = []
    for name, open_deg, bg in [
        ("closed", 0, "#08111f"),
        ("awake", 24, "#ffd84d"),
        ("focused", 48, "#ff9b50"),
        ("scared", 12, "#ff70b5"),
    ]:
        rows.append('<g class="state-' + name + '">' + pacman_mouth(48, open_deg, bg) + "</g>")
    return "\n".join(rows)


def pacman_actions_sheet():
    frames = []
    for i in range(8):
        ang = i * 45
        offset = ang - 45
        frames.append(
            "<g class=\"action-chomp-0" + str(i) + "\">"
            + "<circle cx=0 cy=0 r=48 fill=#ffd84d />"
            + "<path fill=#08111f d=\"" + _directed_arc(0, 0, 48, -60, -30) + "\" />"
            + "<path fill=#ff9b50 d=\"" + _directed_arc(0, 0, 48, 30, 60) + "\" />"
            + "<circle cx=11 cy=-16 r=4 fill=#172a50 />"
            + "<circle cx=-11 cy=-16 r=4 fill=#172a50 />"
            + '<animateTransform attributeName=transform type=rotate from="' + str(offset) + " 0 0\" to=\"" + str(ang) + " 0 0\" dur=0.18s repeatCount=indefinite/>"
            + "</g>"
        )
    return "\n".join(frames)


def pacman_types_sheet():
    skins = [
        ("gold", "#ffd94d", "#ffb44d"),
        ("cyan", "#35d7ea", "#12d8e7"),
        ("rose", "#ff71bd", "#ff5876"),
        ("mint", "#61e5b2", "#12b886"),
    ]
    out = []
    for name, body, edge in skins:
        out.append(
            '<g class="type-' + name + '">'
            + "<circle cx=0 cy=0 r=48 fill=" + body + " stroke=" + edge + " stroke-width=4 />"
            + "<circle cx=0 cy=0 r=44 fill=" + body + " opacity=0.25 />"
            + "</g>"
        )
    return "\n".join(out)
