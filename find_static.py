import re

with open(r'c:\Users\Acer-Nitro\Documents\xiaomi\reference apkk\TechOffice_Xiaomi_Service_V0.9.59_CUSTOMER_TEST.exe', 'rb') as f:
    data = f.read()

# Notice "static/app.css"!
# Let's search for "static/" occurrences in the binary
static_pos = [m.start() for m in re.finditer(b'static/', data)]
print(f"Found {len(static_pos)} occurrences of 'static/':")
for p in static_pos[:20]:
    print(p, repr(data[p:p+40]))
