from pathlib import Path

p = Path('generate_spritesheets.py')
lines = p.read_text(encoding='utf-8').splitlines()
for i, line in enumerate(lines):
    if 'rel +' in line:
        print('found at', i + 1, repr(line))
