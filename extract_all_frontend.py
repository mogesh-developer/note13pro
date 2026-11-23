import struct, os

with open(r'c:\Users\Acer-Nitro\Documents\xiaomi\reference apkk\TechOffice_Xiaomi_Service_V0.9.59_CUSTOMER_TEST.exe', 'rb') as f:
    data = f.read()

out_dir = r'c:\Users\Acer-Nitro\Documents\xiaomi\analysis\frontend'
os.makedirs(out_dir, exist_ok=True)

# Step is exactly 48 bytes!
# Let's find the start and end of this array.
step = 48
index_pos = 6712536

# Find start
curr = index_pos
while True:
    prev = curr - step
    name_va, name_len, data_va, data_len = struct.unpack_from('<QQQQ', data, prev)
    name_raw = name_va - 0x401800
    if 0 <= name_raw < len(data) - name_len and 0 < name_len < 100:
        name = data[name_raw:name_raw+name_len].decode('latin1', errors='ignore')
        if name.startswith('static/'):
            curr = prev
            continue
    break

table_start = curr
print(f'Table starts at {table_start}')

# Find end and extract all
curr = table_start
count = 0
manifest = []

while True:
    name_va, name_len, data_va, data_len = struct.unpack_from('<QQQQ', data, curr)
    name_raw = name_va - 0x401800
    data_raw = data_va - 0x401800
    if not (0 <= name_raw < len(data) - name_len and 0 < name_len < 100):
        break
    name = data[name_raw:name_raw+name_len].decode('utf-8', errors='ignore')
    if not name.startswith('static/'):
        break
    
    file_bytes = data[data_raw:data_raw+data_len]
    rel_name = name[len('static/'):]
    dest = os.path.join(out_dir, rel_name)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, 'wb') as f_out:
        f_out.write(file_bytes)
    
    print(f"[{count+1}] Extracted {name} ({data_len} bytes) -> {dest}")
    manifest.append((name, data_len, dest))
    curr += step
    count += 1

print(f"\nExtraction complete! Total files extracted: {count}")
