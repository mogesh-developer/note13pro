import os, glob, re

frontend_dir = r'c:\Users\Acer-Nitro\Documents\xiaomi\analysis\frontend'
for f in sorted(glob.glob(os.path.join(frontend_dir, '*.js'))):
    with open(f, 'r', encoding='utf-8') as fp:
        txt = fp.read()
    calls = re.findall(r'api\([\'"]([^\'"]+)[\'"]', txt)
    if calls:
        print(os.path.basename(f), '->', sorted(set(calls)))
