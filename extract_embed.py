import os, sys, re, struct

exe_path = r'c:\Users\Acer-Nitro\Documents\xiaomi\reference apkk\TechOffice_Xiaomi_Service_V0.9.59_CUSTOMER_TEST.exe'
with open(exe_path, 'rb') as f:
    data = f.read()

out_dir = r'c:\Users\Acer-Nitro\Documents\xiaomi\analysis\frontend'
os.makedirs(out_dir, exist_ok=True)

# List of files to extract
files_to_find = [
    'app.css',
    'app.js',
    'features.js',
    'v04.js',
    'v06.js',
    'v07.js',
    'v09.js',
    'v091.js',
    'v093.js',
    'v095.js',
    'v096.js',
    'v097.js',
    'v099.js',
    'v0911.js',
    'v0913.js',
    'v0914.js',
    'v0915.js',
    'v0919_flash_ui.js',
    'v0919_usb.js',
    'v0927_manual.js',
    'v0927_mi_unlock.js',
    'v0928_download_manager.js',
    'v0936_download_browser.js',
    'v0937_activity.js',
    'v0938_root.js',
    'v0939_activation.js',
    'v0940_hybrid.js',
    'v0942_aosp.js',
    'v0943_remote_img.js',
    'v0945_support.js',
    'v0945_welcome.js',
    'v0952_drivers.js',
    'v0958_recovery_manual.js'
]

# Let's inspect embed.FS in Go 1.23.
# In Go embed:
# type FS struct { files *[]file }
# type file struct {
#     name string (ptr 8, len 8)
#     data string (ptr 8, len 8)
#     hash [16]byte
# } (Total 48 bytes per file struct)
# Let's search for occurrences of a pointer to "app.css" in .data / .rdata sections!

# ImageBase is 0x400000.
# Let's find string table address.
# First find where the string "app.css" is:
str_pos = [m.start() for m in re.finditer(b'app\\.css', data)]
print('app.css string pos:', str_pos)

# Map raw file offset to VA:
# .rdata: VAddr=0x3f7000, RawOffset=0x3f5800 -> VA = 0x400000 + 0x3f7000 + (raw - 0x3f5800) = raw + 0x401800
def raw_to_va(offset):
    # .text: VAddr=0x1000, RawOffset=0x600 -> VA = 0x400000 + 0x1000 + (offset - 0x600) = offset + 0x400a00
    # .rdata: VAddr=0x3f7000, RawOffset=0x3f5800 -> VA = 0x400000 + 0x3f7000 + (offset - 0x3f5800) = offset + 0x401800
    # .data: VAddr=0x89c000, RawOffset=0x89a000 -> VA = 0x400000 + 0x89c000 + (offset - 0x89a000) = offset + 0x402000
    if offset >= 0x89a000:
        return offset + 0x402000
    elif offset >= 0x3f5800:
        return offset + 0x401800
    elif offset >= 0x600:
        return offset + 0x400a00
    return offset + 0x400000

def va_to_raw(va):
    if va >= 0x400000 + 0x89c000:
        return va - 0x402000
    elif va >= 0x400000 + 0x3f7000:
        return va - 0x401800
    elif va >= 0x400000 + 0x1000:
        return va - 0x400a00
    return va - 0x400000

# Let's check each string position and see if its VA appears in a 64-bit pointer
found_table = False
for sp in str_pos:
    va = raw_to_va(sp)
    packed_va = struct.pack('<Q', va)
    ptrs = [m.start() for m in re.finditer(re.escape(packed_va), data)]
    print(f'String at {sp} (VA {hex(va)}) pointed to by offsets: {ptrs}')
    for p in ptrs:
        # Check if struct is: (name_ptr, name_len=7, data_ptr, data_len, hash)
        try:
            name_ptr, name_len, data_ptr, data_len = struct.unpack_from('<QQQQ', data, p)
            if name_len == 7:
                print(f'Match at {p}! data_ptr={hex(data_ptr)}, data_len={data_len}')
                data_raw = va_to_raw(data_ptr)
                print(f'data_raw={data_raw}, content preview: {data[data_raw:data_raw+60]}')
                found_table = p
                break
        except Exception as e:
            pass

if found_table:
    print('Found file struct at:', found_table)
    # Let's walk backwards to the beginning of the table and forwards to extract all embedded files!
    # A file struct is 48 bytes (or 32 bytes). Let's test struct size:
    # Check 48 bytes vs 32 bytes vs 64 bytes
    entry_size = 48 # standard Go embed
    # Check if entry_size 48 works
    # Let's scan from table start
    # Let's find array start by stepping -entry_size as long as name_ptr is valid
    start = found_table
    while start >= entry_size:
        prev = start - entry_size
        n_ptr, n_len, d_ptr, d_len = struct.unpack_from('<QQQQ', data, prev)
        if 0 < n_len < 100 and 0 < d_len < 20000000:
            n_raw = va_to_raw(n_ptr)
            if 0 <= n_raw < len(data) - n_len:
                name_test = data[n_raw:n_raw+n_len].decode('latin1')
                if any(c in name_test for c in ['.', '/', 'a', 'e']):
                    start = prev
                    continue
        break
    print(f'Table starts around: {start}')
    
    # Now extract all files from start
    extracted = 0
    curr = start
    while curr < len(data) - entry_size:
        n_ptr, n_len, d_ptr, d_len = struct.unpack_from('<QQQQ', data, curr)
        if not (0 < n_len < 150 and 0 <= d_len < 25000000):
            break
        n_raw = va_to_raw(n_ptr)
        d_raw = va_to_raw(d_ptr)
        if not (0 <= n_raw < len(data) - n_len and 0 <= d_raw <= len(data) - d_len):
            break
        name = data[n_raw:n_raw+n_len].decode('utf-8', errors='ignore')
        # Check if valid file name
        if not any(name.endswith(ext) for ext in ['.js', '.css', '.html', '.png', '.ico', '.svg', '.json', '.txt', '.bat']):
            # Maybe end of table
            break
        file_bytes = data[d_raw:d_raw+d_len]
        target_path = os.path.join(out_dir, os.path.basename(name))
        with open(target_path, 'wb') as out_f:
            out_f.write(file_bytes)
        print(f'Extracted {name} -> {target_path} ({d_len} bytes)')
        extracted += 1
        curr += entry_size

    print(f'Successfully extracted {extracted} embedded files!')
