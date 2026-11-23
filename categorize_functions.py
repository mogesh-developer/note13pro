import os, re, glob, json

# Let's inspect how backend routes and handlers are bound in Go!
# We can search the binary for string literals around route handlers or inspect main.* functions.

with open('analysis/main_functions.txt', 'r', encoding='utf-8') as f:
    funcs = [line.strip() for line in f if line.strip()]

print(f"Total main functions in reference: {len(funcs)}")

# Categorize backend functions
categories = {
    'device_detection': [],
    'commands_adb_fastboot': [],
    'firmware_rom_archive': [],
    'flashing_stock_hybrid': [],
    'recovery_sideload': [],
    'mi_unlock': [],
    'drivers_platform_tools': [],
    'downloads': [],
    'root_boot_patch': [],
    'licensing_activation': [],
    'server_jobs_logs': []
}

for fn in funcs:
    low = fn.lower()
    if any(k in low for k in ['license', 'activate', 'activation', 'gate', 'token', 'auth']):
        categories['licensing_activation'].append(fn)
    elif any(k in low for k in ['device', 'scan', 'dialer', 'erase', 'battery', 'props', 'getprop']):
        categories['device_detection'].append(fn)
    elif any(k in low for k in ['command', 'adb', 'fastboot', 'manual', 'runcommand', 'terminal']):
        categories['commands_adb_fastboot'].append(fn)
    elif any(k in low for k in ['archive', 'zip', 'tgz', 'tar', 'extract', 'ota', 'payload', 'rom', 'catalog']):
        categories['firmware_rom_archive'].append(fn)
    elif any(k in low for k in ['flash', 'stage', 'plan', 'stock', 'hybrid', 'image']):
        categories['flashing_stock_hybrid'].append(fn)
    elif any(k in low for k in ['sideload', 'recovery', 'bootonce']):
        categories['recovery_sideload'].append(fn)
    elif any(k in low for k in ['unlock', 'miunlock']):
        categories['mi_unlock'].append(fn)
    elif any(k in low for k in ['driver', 'inf', 'platformtool']):
        categories['drivers_platform_tools'].append(fn)
    elif any(k in low for k in ['download', 'retry', 'chunk']):
        categories['downloads'].append(fn)
    elif any(k in low for k in ['root', 'magisk', 'patch', 'kernelsu', 'apatch']):
        categories['root_boot_patch'].append(fn)
    else:
        categories['server_jobs_logs'].append(fn)

for cat, f_list in categories.items():
    print(f"\n--- {cat} ({len(f_list)} symbols) ---")
    for f in f_list[:12]:
        print("  ", f)

with open(r'c:\Users\Acer-Nitro\Documents\xiaomi\analysis\function_inventory.json', 'w', encoding='utf-8') as out:
    json.dump(categories, out, indent=2)
