from pathlib import Path


OUTPUT = Path(__file__).with_name("pacman_spritesheet.svg")


def pacman(cx, cy, radius, color, direction="right", animation_delay="0s"):
    """Build a Pac-Man with a looping, SVG-native mouth animation."""
    angles = {
        "right": (-24, 24),
        "down": (66, 114),
        "left": (156, 204),
        "up": (246, 294),
    }
    start_angle, end_angle = angles[direction]
    center_angle = (start_angle + end_angle) / 2

    def point(angle):
        import math

        radians = math.radians(angle)
        return cx + radius * math.cos(radians), cy + radius * math.sin(radians)

    def directed_path(opening):
        first, second = point(center_angle - opening / 2), point(center_angle + opening / 2)
        return (
            f"M {cx} {cy} L {first[0]:.2f} {first[1]:.2f} "
            f"A {radius} {radius} 0 0 1 {second[0]:.2f} {second[1]:.2f} Z"
        )

    closed = directed_path(0)
    medium = directed_path(24)
    wide = directed_path(48)
    return f'''<g class="pacman" style="--character:{color};--delay:{animation_delay}">
      <circle cx="{cx}" cy="{cy}" r="{radius}" fill="var(--character)" />
      <path fill="#08111f" d="{closed}">
        <animate attributeName="d" dur="0.72s" repeatCount="indefinite"
          values="{closed};{medium};{wide};{medium};{closed}" keyTimes="0;0.22;0.5;0.78;1"
          calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"
          begin="{animation_delay}" />
      </path>
      <circle cx="{cx + radius * 0.12:.2f}" cy="{cy - radius * 0.48:.2f}" r="{max(2.5, radius * 0.085):.2f}" fill="#08111f" />
    </g>'''


def ghost(cx, cy, color):
    return f'''<g class="ghost" style="--ghost:{color}">
      <path class="ghost-body" d="M {cx - 25} {cy + 20} V {cy - 5}
        C {cx - 25} {cy - 39}, {cx + 25} {cy - 39}, {cx + 25} {cy - 5}
        V {cy + 20} L {cx + 13} {cy + 11} L {cx} {cy + 20}
        L {cx - 13} {cy + 11} Z" />
      <ellipse cx="{cx - 9}" cy="{cy - 4}" rx="6" ry="8" fill="#f7fbff" />
      <ellipse cx="{cx + 9}" cy="{cy - 4}" rx="6" ry="8" fill="#f7fbff" />
      <circle cx="{cx - 7}" cy="{cy - 2}" r="2.8" fill="#172a50" />
      <circle cx="{cx + 11}" cy="{cy - 2}" r="2.8" fill="#172a50" />
    </g>'''


def generate_svg():
    pellets = "\n".join(
        f'<circle class="pellet" style="--delay:{index * 0.12:.2f}s" cx="{x}" cy="300" r="4" />'
        for index, x in enumerate(range(150, 821, 56))
    )
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 600" role="img" aria-labelledby="title description">
  <title id="title">Neon Maze — animated Pac-Man</title>
  <desc id="description">Three colorful Pac-Men chomp through a glowing neon maze as a ghost bobs nearby.</desc>
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#101a31" />
      <stop offset="1" stop-color="#080d19" />
    </linearGradient>
    <linearGradient id="maze-glow" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#39dcff" />
      <stop offset="1" stop-color="#5574ff" />
    </linearGradient>
    <radialGradient id="ambient">
      <stop stop-color="#284b9b" stop-opacity=".26" />
      <stop offset="1" stop-color="#101a31" stop-opacity="0" />
    </radialGradient>
    <filter id="soft-glow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="5" result="blur" />
      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <style>
      * {{ box-sizing: border-box; }}
      .label {{ font-family: Inter, ui-sans-serif, system-ui, sans-serif; }}
      .eyebrow {{ fill: #83a0c9; font-size: 11px; font-weight: 700; letter-spacing: 2.8px; }}
      .title {{ fill: #f1f6ff; font-size: 28px; font-weight: 750; letter-spacing: -.8px; }}
      .subtitle {{ fill: #91a5c5; font-size: 13px; }}
      .maze-line {{ fill: none; stroke: url(#maze-glow); stroke-width: 3; opacity: .78; }}
      .pacman {{ filter: url(#soft-glow); transform-box: fill-box; transform-origin: center; animation: bob 1.2s ease-in-out var(--delay) infinite; }}
      .ghost {{ animation: ghost-bob 1.7s ease-in-out infinite; }}
      .ghost-body {{ fill: var(--ghost); filter: url(#soft-glow); }}
      .pellet {{ fill: #d7e9ff; filter: url(#soft-glow); animation: twinkle 1.3s ease-in-out var(--delay) infinite; }}
      .badge {{ fill: #131f37; stroke: #2a3a59; }}
      .badge-text {{ fill: #c3d2ea; font-size: 10px; font-weight: 700; letter-spacing: 1.1px; }}
      @keyframes bob {{ 0%, 100% {{ transform: translateY(0); }} 50% {{ transform: translateY(-5px); }} }}
      @keyframes ghost-bob {{ 0%, 100% {{ transform: translateY(0); }} 50% {{ transform: translateY(-9px); }} }}
      @keyframes twinkle {{ 0%, 100% {{ opacity: .48; }} 50% {{ opacity: 1; }} }}
      @media (prefers-reduced-motion: reduce) {{
        .pacman, .ghost, .pellet, .pacman animate {{ animation: none; display: none; }}
      }}
    </style>
  </defs>

  <rect width="960" height="600" rx="28" fill="url(#background)" />
  <ellipse cx="480" cy="320" rx="420" ry="300" fill="url(#ambient)" />
  <path d="M 28 104 H 932" stroke="#25334d" />

  <g class="label">
    <circle cx="57" cy="54" r="18" fill="#ffd84d" />
    <path d="M 57 54 L 73 47 A 18 18 0 0 1 73 61 Z" fill="#101a31" />
    <text class="eyebrow" x="88" y="48">ARCADE COLLECTION</text>
    <text class="title" x="88" y="77">NEON MAZE</text>
    <text class="subtitle" x="723" y="55">A little more chomp.</text>
    <text class="subtitle" x="723" y="76">A lot more glow.</text>
  </g>

  <rect x="40" y="126" width="880" height="386" rx="22" fill="#0b1425" stroke="#22324f" stroke-width="1.5" />
  <rect x="52" y="138" width="856" height="362" rx="16" fill="none" stroke="#13223a" />

  <g filter="url(#soft-glow)">
    <path class="maze-line" d="M 110 218 H 850 Q 870 218 870 238 V 362 Q 870 382 850 382 H 110 Q 90 382 90 362 V 238 Q 90 218 110 218 Z" />
    <path class="maze-line" opacity=".34" d="M 168 250 H 792 V 350 H 168 Z" />
    <path d="M 168 300 H 792" stroke="#243958" stroke-width="1.5" stroke-dasharray="3 12" stroke-linecap="round" />
  </g>
  {pellets}

  <g class="label">
    <rect class="badge" x="67" y="153" width="116" height="26" rx="13" />
    <circle cx="82" cy="166" r="3" fill="#5be4c2" />
    <text class="badge-text" x="93" y="170">LIVE ANIMATION</text>
  </g>

  {pacman(186, 300, 28, "#ffd84d", animation_delay="0s")}
  {pacman(435, 300, 24, "#51dcff", animation_delay="0.14s")}
  {pacman(663, 300, 20, "#ff70b5", animation_delay="0.28s")}
  {ghost(800, 300, "#a98aff")}

  <g class="label">
    <text class="eyebrow" x="64" y="550">BUILT FOR THE NEXT HIGH SCORE</text>
    <text class="subtitle" x="64" y="574">Pure SVG · Infinite loop · Respects reduced motion</text>
    <g transform="translate(702 542)">
      <circle cx="10" cy="10" r="8" fill="#ffd84d" />
      <circle cx="36" cy="10" r="7" fill="#51dcff" />
      <circle cx="60" cy="10" r="6" fill="#ff70b5" />
      <text class="badge-text" x="77" y="14">3 PLAYERS / 1 MAZE</text>
    </g>
  </g>
</svg>
'''


if __name__ == "__main__":
    OUTPUT.write_text(generate_svg(), encoding="utf-8")
    print(f"Generated animated SVG: {OUTPUT}")
