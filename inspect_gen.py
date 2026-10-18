from pathlib import Path

p = Path('generate_spritesheets.py')
lines = p.read_text(encoding='utf-8').splitlines()
for i in range(44, 60):
    print(i + 1, repr(lines[i]))
