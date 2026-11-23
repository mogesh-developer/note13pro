import re

with open('analysis/frontend/page_0.html', 'r', encoding='utf-8') as f:
    html = f.read()

scripts = re.findall(r'<script[^>]*src=[\'"]([^\'"]+)[\'"]', html)
css = re.findall(r'<link[^>]*href=[\'"]([^\'"]+)[\'"]', html)

print("Scripts found in HTML:")
for s in scripts:
    print("  ", s)

print("\nCSS found in HTML:")
for c in css:
    print("  ", c)

# Let's also look for major UI tabs / nav buttons in HTML
nav_buttons = re.findall(r'data-view=[\'"]([^\'"]+)[\'"]', html)
print("\nViews / Tabs found (data-view):", set(nav_buttons))

tab_buttons = re.findall(r'id=[\'"](tab-[^\'"]+|btn-[^\'"]+|view-[^\'"]+)[\'"]', html)
print("\nTab/Button IDs found:", sorted(set(tab_buttons)))

headers = re.findall(r'<h[1-4][^>]*>(.*?)</h[1-4]>', html)
print(f"\nDiscovered {len(headers)} headings:")
for h in headers[:30]:
    clean_h = re.sub('<[^<]+?>', '', h).strip()
    if clean_h:
        print("   -", clean_h)
