import struct, os

with open(r'c:\Users\Acer-Nitro\Documents\xiaomi\reference apkk\TechOffice_Xiaomi_Service_V0.9.59_CUSTOMER_TEST.exe', 'rb') as f:
    data = f.read()

out_dir = r'c:\Users\Acer-Nitro\Documents\xiaomi\analysis\frontend'
os.makedirs(out_dir, exist_ok=True)

# 6712536 is a pointer to static/index.html!
# Let's inspect the memory surrounding 6712536
print("Inspecting table entries around 6712536:")

# Let's see how Go embed.FS slice is represented:
# In Go:
# type FS struct { files *[]file }
# A slice is ptr, len, cap (24 bytes)
# Let's check struct size for each file entry:
# Is it 32, 40, 48, or something else?
# Let's check offsets:
for step in [24, 32, 40, 48, 56, 64]:
    print(f"\n--- Testing step {step} ---")
    for k in range(-2, 5):
        pos = 6712536 + k * step
        fields = struct.unpack_from('<QQQQ', data, pos)
        # Check if first field is valid VA pointer to string
        name_va, name_len, data_va, data_len = fields
        name_raw = name_va - 0x401800
        if 0 <= name_raw < len(data) - name_len and 0 < name_len < 100:
            name = data[name_raw:name_raw+name_len].decode('latin1', errors='ignore')
            print(f"k={k} pos={pos}: name='{name}' (len {name_len}), data_va={hex(data_va)}, data_len={data_len}")
