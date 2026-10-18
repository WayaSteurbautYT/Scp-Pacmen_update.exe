import math
from pathlib import Path

cx, cy, r = 32, 32, 22
half = math.radians(25)
x_top = cx + r * math.cos(-half)
y_top = cy + r * math.sin(-half)
x_bot = cx + r * math.cos(half)
y_bot = cy + r * math.sin(half)
body_path = f"M {cx} {cy} L {x_top:.2f} {y_top:.2f} A {r} {r} 0 1 0 {x_bot:.2f} {y_bot:.2f} Z"

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <radialGradient id="gold" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#fff580"/>
      <stop offset="40%" stop-color="#ffd32a"/>
      <stop offset="100%" stop-color="#f39c12"/>
    </radialGradient>
  </defs>
  <path d="{body_path}" fill="url(#gold)" stroke="#0d141e" stroke-width="2.5" stroke-linejoin="round"/>
  <!-- Highlight -->
  <path d="M 16 28 A 16 16 0 0 1 32 16" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
  <!-- Expressive Eye -->
  <ellipse cx="28" cy="20" rx="4.5" ry="6.5" fill="#ffffff" stroke="#0d141e" stroke-width="1.8"/>
  <ellipse cx="29.5" cy="20" rx="2.5" ry="3.8" fill="#102538"/>
  <circle cx="28.5" cy="18" r="1.1" fill="#ffffff"/>
  <path d="M 25 13 Q 28 11 32 13" fill="none" stroke="#0d141e" stroke-width="1.6" stroke-linecap="round"/>
</svg>'''

Path("test_frame.svg").write_text(svg, encoding="utf-8")
print("Saved test_frame.svg successfully!")
