# Добавить в манифест листы персонажей (chars.json после pack_chars.py) и предметы (origins.json из render_0ad.py).
# Запуск: python3 -I merge_sheets.py <папка с chars.json/origins.json и *.webp> <assets/flare>
import sys, json, shutil, os
SRC, OUT = sys.argv[1], sys.argv[2]
man = json.load(open(f'{OUT}/manifest.json'))
done = []
for name, sect in (('chars.json', 'sheets'), ('origins.json', 'origins')):
    if not os.path.exists(f'{SRC}/{name}'): continue
    for k, v in json.load(open(f'{SRC}/{name}')).items():
        man[sect][k] = v
        shutil.copy(f'{SRC}/{k}.webp', f'{OUT}/{k}.webp')
        done.append(k)
json.dump(man, open(f'{OUT}/manifest.json', 'w'), indent=1)
print('merged:', ', '.join(done))
