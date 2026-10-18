"""
Generate clean, mathematically exact SVG sprite atlases for SCP-Pac_Update.exe
Adheres strictly to SCP Explained bold vector aesthetics + Ghostly Adventures powers (STRICTLY NO LIMBS).
Maintains exact 64x64 grid, 6x6 layout (384x384), and frame mappings for character-animations.json.
"""

import math
from pathlib import Path
import xml.etree.ElementTree as ET

def eye_markup(cx, cy, style="normal", iris_color="#102538"):
    """SCP Explained style expressive cartoon eye placed on Pac-Man's face."""
    if style == "normal":
        return f'''
        <ellipse cx="{cx}" cy="{cy}" rx="4.5" ry="6.5" fill="#ffffff" stroke="#0d141e" stroke-width="1.8"/>
        <ellipse cx="{cx + 1.2}" cy="{cy}" rx="2.5" ry="3.8" fill="{iris_color}"/>
        <circle cx="{cx + 0.3}" cy="{cy - 1.8}" r="1.1" fill="#ffffff"/>
        <circle cx="{cx + 2.0}" cy="{cy + 1.2}" r="0.6" fill="#ffffff"/>
        <path d="M {cx - 3.2} {cy - 8.2} Q {cx} {cy - 10.2} {cx + 3.5} {cy - 8.0}" fill="none" stroke="#0d141e" stroke-width="1.6" stroke-linecap="round"/>
        '''
    elif style == "determined":
        return f'''
        <ellipse cx="{cx}" cy="{cy}" rx="4.5" ry="5.5" fill="#ffffff" stroke="#0d141e" stroke-width="1.8"/>
        <ellipse cx="{cx + 1.2}" cy="{cy}" rx="2.5" ry="3.5" fill="{iris_color}"/>
        <circle cx="{cx + 0.3}" cy="{cy - 1.4}" r="1.1" fill="#ffffff"/>
        <path d="M {cx - 3.8} {cy - 7} L {cx + 4.2} {cy - 8.8}" fill="none" stroke="#0d141e" stroke-width="2" stroke-linecap="round"/>
        '''
    elif style == "afraid":
        return f'''
        <ellipse cx="{cx}" cy="{cy}" rx="5.5" ry="7.5" fill="#ffffff" stroke="#0d141e" stroke-width="1.8"/>
        <ellipse cx="{cx}" cy="{cy}" rx="2.2" ry="3.2" fill="{iris_color}"/>
        <circle cx="{cx - 0.7}" cy="{cy - 1.8}" r="1.0" fill="#ffffff"/>
        <path d="M {cx - 4} {cy - 10} Q {cx} {cy - 8} {cx + 3.8} {cy - 9.8}" fill="none" stroke="#0d141e" stroke-width="1.8" stroke-linecap="round"/>
        '''
    elif style == "blink":
        return f'''
        <path d="M {cx - 4} {cy} Q {cx} {cy + 2.5} {cx + 4} {cy}" fill="none" stroke="#0d141e" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M {cx - 3} {cy - 5} Q {cx} {cy - 7} {cx + 3} {cy - 5}" fill="none" stroke="#0d141e" stroke-width="1.5" stroke-linecap="round"/>
        '''
    elif style == "damage":
        return f'''
        <path d="M {cx - 3.8} {cy - 3.8} L {cx + 3.8} {cy + 3.8} M {cx + 3.8} {cy - 3.8} L {cx - 3.8} {cy + 3.8}" stroke="#0d141e" stroke-width="2.2" stroke-linecap="round"/>
        '''
    elif style == "happy":
        return f'''
        <path d="M {cx - 4} {cy + 0.8} Q {cx} {cy - 4.2} {cx + 4} {cy + 0.8}" fill="none" stroke="#0d141e" stroke-width="2.4" stroke-linecap="round"/>
        <circle cx="{cx + 4.5}" cy="{cy - 4.5}" r="1.3" fill="#ffd700"/>
        '''
    return ""

def make_pac_frame(body_grad, mouth_deg, eye_style="normal", extras="", sx=1.0, sy=1.0, rot=0, iris="#102538"):
    """
    Constructs a mathematically exact, centered 64x64 Pac-Man frame.
    Center is (32, 32), radius is 21. Bounding box is strictly x=[11, 53], y=[11, 53].
    Mouth opens to the right (+X). Eye is placed safely at (27, 20) on the forehead.
    """
    cx, cy, r = 32, 32, 21
    eye_x, eye_y = 27, 20

    if mouth_deg <= 1.0:
        # Full closed mouth
        shape = f'''
        <circle cx="{cx}" cy="{cy}" r="{r}" fill="{body_grad}" stroke="#0d141e" stroke-width="2.5"/>
        <path d="M {cx - 4} {cy + 3} Q {cx + 3} {cy + 5.5} {cx + 10} {cy + 2.5}" fill="none" stroke="#0d141e" stroke-width="2" stroke-linecap="round"/>
        '''
        tongue = ""
    else:
        # Open chomp mouth facing RIGHT
        half = math.radians(mouth_deg / 2)
        x_top = cx + r * math.cos(-half)
        y_top = cy + r * math.sin(-half)
        x_bot = cx + r * math.cos(half)
        y_bot = cy + r * math.sin(half)
        # In SVG: sweep=0 (counter-clockwise) from top lip around back of head to bottom lip!
        body_path = f"M {cx} {cy} L {x_top:.2f} {y_top:.2f} A {r} {r} 0 1 0 {x_bot:.2f} {y_bot:.2f} Z"
        shape = f'<path d="{body_path}" fill="{body_grad}" stroke="#0d141e" stroke-width="2.5" stroke-linejoin="round"/>'
        # Inside tongue placed neatly at vertex of mouth (x=32..38, y=32..36)
        tongue = f'<path d="M {cx} {cy} L {cx + 7:.2f} {cy} Q {cx + 5:.2f} {cy + 5.5:.2f} {cx:.2f} {cy + 3.5:.2f} Z" fill="#ff4757" opacity="0.9"/>'

    # Clean cel-shaded specular highlight on top-left rim
    highlight = f'''
    <path d="M {cx - 16} {cy - 4} A 16 16 0 0 1 {cx} {cy - 16}" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
    '''

    # Transform wrapper
    transform_attr = ""
    if sx != 1.0 or sy != 1.0 or rot != 0:
        transforms = [f"translate({cx} {cy})"]
        if rot != 0:
            transforms.append(f"rotate({rot})")
        if sx != 1.0 or sy != 1.0:
            transforms.append(f"scale({sx:.2f} {sy:.2f})")
        transforms.append(f"translate(-{cx} -{cy})")
        transform_attr = f' transform="{" ".join(transforms)}"'

    content = f'''<g{transform_attr}>
      {extras}
      {shape}
      {tongue}
      {highlight}
      {eye_markup(eye_x, eye_y, eye_style, iris)}
    </g>'''
    return content

def generate_pacmen_atlas():
    """Build the 36-frame Pac-Men atlas SVG."""
    defs = '''
    <defs>
      <!-- Elemental Form Gradients -->
      <radialGradient id="pac-gold" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#fff580"/>
        <stop offset="40%" stop-color="#ffd32a"/>
        <stop offset="100%" stop-color="#f39c12"/>
      </radialGradient>
      <radialGradient id="pac-fire" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#ffeb3b"/>
        <stop offset="35%" stop-color="#ff9800"/>
        <stop offset="80%" stop-color="#f44336"/>
        <stop offset="100%" stop-color="#b71c1c"/>
      </radialGradient>
      <radialGradient id="pac-ice" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="35%" stop-color="#80deea"/>
        <stop offset="80%" stop-color="#00acc1"/>
        <stop offset="100%" stop-color="#006064"/>
      </radialGradient>
      <radialGradient id="pac-electric" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="35%" stop-color="#ffe600"/>
        <stop offset="80%" stop-color="#00e5ff"/>
        <stop offset="100%" stop-color="#0091ea"/>
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

      <!-- Clean filter -->
      <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    '''

    frames = []
    for f in range(36):
        # 0: runner-idle (frame 0) - closed mouth, calm eye
        if f == 0:
            frame = make_pac_frame("url(#pac-gold)", 0, "normal")
        # 1: runner-idle (frame 1) - mouth slight smile, subtle breath
        elif f == 1:
            frame = make_pac_frame("url(#pac-gold)", 0, "normal", sx=1.02, sy=0.98)
        # 2: runner-move (frame 2) - medium chomp open 34 deg
        elif f == 2:
            frame = make_pac_frame("url(#pac-gold)", 34, "determined")
        # 3: runner-move (frame 3) - closed forward stride
        elif f == 3:
            frame = make_pac_frame("url(#pac-gold)", 6, "determined", sx=1.03, sy=0.97)
        # 4: runner-turn (frame 4) - slight tilt
        elif f == 4:
            frame = make_pac_frame("url(#pac-gold)", 18, "normal", rot=-12)
        # 5: runner-eat / attack (frame 5) - wide bite 52 deg
        elif f == 5:
            frame = make_pac_frame("url(#pac-gold)", 52, "determined")
        # 6: runner-eat (frame 6) - snap shut
        elif f == 6:
            frame = make_pac_frame("url(#pac-gold)", 0, "happy", sx=1.04, sy=0.96)
        # 7: runner-damage / defeat (frame 7) - damage spiral eye
        elif f == 7:
            stars = '<path d="M 46 12 L 48 15 L 52 15 L 49 18 L 50 21 L 46 19 L 43 21 L 44 18 L 41 15 L 45 15 Z" fill="#ffd54f" stroke="#0d141e" stroke-width="1.2"/>'
            frame = make_pac_frame("url(#pac-gold)", 14, "damage", extras=stars, sx=0.94, sy=1.06)
        # 8: runner-invulnerable (frame 8) - radiant gold power aura
        elif f == 8:
            aura = '<circle cx="32" cy="32" r="26" fill="none" stroke="#fff176" stroke-width="2.5" stroke-dasharray="5 3" opacity="0.85"/>'
            frame = make_pac_frame("url(#pac-gold)", 28, "happy", extras=aura)
        # 9: runner-fire (Fire Pac - Ghostly Adventures inspired, NO limbs)
        elif f == 9:
            flame_crest = '''
            <path d="M 22 13 Q 26 3 31 1 Q 35 6 38 4 Q 41 2 44 6 Q 42 12 37 13 Z" fill="url(#pac-fire)" stroke="#0d141e" stroke-width="1.6"/>
            <path d="M 25 12 Q 28 6 32 4 Q 35 8 38 7 Q 39 10 36 12 Z" fill="#fff59d"/>
            '''
            frame = make_pac_frame("url(#pac-fire)", 34, "determined", extras=flame_crest, iris="#b71c1c")
        # 10: runner-ice (Ice Pac - Ghostly Adventures inspired, NO limbs)
        elif f == 10:
            ice_spikes = '''
            <polygon points="23,13 27,3 31,12" fill="#e0f7fa" stroke="#0d141e" stroke-width="1.5"/>
            <polygon points="30,12 35,2 39,11" fill="#ffffff" stroke="#0d141e" stroke-width="1.5"/>
            <polygon points="37,12 43,4 45,13" fill="#80deea" stroke="#0d141e" stroke-width="1.5"/>
            '''
            frame = make_pac_frame("url(#pac-ice)", 30, "determined", extras=ice_spikes, iris="#006064")
        # 11: runner-electric (Spark Pac - Ghostly Adventures inspired, NO limbs)
        elif f == 11:
            sparks = '''
            <path d="M 26 13 L 31 2 L 30 7 L 37 3 L 34 13" fill="#fff176" stroke="#0d141e" stroke-width="1.6" stroke-linejoin="bevel"/>
            <path d="M 40 14 L 45 6 L 43 10 L 48 7 L 45 15" fill="#00e5ff" stroke="#0d141e" stroke-width="1.5"/>
            '''
            frame = make_pac_frame("url(#pac-electric)", 34, "determined", extras=sparks, iris="#0091ea")
        # 12: runner-dash / attack lunge (frame 12) - speed blur streaks
        elif f == 12:
            streaks = '''
            <line x1="2" y1="26" x2="10" y2="26" stroke="#ffd54f" stroke-width="2" stroke-linecap="round"/>
            <line x1="1" y1="32" x2="9" y2="32" stroke="#ff9800" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="3" y1="38" x2="11" y2="38" stroke="#ffd54f" stroke-width="2" stroke-linecap="round"/>
            '''
            frame = make_pac_frame("url(#pac-gold)", 38, "determined", extras=streaks, sx=1.08, sy=0.92)
        # 13: runner-shield (Titan / Shield Pac)
        elif f == 13:
            shield_dome = '''
            <polygon points="32,3 55,16 55,48 32,61 9,48 9,16" fill="#00e676" fill-opacity="0.18" stroke="#00e676" stroke-width="2.2" filter="url(#soft-glow)"/>
            '''
            frame = make_pac_frame("url(#pac-shield)", 0, "determined", extras=shield_dome, iris="#004d40")
        # 14: runner-pulse-charge (frame 14)
        elif f == 14:
            vortex = '<circle cx="32" cy="32" r="25" fill="none" stroke="#00e5ff" stroke-width="2" stroke-dasharray="6 4"/>'
            frame = make_pac_frame("url(#pac-gold)", 12, "determined", extras=vortex)
        # 15: runner-pulse-blast (frame 15)
        elif f == 15:
            blast = '<circle cx="32" cy="32" r="28" fill="none" stroke="#00e5ff" stroke-width="2.8" opacity="0.9"/>'
            frame = make_pac_frame("url(#pac-gold)", 50, "determined", extras=blast, sx=1.06, sy=0.94)
        # 16: runner-recover / respawn (frame 16)
        elif f == 16:
            sweat = '<path d="M 42 12 C 42 10 44 7 44 7 C 44 7 46 10 46 12 C 46 14 44 15 42 12 Z" fill="#00e5ff" stroke="#0d141e" stroke-width="1.2"/>'
            frame = make_pac_frame("url(#pac-gold)", 8, "afraid", extras=sweat)
        # 17: runner-victory (frame 17) - joyful star wink
        elif f == 17:
            sparkle = '<path d="M 47 7 L 49 12 L 54 13 L 49 15 L 47 20 L 45 15 L 40 13 L 45 12 Z" fill="#ffd700" stroke="#0d141e" stroke-width="1.2"/>'
            frame = make_pac_frame("url(#pac-gold)", 20, "happy", extras=sparkle, sx=1.03, sy=0.97)
        # 18: runner-speed open (frame 18)
        elif f == 18:
            trails = '<line x1="2" y1="32" x2="9" y2="32" stroke="#00e5ff" stroke-width="2.8" stroke-linecap="round"/>'
            frame = make_pac_frame("url(#pac-speed)", 34, "determined", extras=trails, iris="#01579b")
        # 19: runner-speed closed (frame 19)
        elif f == 19:
            frame = make_pac_frame("url(#pac-speed)", 0, "determined", sx=1.04, sy=0.96, iris="#01579b")
        # 20: runner-crunch open (frame 20) - teeth ridges!
        elif f == 20:
            teeth = '''
            <polygon points="38,24 42,28 36,28" fill="#ffffff" stroke="#0d141e" stroke-width="1"/>
            <polygon points="38,40 42,36 36,36" fill="#ffffff" stroke="#0d141e" stroke-width="1"/>
            '''
            frame = make_pac_frame("url(#pac-crunch)", 44, "determined", extras=teeth, iris="#bf360c")
        # 21: runner-crunch closed (frame 21)
        elif f == 21:
            frame = make_pac_frame("url(#pac-crunch)", 0, "determined", sx=1.04, sy=0.96, iris="#bf360c")
        # 22: runner-phase open (frame 22) - ethereal void
        elif f == 22:
            mist = '<circle cx="32" cy="32" r="25" fill="url(#pac-phase)" opacity="0.3"/>'
            frame = make_pac_frame("url(#pac-phase)", 34, "normal", extras=mist, iris="#1a0033")
        # 23: runner-phase closed (frame 23)
        elif f == 23:
            mist = '<circle cx="32" cy="32" r="25" fill="url(#pac-phase)" opacity="0.2"/>'
            frame = make_pac_frame("url(#pac-phase)", 0, "normal", extras=mist, iris="#1a0033")
        # 24: runner-shield-form open (frame 24)
        elif f == 24:
            armor = '<polygon points="32,4 54,16 54,48 32,60 10,48 10,16" fill="none" stroke="#00e676" stroke-width="2"/>'
            frame = make_pac_frame("url(#pac-shield)", 34, "determined", extras=armor, iris="#004d40")
        # 25: runner-shield-form closed (frame 25)
        elif f == 25:
            armor = '<polygon points="32,3 55,16 55,48 32,61 9,48 9,16" fill="none" stroke="#00e676" stroke-width="2.5"/>'
            frame = make_pac_frame("url(#pac-shield)", 0, "determined", extras=armor, iris="#004d40")
        # 26: runner-blink (frame 26)
        elif f == 26:
            frame = make_pac_frame("url(#pac-gold)", 0, "blink")
        # 27: runner-afraid (frame 27)
        elif f == 27:
            frame = make_pac_frame("url(#pac-gold)", 14, "afraid", sx=0.96, sy=1.04)
        # 28: runner-afraid tremble (frame 28)
        elif f == 28:
            frame = make_pac_frame("url(#pac-gold)", 22, "afraid", sx=1.04, sy=0.96)
        # 29-35: transform sequence frames
        elif f == 29:
            flare = '<circle cx="32" cy="32" r="26" fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.8"/>'
            frame = make_pac_frame("url(#pac-gold)", 24, "determined", extras=flare)
        elif f == 30:
            frame = make_pac_frame("url(#pac-fire)", 30, "determined", iris="#b71c1c")
        elif f == 31:
            frame = make_pac_frame("url(#pac-ice)", 30, "determined", iris="#006064")
        elif f == 32:
            frame = make_pac_frame("url(#pac-electric)", 30, "determined", iris="#0091ea")
        elif f == 33:
            frame = make_pac_frame("url(#pac-speed)", 30, "determined", iris="#01579b")
        elif f == 34:
            frame = make_pac_frame("url(#pac-phase)", 30, "determined", iris="#1a0033")
        else: # 35
            frame = make_pac_frame("url(#pac-shield)", 30, "determined", iris="#004d40")

        col = f % 6
        row = f // 6
        tx = col * 64
        ty = row * 64
        frames.append(f'<g transform="translate({tx} {ty})">\n{frame}\n</g>')

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="384" height="384" viewBox="0 0 384 384">
  <title>SCP-Pac_Update.exe - Pac-Men character atlas</title>
  <desc>36 clean vector 64x64 frames in SCP Explained style with bold outlines and Ghostly Adventures elemental powers without limbs.</desc>
  {defs}
  {''.join(frames)}
</svg>'''
    return svg

def generate_ghost_atlas():
    """Build the 36-frame Ghost atlas SVG with clean vector paths."""
    defs = '''
    <defs>
      <!-- Ghost body gradients -->
      <linearGradient id="ghost-white" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="60%" stop-color="#e1f5fe"/>
        <stop offset="100%" stop-color="#b3e5fc"/>
      </linearGradient>
      <linearGradient id="ghost-blinky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ff6b81"/>
        <stop offset="60%" stop-color="#ee5253"/>
        <stop offset="100%" stop-color="#b33939"/>
      </linearGradient>
      <linearGradient id="ghost-pinky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ff9ff3"/>
        <stop offset="60%" stop-color="#f368e0"/>
        <stop offset="100%" stop-color="#881177"/>
      </linearGradient>
      <linearGradient id="ghost-inky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#48dbfb"/>
        <stop offset="60%" stop-color="#0abde3"/>
        <stop offset="100%" stop-color="#056b85"/>
      </linearGradient>
      <linearGradient id="ghost-clyde" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#feca57"/>
        <stop offset="60%" stop-color="#ff9f43"/>
        <stop offset="100%" stop-color="#b55812"/>
      </linearGradient>
      <linearGradient id="ghost-blue-vuln" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#54a0ff"/>
        <stop offset="60%" stop-color="#2e86de"/>
        <stop offset="100%" stop-color="#1b4f8c"/>
      </linearGradient>
      <linearGradient id="ghost-flash-vuln" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="60%" stop-color="#c8d6e5"/>
        <stop offset="100%" stop-color="#8395a7"/>
      </linearGradient>

      <filter id="ghost-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2.5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    '''

    def make_ghost(grad, eye_state="forward", hem_wave=0, mouth="none", extras="", opacity=1.0, sx=1.0, sy=1.0):
        w = hem_wave
        body_path = (
            f"M 13 36 "
            f"C 13 19, 51 19, 51 36 "
            f"L 51 48 "
            f"Q 45 {53 + w} 39 48 "
            f"Q 33 {53 - w} 27 48 "
            f"Q 21 {53 + w} 13 48 "
            f"Z"
        )

        if eye_state == "forward":
            eyes = '''
            <ellipse cx="27" cy="30" rx="4.8" ry="6.8" fill="#ffffff" stroke="#0d141e" stroke-width="1.6"/>
            <ellipse cx="41" cy="30" rx="4.8" ry="6.8" fill="#ffffff" stroke="#0d141e" stroke-width="1.6"/>
            <circle cx="28.8" cy="30" r="2.6" fill="#102538"/>
            <circle cx="42.8" cy="30" r="2.6" fill="#102538"/>
            <circle cx="28.0" cy="28.5" r="1.0" fill="#ffffff"/>
            <circle cx="42.0" cy="28.5" r="1.0" fill="#ffffff"/>
            '''
        elif eye_state == "down":
            eyes = '''
            <ellipse cx="27" cy="30" rx="4.8" ry="6.8" fill="#ffffff" stroke="#0d141e" stroke-width="1.6"/>
            <ellipse cx="41" cy="30" rx="4.8" ry="6.8" fill="#ffffff" stroke="#0d141e" stroke-width="1.6"/>
            <circle cx="27" cy="32.5" r="2.6" fill="#102538"/>
            <circle cx="41" cy="32.5" r="2.6" fill="#102538"/>
            <circle cx="26.2" cy="31.2" r="1.0" fill="#ffffff"/>
            <circle cx="40.2" cy="31.2" r="1.0" fill="#ffffff"/>
            '''
        elif eye_state == "vulnerable":
            eyes = '''
            <ellipse cx="26" cy="30" rx="3.5" ry="4.5" fill="#feca57" stroke="#0d141e" stroke-width="1.4"/>
            <ellipse cx="38" cy="30" rx="3.5" ry="4.5" fill="#feca57" stroke="#0d141e" stroke-width="1.4"/>
            <circle cx="26" cy="30" r="1.5" fill="#0d141e"/>
            <circle cx="38" cy="30" r="1.5" fill="#0d141e"/>
            '''
        elif eye_state == "eyes_only":
            return '''
            <g transform="translate(0 -2)">
              <ellipse cx="25" cy="32" rx="5.2" ry="7.2" fill="#ffffff" stroke="#0d141e" stroke-width="1.8"/>
              <ellipse cx="39" cy="32" rx="5.2" ry="7.2" fill="#ffffff" stroke="#0d141e" stroke-width="1.8"/>
              <circle cx="27" cy="32" r="2.8" fill="#102538"/>
              <circle cx="41" cy="32" r="2.8" fill="#102538"/>
              <circle cx="26" cy="30.2" r="1.1" fill="#ffffff"/>
              <circle cx="40" cy="30.2" r="1.1" fill="#ffffff"/>
            </g>
            '''
        elif eye_state == "stun":
            eyes = '''
            <path d="M 23 27 L 31 33 M 31 27 L 23 33" stroke="#0d141e" stroke-width="2" stroke-linecap="round"/>
            <path d="M 37 27 L 45 33 M 45 27 L 37 33" stroke="#0d141e" stroke-width="2" stroke-linecap="round"/>
            '''
        elif eye_state == "trick":
            eyes = '''
            <path d="M 23 30 Q 27 26 31 30" fill="none" stroke="#0d141e" stroke-width="2.2" stroke-linecap="round"/>
            <ellipse cx="41" cy="30" rx="4.8" ry="6.8" fill="#ffffff" stroke="#0d141e" stroke-width="1.6"/>
            <circle cx="42.8" cy="30" r="2.6" fill="#102538"/>
            <circle cx="42.0" cy="28.5" r="1.0" fill="#ffffff"/>
            '''
        else:
            eyes = ""

        mouth_markup = ""
        if mouth == "wavy":
            mouth_markup = '<path d="M 25 41 Q 28 38 31 41 Q 34 44 37 41 Q 40 38 43 41" fill="none" stroke="#0d141e" stroke-width="2" stroke-linecap="round"/>'
        elif mouth == "smile":
            mouth_markup = '<path d="M 30 40 Q 34 43 38 40" fill="none" stroke="#0d141e" stroke-width="2" stroke-linecap="round"/>'
        elif mouth == "open":
            mouth_markup = '<ellipse cx="34" cy="41" rx="4" ry="5" fill="#102538" stroke="#0d141e" stroke-width="1.5"/>'
        elif mouth == "fright":
            mouth_markup = '<ellipse cx="34" cy="42" rx="4.5" ry="6" fill="#102538" stroke="#0d141e" stroke-width="1.6"/>'

        highlight = '<path d="M 17 34 C 17 23 26 16 36 16" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.6"/>'

        transform_attr = ""
        if sx != 1.0 or sy != 1.0:
            transform_attr = f' transform="translate(32 32) scale({sx:.2f} {sy:.2f}) translate(-32 -32)"'

        opacity_attr = f' opacity="{opacity:.2f}"' if opacity < 1.0 else ""

        return f'''<g{transform_attr}{opacity_attr}>
          {extras}
          <path d="{body_path}" fill="{grad}" stroke="#0d141e" stroke-width="2.5" stroke-linejoin="round"/>
          {highlight}
          {eyes}
          {mouth_markup}
        </g>'''

    frames = []
    for f in range(36):
        # 0: ghost-idle (frame 0)
        if f == 0:
            frame = make_ghost("url(#ghost-white)", "forward", hem_wave=2, mouth="smile")
        elif f == 1:
            frame = make_ghost("url(#ghost-white)", "forward", hem_wave=-2, mouth="smile", sx=0.98, sy=1.02)
        elif f == 2:
            frame = make_ghost("url(#ghost-white)", "forward", hem_wave=3, mouth="none", sx=1.04, sy=0.96)
        elif f == 3:
            aura = '<circle cx="32" cy="32" r="27" fill="none" stroke="#ff5252" stroke-width="2.2" opacity="0.75"/>'
            frame = make_ghost("url(#ghost-blinky)", "forward", hem_wave=-1, mouth="open", extras=aura)
        elif f == 4:
            shock = '<polygon points="53,26 49,32 55,38 47,35 45,42 43,32" fill="#ff5252"/>'
            frame = make_ghost("url(#ghost-blinky)", "forward", hem_wave=3, mouth="open", extras=shock, sx=1.08, sy=0.92)
        elif f == 5:
            stars = '<path d="M 44 14 L 46 17 L 49 17 L 47 20 L 48 23 L 44 21 L 41 23 L 42 20 L 39 17 L 43 17 Z" fill="#ffd700"/>'
            frame = make_ghost("url(#ghost-white)", "stun", hem_wave=-2, mouth="open", extras=stars, sx=0.93, sy=1.07)
        elif f == 6:
            frame = make_ghost("url(#ghost-blue-vuln)", "vulnerable", hem_wave=2, mouth="wavy")
        elif f == 7:
            frame = make_ghost("url(#ghost-flash-vuln)", "vulnerable", hem_wave=-2, mouth="wavy")
        elif f == 8:
            ring = '<ellipse cx="32" cy="14" rx="13" ry="4" fill="none" stroke="#feca57" stroke-width="2"/>'
            frame = make_ghost("url(#ghost-white)", "stun", hem_wave=0, mouth="open", extras=ring)
        elif f == 9:
            frame = make_ghost("url(#ghost-white)", "forward", hem_wave=1, mouth="smile", opacity=0.35)
        elif f == 10:
            shadow = '<circle cx="32" cy="32" r="25" fill="#2e86de" opacity="0.3"/>'
            frame = make_ghost("url(#ghost-inky)", "down", hem_wave=3, extras=shadow, opacity=0.7)
        elif f == 11:
            frame = make_ghost("url(#ghost-pinky)", "forward", hem_wave=2, mouth="smile")
        elif f == 12:
            flare = '<circle cx="32" cy="32" r="26" fill="none" stroke="#00e5ff" stroke-width="2"/>'
            frame = make_ghost("url(#ghost-white)", "forward", hem_wave=0, mouth="smile", extras=flare, opacity=0.6)
        elif f == 13:
            frame = make_ghost("url(#ghost-clyde)", "forward", hem_wave=2, mouth="smile")
        elif f == 14:
            frame = make_ghost("url(#ghost-pinky)", "trick", hem_wave=2, mouth="smile")
        elif f == 15:
            frame = make_ghost("url(#ghost-pinky)", "trick", hem_wave=-2, mouth="smile", sx=1.03, sy=0.97)
        elif f == 16:
            frame = make_ghost("url(#ghost-inky)", "forward", hem_wave=1, mouth="smile")
        elif f == 17:
            frame = make_ghost("url(#ghost-clyde)", "down", hem_wave=1, mouth="smile")
        elif f == 18:
            frame = make_ghost("none", "eyes_only")
        elif f == 19:
            frame = f'''<g>
              <path d="M 13 36 C 13 19, 51 19, 51 36 L 51 48 Q 45 53 39 48 Q 33 48 27 48 Q 21 53 13 48 Z" fill="none" stroke="#80deea" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.5"/>
              {make_ghost("none", "eyes_only")}
            </g>'''
        elif f == 20:
            frame = make_ghost("url(#ghost-white)", "forward", hem_wave=1, opacity=0.35)
        elif f == 21:
            frame = make_ghost("url(#ghost-white)", "forward", hem_wave=2, opacity=0.65)
        elif f == 22:
            spark = '<circle cx="46" cy="16" r="2.5" fill="#ffffff" opacity="0.9"/>'
            frame = make_ghost("url(#ghost-white)", "forward", hem_wave=1, extras=spark, opacity=0.95)
        elif f == 23:
            confetti = '<circle cx="16" cy="14" r="2" fill="#ff9ff3"/><circle cx="48" cy="14" r="2" fill="#54a0ff"/>'
            frame = make_ghost("url(#ghost-white)", "trick", hem_wave=3, mouth="smile", extras=confetti)
        elif f == 24:
            frame = make_ghost("url(#ghost-blue-vuln)", "vulnerable", hem_wave=3, mouth="fright")
        elif f == 25:
            bite = '<circle cx="45" cy="42" r="6" fill="#07111c" stroke="#ff4757" stroke-width="1.4"/>'
            frame = make_ghost("url(#ghost-blue-vuln)", "vulnerable", hem_wave=1, mouth="fright", extras=bite)
        elif f == 26:
            bite = '<circle cx="45" cy="42" r="7" fill="#07111c" stroke="#ff4757" stroke-width="1.4"/><circle cx="41" cy="47" r="5" fill="#07111c" stroke="#ff4757" stroke-width="1.4"/>'
            frame = make_ghost("url(#ghost-blue-vuln)", "vulnerable", hem_wave=1, mouth="fright", extras=bite)
        elif f == 27:
            bite = '<circle cx="43" cy="40" r="9" fill="#07111c" stroke="#ff4757" stroke-width="1.4"/><circle cx="37" cy="46" r="7" fill="#07111c" stroke="#ff4757" stroke-width="1.4"/>'
            frame = make_ghost("url(#ghost-blue-vuln)", "vulnerable", hem_wave=1, mouth="fright", extras=bite)
        elif f == 28:
            bite = '<circle cx="39" cy="38" r="12" fill="#07111c" stroke="#ff4757" stroke-width="1.4"/>'
            frame = make_ghost("url(#ghost-blue-vuln)", "vulnerable", hem_wave=1, mouth="fright", extras=bite)
        elif f == 29:
            trail = '<circle cx="32" cy="32" r="18" fill="url(#ghost-white)" opacity="0.2"/>'
            frame = trail + make_ghost("none", "eyes_only")
        elif f == 30:
            frame = make_ghost("url(#ghost-white)", "forward", hem_wave=1, opacity=0.25)
        elif f == 31:
            frame = make_ghost("url(#ghost-white)", "forward", hem_wave=2, opacity=0.45)
        elif f == 32:
            frame = make_ghost("url(#ghost-white)", "forward", hem_wave=-1, opacity=0.65)
        elif f == 33:
            frame = make_ghost("url(#ghost-white)", "forward", hem_wave=2, opacity=0.85)
        elif f == 34:
            frame = make_ghost("url(#ghost-white)", "forward", hem_wave=1, opacity=1.0)
        else: # 35
            teeth = '<polygon points="30,38 34,44 38,38" fill="#ffffff" stroke="#0d141e" stroke-width="1"/>'
            frame = make_ghost("url(#ghost-blinky)", "forward", hem_wave=3, mouth="open", extras=teeth)

        col = f % 6
        row = f // 6
        tx = col * 64
        ty = row * 64
        frames.append(f'<g transform="translate({tx} {ty})">\n{frame}\n</g>')

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="384" height="384" viewBox="0 0 384 384">
  <title>SCP-Pac_Update.exe - Ghost character atlas</title>
  <desc>36 clean vector 64x64 frames in SCP Explained style with bold outlines and expressive spectral animations.</desc>
  {defs}
  {''.join(frames)}
</svg>'''
    return svg

def main():
    root = Path(__file__).resolve().parent.parent
    assets_char = root / "assets" / "characters"

    pacmen_svg = generate_pacmen_atlas()
    # Validate with ElementTree before writing
    ET.fromstring(pacmen_svg)
    (assets_char / "pacmen-atlas.svg").write_text(pacmen_svg, encoding="utf-8")
    (assets_char / "runner-atlas.svg").write_text(pacmen_svg, encoding="utf-8")
    print(f"Validated and written pacmen-atlas.svg & runner-atlas.svg ({len(pacmen_svg)} bytes)")

    ghost_svg = generate_ghost_atlas()
    ET.fromstring(ghost_svg)
    (assets_char / "ghost-atlas.svg").write_text(ghost_svg, encoding="utf-8")
    print(f"Validated and written ghost-atlas.svg ({len(ghost_svg)} bytes)")

if __name__ == "__main__":
    main()
