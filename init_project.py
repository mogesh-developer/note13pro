import os, sys

core_dirs = [
    'toolkit',
    'toolkit/core',
    'toolkit/devices',
    'toolkit/firmware',
    'toolkit/flasher',
    'toolkit/downloader',
    'toolkit/root',
    'toolkit/unlock',
    'toolkit/drivers',
    'toolkit/database',
    'toolkit/ui',
    'toolkit/ui/components',
    'toolkit/ui/views',
    'tests'
]

for d in core_dirs:
    os.makedirs(os.path.join(r'c:\Users\Acer-Nitro\Documents\xiaomi', d), exist_ok=True)
    init_py = os.path.join(r'c:\Users\Acer-Nitro\Documents\xiaomi', d, '__init__.py')
    if not os.path.exists(init_py):
        with open(init_py, 'w', encoding='utf-8') as f:
            f.write('"""Open Xiaomi Service Toolkit Module"""\n')

print("Created modular project directory tree.")
