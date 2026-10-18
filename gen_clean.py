"""
generate_spritesheets.py â€“ build one animated spritesheet per character/entity type.

Directory layout (written to assets/):
  assets/character/<entity>/states/   <-- idle / run / cast / die / stun / pulse
  assets/character/<entity>/actions/ <-- chase / scatter / eat / glom / pounce
  assets/character/<entity>/types/   <-- [material / species / class] variants

Each sub-folder keeps ONE SVG spritesheet so Phaser can load it as a single
texture atlas.  Files are emitted as SVG (layered, animated, editable) and
optionally baked to PNG (for the game body).  Keep this script as the single
source of truth for every state/action/type so the game code never has to guess
filenames.
"""

from __future__ import annotations
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "assets"
BUILD = ROOT / "build"


def _tooth(cx: float, cy: float, r: float, angle_deg: float) -> tuple[float, float]:
    a = math.radians(angle_deg)
    return cx + r * math.cos(a), cy + r * math.sin(a)


def _directed_arc(cx: float, cy: float, r: float, a0: float, a1: float, large: int = 0) -> str:
    x0, y0 = _tooth(cx, cy, r, a0 - 0.1)
    x1, y1 = _tooth(cx, cy, r, a1 + 0.1)
    return f"M {cx:.2f} {cy:.2f} L {x0:.2f} {y0:.2f} A {r:.2f} {r:.2f} 0 {large} 1 {x1:.2f} {y1:.2f} Z"


def pacman_mouth(radius: float, open_deg: float, fill: str) -> str:
    """SVG path for a Pac-Man with a closed/open mouth."""
    mid = 90 - open_deg / 2
    em = 90 + open_deg / 2
    return (
        f'<path fill="#08111f" d="{_directed_arc(0, 0, radius, -em, -mid)}" />'
        f'<path fill="{fill}" d="{_directed_arc(0, 0, radius, mid, em)}" />'
    )


def ghost_eyes(cx: float, cy: float, r: float) -> str:
    return (
        f'<circle cx="{cx - r * 0.35:.2f}" cy="{cy - r * 0.2:.2f}" r="{r * 0.09:.2f}" fill="#172a50" />'
        f'<circle cx="{cx + r * 0.35:.2f}" cy="{cy - r * 0.2:.2f}" r="{r * 0.09:.2f}" fill="#172a50" />'
    )


def pacman_states_sheet() -> str:
    rows = []
    for name, open_deg, bg in [
        ("closed", 0, "#08111f"),
        ("awake", 24, "#ffd84d"),
        ("focused", 48, "#ff9b50"),
        ("scared", 12, "#ff70b5"),
    ]:
        rows.append(f"<g class=\"state-{name}\">{pacman_mouth(48, open_deg, bg)}</g>")
    return "\n".join(rows)


def pacman_actions_sheet() -> str:
    frames = []
    for i in range(8):
        ang = i * 45
        offset = ang - 45
        frames.append(
            f'<g class="action-chomp-0{i}">'
            f'<circle cx="0" cy="0" r="48" fill="#ffd84d" />'
            f'<path fill="#08111f" d="{_directed_arc(0, 0, 48, -60, -30)}" />'
            f'<path fill="#ff9b50" d="{_directed_arc(0, 0, 48, 30, 60)}" />'
            f'<circle cx="11" cy="-16" r="4" fill="#172a50" />'
            f'<circle cx="-11" cy="-16" r="4" fill="#172a50" />'
            f'<animateTransform attributeName="transform" type="rotate" '
            f'from="{offset} 0 0" to="{ang} 0 0" dur="0.18s" repeatCount="indefinite"/>'
            f'</g>'
        )
    return "\n".join(frames)


def pacman_types_sheet() -> str:
    skins = [
        ("gold", "#ffd94d", "#ffb44d"),
        ("cyan", "#35d7ea", "#12d8e7"),
        ("rose", "#ff71bd", "#ff5876"),
        ("mint", "#61e5b2", "#12b886"),
    ]
    out = []
    for name, body, edge in skins:
        out.append(
            f'<g class="type-{name}">'
            f'<circle cx="0" cy="0" r="48" fill="{body}" stroke="{edge}" stroke-width="4" />'
            f'<circle cx="0" cy="0" r="44" fill="{body}" opacity="0.25" />'
            f'</g>'
        )
    return "\n".join(out)


def ghost_states_sheet() -> str:
    out = []
    for name, body, alpha in [
        ("idle", "#a98aff", 1.0),
        ("stunned", "#51dcff", 0.45),
        ("dead", "#3f2a4a", 0.2),
        ("bow", "#ff9b50", 0.7),
    ]:
        out.append(
            f'<g class="state-{name}">'
            f'<ellipse cx="0" cy="0" rx="30" ry="40" fill="{body}" opacity="{alpha}" />'
            f'<ellipse cx="0" cy="-6" rx="11" ry="14" fill="#f7fbff" />'
            f'<ellipse cx="0" cy="-6" rx="11" ry="14" fill="#f7fbff" />'
            f'<circle cx="-8" cy="-8" r="3" fill="#172a50" />'
            f'<circle cx="8" cy="-8" r="3" fill="#172a50" />'
            f'<animateTransform attributeName="transform" type="translate" '
            f'from="0 0" to="0 -6" dur="1.7s" repeatCount="indefinite"/>'


def powerup_states_sheet() -> str:
    out = []
    for i, (name, body, ring, glow) in enumerate(
        [
            ("pill", "#ffd84d", "#ff9b50", "#ffd84d"),
            ("orb", "#35d7ea", "#5be4c2", "#35d7ea"),
            ("core", "#ff71bd", "#ff9b50", "#ff71bd"),
            ("key", "#61e5b2", "#12b886", "#61e5b2"),
        ]
    ):
        out.append(
            f'<g class="state-{name}">'
            f'<circle cx="0" cy="-6" r="44" fill="{glow}" opacity="0.35" filter="url(#soft-glow)" />'
            f'<circle cx="0" cy="-6" r="30" fill="{ring}" opacity="0.5" />'
            f'<circle cx="0" cy="-6" r="26" fill="{body}" />'
            f'<circle cx="0" cy="-6" r="5" fill="#08111f" />'
            f'<animateTransform attributeName="transform" type="scale" '
            f'from="1 1" to="1.06 1.06" dur="1.6s" repeatCount="indefinite"/>'
            f'</g>'
        )
    return "\n".join(out)


def powerup_actions_sheet() -> str:
    out = []
    for i in range(4):
        out.append(
            f'<g class="action-eat-{i:02d}">'
            f'<circle cx="0" cy="0" r="40" fill="#35d7ea" />'
            f'<circle cx="0" cy="-4" r="34" fill="#35d7ea" opacity="0.35" />'
            f'<circle cx="0" cy="-4" r="30" fill="#12d8e7" />'
            f'<circle cx="0" cy="-4" r="6" fill="#08111f" />'
            f'<path d="M -10 6 Q 0 2 10 6" stroke="#08111f" stroke-width="3" fill="none"/>'
            f'<animateTransform attributeName="transform" type="scale" '
            f'from="1 1" to="1.08 1.08" dur="1.1s" repeatCount="indefinite"/>'
            f'</g>'
        )
    return "\n".join(out)


def powerup_types_sheet() -> str:
    out = []
    for name, body, glow in [
        ("dot", "#d7e9ff", "#5be4c2"),
        ("big", "#ffd84d", "#ff9b50"),
        ("energized", "#ff9b50", "#ffd84d"),
        ("fruit", "#ff70b5", "#ff9b50"),
    ]:
        out.append(
            f'<g class="type-{name}">'
            f'<circle cx="0" cy="0" r="48" fill="{glow}" opacity="0.4" filter="url(#soft-glow)" />'
            f'<circle cx="0" cy="0" r="38" fill="{body}" />'
            f'<circle cx="0" cy="0" r="30" fill="{body}" opacity="0.25" />'
            f'</g>'
        )
    return "\n".join(out)


def maze_states_sheet() -> str:
    out = []
    for i in range(4):
        out.append(
            f'<g class="state-maze-{i:02d}">'
            f'<rect x="-34" y="-34" width="68" height="68" rx="8" fill="#0b1b30" stroke="#268fff" stroke-width="4" />'
            f'<rect x="-32" y="-32" width="64" height="64" rx="6" fill="#08182e" />'
            f'<rect x="-6" y="-6" width="12" height="60" rx="2" fill="#1c3045" />'
            f'<rect x="-6" y="-6" width="60" height="12" rx="2" fill="#1c3045" />'
            f'<animateTransform attributeName="transform" type="translate" '


def write_sheet(folder: Path, rel: str, content: str) -> None:
    (folder / f"{rel}.svg").write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 480" role="img" aria-label="{rel}">\n'
        f'  <defs>'
        f'<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
        f'<stop stop-color="#101a31"/><stop offset="1" stop-color="#080d19"/>'
        f'</linearGradient><filter id="soft-glow" x="-80%" y="-80%" width="260%" height="260%">'
        f'<feGaussianBlur stdDeviation="4" result="blur"/>'
        f'<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>'
        f'</filter></defs>'
        f'<rect width="960" height="480" rx="24" fill="url(#bg)"/>'
        f'<g>{content}</g>'
        f'</svg>', encoding="utf-8"
    )


def main() -> None:
    BUILD.mkdir(parents=True, exist_ok=True)
    (OUT / "character").mkdir(parents=True, exist_ok=True)
    for entity in ["pacman", "ghost", "power-up", "maze"]:
        base = OUT / "character" / entity
        for sub in ["states", "actions", "types"]:
            (base / sub).mkdir(parents=True, exist_ok=True)

    sheets = [
        ("pacman/states", pacman_states_sheet()),
        ("pacman/actions", pacman_actions_sheet()),
        ("pacman/types", pacman_types_sheet()),
        ("ghost/states", ghost_states_sheet()),
        ("ghost/actions", ghost_actions_sheet()),
        ("ghost/types", ghost_types_sheet()),
        ("power-up/states", powerup_states_sheet()),
        ("power-up/actions", powerup_actions_sheet()),
        ("power-up/types", powerup_types_sheet()),
        ("maze/states", maze_states_sheet()),
        ("maze/actions", maze_actions_sheet()),
        ("maze/types", maze_types_sheet()),
    ]

    for rel, content in sheets:
        write_sheet(OUT / "character", rel, content)
        print(f"wrote {OUT / 'character' / f'{rel}.svg'}", flush=True)

    manifest = {
        "version": "1.0.0",
        "folders": [str(p.relative_to(OUT)) for p in sorted((OUT / "character").rglob("*.svg"))],
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print("wrote", OUT / "manifest.json")


if __name__ == "__main__":
    main()

            f'from="0 0" to="0 -2" dur="0.9s" repeatCount="indefinite"/>'
            f'</g>'
        )
    return "\n".join(out)


def maze_actions_sheet() -> str:
    out = []
    for i in range(6):
        out.append(
            f'<g class="action-maze-{i:02d}">'
            f'<rect x="-30" y="-30" width="60" height="60" rx="6" fill="#0c1726" stroke="#22324f" stroke-width="2" />'
            f'<rect x="-22" y="-22" width="44" height="44" rx="4" fill="#0e2034" />'
            f'<circle cx="0" cy="0" r="5" fill="#d8eaff" />'
            f'<animateTransform attributeName="transform" type="translate" '
            f'from="0 0" to="0 3" dur="1.2s" repeatCount="indefinite"/>'
            f'</g>'
        )
    return "\n".join(out)


def maze_types_sheet() -> str:
    out = []
    for name, fill, stroke in [
        ("wall", "#0b1b30", "#268fff"),
        ("path", "#08182e", "#1c3045"),
        ("pellet", "#d8eaff", "#5be4c2"),
        ("big", "#ffd84d", "#ff9b50"),
        ("gate", "#26d9ee", "#08111f"),
        ("spawn", "#1d1533", "#c18bff"),
    ]:
        out.append(
            f'<g class="type-{name}">'
            f'<rect x="-34" y="-34" width="68" height="68" rx="10" fill="{fill}" stroke="{stroke}" stroke-width="4" />'
            f'</g>'
        )
    return "\n".join(out)

            f'</g>'
        )
    return "\n".join(out)


def ghost_actions_sheet() -> str:
    out = []
    for i in range(6):
        ang = i * 60
        out.append(
            f'<g class="action-chase-{i:02d}">'
            f'<ellipse cx="0" cy="0" rx="28" ry="34" fill="#a98aff" filter="url(#soft-glow)" />'
            f'<path d="M -14 10 V -5 C -14 -14 14 -14 14 10 V 10 L 14 4 L 0 10 L -14 4 Z" fill="#a98aff" />'
            f'<ellipse cx="-7" cy="-2" rx="4" ry="5" fill="#172a50" />'
            f'<ellipse cx="7" cy="-2" rx="4" ry="5" fill="#172a50" />'
            f'<animateTransform attributeName="transform" type="rotate" '
            f'from="{ang - 30} 0 0" to="{ang + 30} 0 0" dur="1.4s" repeatCount="indefinite"/>'
            f'</g>'
        )
    return "\n".join(out)


def ghost_types_sheet() -> str:
    colors = [
        ("red", "#ff5876", "#ff9b50"),
        ("cyan", "#35d7ea", "#12d8e7"),
        ("pink", "#ff70b5", "#ff9b50"),
        ("orange", "#ff9b50", "#ff70b5"),
    ]
    out = []
    for name, body, edge in colors:
        out.append(
            f'<g class="type-{name}">'
            f'<ellipse cx="0" cy="0" rx="30" ry="40" fill="{body}" stroke="{edge}" stroke-width="3" />'
            f'<ellipse cx="0" cy="-2" rx="28" ry="38" fill="{body}" opacity="0.2" />'
            f'</g>'
        )
    return "\n".join(out)
