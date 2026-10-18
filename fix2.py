from pathlib import Path

p = Path('generate_spritesheets.py')
lines = p.read_text(encoding='utf-8').splitlines()
print('before:', repr(lines[235]))

lines[235] = '    (folder / (rel + ".svg")).write_text('

p.write_text('\n'.join(lines) + '\n', encoding='utf-8')
print('after:', repr(lines[235]))
