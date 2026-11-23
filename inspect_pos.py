with open(r'c:\Users\Acer-Nitro\Documents\xiaomi\reference apkk\TechOffice_Xiaomi_Service_V0.9.59_CUSTOMER_TEST.exe', 'rb') as f:
    data = f.read()

for pos in [4891903, 4909692, 5628013]:
    print(f"--- Pos {pos} ---")
    print(repr(data[max(0, pos-40):pos+60]))
