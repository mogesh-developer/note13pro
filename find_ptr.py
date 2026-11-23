import struct, os, re

with open(r'c:\Users\Acer-Nitro\Documents\xiaomi\reference apkk\TechOffice_Xiaomi_Service_V0.9.59_CUSTOMER_TEST.exe', 'rb') as f:
    data = f.read()

# Let's search for "static/index.html"
target = b'static/index.html'
str_offset = data.find(target)
print('Target at:', str_offset)
# VA in .rdata: raw offset + 0x401800
str_va = str_offset + 0x401800
print('Target VA:', hex(str_va))

# Now search for 8-byte pointer with this value:
ptr_bytes = struct.pack('<Q', str_va)
matches = [m.start() for m in re.finditer(re.escape(ptr_bytes), data)]
print('Matches pointing to target VA:', matches)

# If not found directly, let's search across all potential offsets or check if ASLR / relocation base changed it
if not matches:
    print('Testing other base offsets...')
    for delta in range(-0x200000, 0x200000, 0x1000):
        test_va = str_offset + 0x400000 + delta
        m = [i.start() for i in re.finditer(re.escape(struct.pack('<Q', test_va)), data)]
        if m:
            print(f'Found match with delta {hex(delta)} at data offsets {m}')
            break
