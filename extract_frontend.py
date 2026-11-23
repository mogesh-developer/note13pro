import os, re, sys

exe_path = r'c:\Users\Acer-Nitro\Documents\xiaomi\reference apkk\TechOffice_Xiaomi_Service_V0.9.59_CUSTOMER_TEST.exe'
with open(exe_path, 'rb') as f:
    data = f.read()

out_dir = r'c:\Users\Acer-Nitro\Documents\xiaomi\analysis\frontend'
os.makedirs(out_dir, exist_ok=True)

# Let's locate all occurrences of embedded static files.
# Notice that HTML starts with <!DOCTYPE html> or <html>
# Let's search for <!DOCTYPE html>
html_starts = [m.start() for m in re.finditer(rb'<!DOCTYPE html>', data, re.IGNORECASE)]
print('HTML starts:', html_starts)

for i, start in enumerate(html_starts):
    # Find </html>
    end = data.find(b'</html>', start)
    if end != -1:
        end += len(b'</html>')
        html_content = data[start:end].decode('utf-8', errors='ignore')
        out_file = os.path.join(out_dir, f'page_{i}.html')
        with open(out_file, 'w', encoding='utf-8') as out:
            out.write(html_content)
        print(f'Wrote {out_file} (length {len(html_content)})')

# Now let's find JS files.
# In web applications or Go embed, scripts often have header comments or recognizable start/end.
# Or let's see how files are referenced in page_0.html!
