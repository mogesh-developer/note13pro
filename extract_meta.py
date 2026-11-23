import os, re

exe_path = r'c:\Users\Acer-Nitro\Documents\xiaomi\reference apkk\TechOffice_Xiaomi_Service_V0.9.59_CUSTOMER_TEST.exe'
with open(exe_path, 'rb') as f:
    data = f.read()

os.makedirs(r'c:\Users\Acer-Nitro\Documents\xiaomi\analysis', exist_ok=True)

# 1. Main functions
funcs = sorted(set(re.findall(rb'main\.[a-zA-Z0-9_\.]+', data)))
print(f'Total main functions/types: {len(funcs)}')
with open(r'c:\Users\Acer-Nitro\Documents\xiaomi\analysis\main_functions.txt', 'w', encoding='utf-8') as out:
    for fn in funcs:
        out.write(fn.decode(errors='ignore') + '\n')

# 2. API routes
route_matches = sorted(set(re.findall(rb'/api/[a-zA-Z0-9_/\-]+', data)))
with open(r'c:\Users\Acer-Nitro\Documents\xiaomi\analysis\api_routes.txt', 'w', encoding='utf-8') as out:
    for r in route_matches:
        out.write(r.decode(errors='ignore') + '\n')

print(f'Extracted {len(route_matches)} api routes')
for r in route_matches[:30]:
    print(' ', r.decode(errors='ignore'))
