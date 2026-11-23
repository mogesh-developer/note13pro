import os, re, glob, json

frontend_dir = r'c:\Users\Acer-Nitro\Documents\xiaomi\analysis\frontend'
js_files = glob.glob(os.path.join(frontend_dir, '*.js'))

features = {}

for js_path in sorted(js_files):
    fname = os.path.basename(js_path)
    with open(js_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Find all fetch/API calls
    fetch_calls = re.findall(r'fetch\([\'"`]([^\'"`]+)[\'"`]', content)
    # Also find endpoints like /api/...
    api_endpoints = re.findall(r'[\'"`](/api/[^\'"`\s\?]+)[\'"`]', content)
    # Find function names
    funcs = re.findall(r'function\s+([a-zA-Z0-9_$]+)\s*\(', content)
    # Find async functions
    async_funcs = re.findall(r'async\s+function\s+([a-zA-Z0-9_$]+)\s*\(', content)
    
    features[fname] = {
        'size': len(content),
        'fetch_calls': sorted(set(fetch_calls)),
        'api_endpoints': sorted(set(api_endpoints)),
        'functions': sorted(set(funcs + async_funcs))[:20]
    }

with open(r'c:\Users\Acer-Nitro\Documents\xiaomi\analysis\frontend_features_summary.json', 'w', encoding='utf-8') as out:
    json.dump(features, out, indent=2)

print(f"Analyzed {len(js_files)} JavaScript files.")
for fname, info in features.items():
    print(f"\n[{fname}] ({info['size']} bytes):")
    if info['api_endpoints']:
        print("  Endpoints:", ", ".join(info['api_endpoints'][:6]))
    if info['functions']:
        print("  Functions:", ", ".join(info['functions'][:6]))
