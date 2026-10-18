from pathlib import Path
from generate_clean_atlases import make_pac_frame

defs = '''
  <defs>
    <radialGradient id="pac-gold" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#fff580"/>
      <stop offset="40%" stop-color="#ffd32a"/>
      <stop offset="100%" stop-color="#f39c12"/>
    </radialGradient>
    <radialGradient id="pac-speed" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#e0f7fa"/>
      <stop offset="35%" stop-color="#00e5ff"/>
      <stop offset="80%" stop-color="#0288d1"/>
      <stop offset="100%" stop-color="#01579b"/>
    </radialGradient>
    <radialGradient id="pac-crunch" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#ffcc80"/>
      <stop offset="35%" stop-color="#ff7043"/>
      <stop offset="80%" stop-color="#d84315"/>
      <stop offset="100%" stop-color="#bf360c"/>
    </radialGradient>
    <radialGradient id="pac-phase" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#e1bee7"/>
      <stop offset="40%" stop-color="#ab47bc"/>
      <stop offset="80%" stop-color="#4a148c"/>
      <stop offset="100%" stop-color="#1a0033"/>
    </radialGradient>
    <radialGradient id="pac-shield" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#b9f6ca"/>
      <stop offset="35%" stop-color="#00e676"/>
      <stop offset="80%" stop-color="#00a152"/>
      <stop offset="100%" stop-color="#004d40"/>
    </radialGradient>
    <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
'''

def wrap_svg(inner):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">\n{defs}\n{inner}\n</svg>'

pac_dir = Path(__file__).resolve().parent.parent / "assets" / "characters" / "pacmen"

# pacman-classic: 34 deg chomp
classic = wrap_svg(make_pac_frame("url(#pac-gold)", 34, "normal"))
(pac_dir / "pacman-classic.svg").write_text(classic, encoding="utf-8")

# pacman-crunch: 44 deg chomp with teeth
teeth = '''
<polygon points="38,24 42,28 36,28" fill="#ffffff" stroke="#0d141e" stroke-width="1"/>
<polygon points="38,40 42,36 36,36" fill="#ffffff" stroke="#0d141e" stroke-width="1"/>
'''
crunch = wrap_svg(make_pac_frame("url(#pac-crunch)", 44, "determined", extras=teeth, iris="#bf360c"))
(pac_dir / "pacman-crunch.svg").write_text(crunch, encoding="utf-8")

# pacman-phase: 34 deg chomp with ethereal mist
mist = '<circle cx="32" cy="32" r="25" fill="url(#pac-phase)" opacity="0.3"/>'
phase = wrap_svg(make_pac_frame("url(#pac-phase)", 34, "normal", extras=mist, iris="#1a0033"))
(pac_dir / "pacman-phase.svg").write_text(phase, encoding="utf-8")

# pacman-shield: closed with emerald hexagonal forcefield
shield_dome = '<polygon points="32,3 55,16 55,48 32,61 9,48 9,16" fill="#00e676" fill-opacity="0.18" stroke="#00e676" stroke-width="2.2" filter="url(#soft-glow)"/>'
shield = wrap_svg(make_pac_frame("url(#pac-shield)", 0, "determined", extras=shield_dome, iris="#004d40"))
(pac_dir / "pacman-shield.svg").write_text(shield, encoding="utf-8")

# pacman-speed: 34 deg chomp with supersonic speed lines
trails = '<line x1="2" y1="32" x2="9" y2="32" stroke="#00e5ff" stroke-width="2.8" stroke-linecap="round"/>'
speed = wrap_svg(make_pac_frame("url(#pac-speed)", 34, "determined", extras=trails, iris="#01579b"))
(pac_dir / "pacman-speed.svg").write_text(speed, encoding="utf-8")

print("Updated all standalone pacman svgs successfully!")
