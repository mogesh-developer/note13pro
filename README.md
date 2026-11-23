# Open Xiaomi Service Toolkit (Free & Local-First)

An independent, local-first, registration-free Windows servicing toolkit for Xiaomi, Redmi, and POCO devices. Built with Python 3.12, PySide6, and Android SDK Platform Tools.

---

## Key Features

1. **Local-First & Registration-Free**
   - Zero login screens, zero mandatory subscriptions, zero licensing server checks.
   - All settings, presets, and operation logs are stored in a local SQLite database (`~/.open_xiaomi_toolkit/toolkit.db`).
   - No telemetry or device identifiers are sent to external servers.

2. **Device Dashboard**
   - Real-time ADB and Fastboot detection.
   - Comprehensive device property parsing (codename, product, model, build incremental, MIUI/HyperOS version, bootloader lock state, battery metrics).

3. **ADB & Fastboot Console**
   - Direct execution of ADB and Fastboot commands with live stdout/stderr capture.
   - Preset quick-commands (reboot to bootloader, recovery, fastbootd, EDL 9008, getvar all, oem device-info).
   - Preflight warnings for destructive commands (`erase`, `format`, `unlock`).

4. **Firmware & ROM Archive Inspector**
   - Deep inspection of `.zip`, `.tgz`, `.tar.gz`, `.tar`, and extracted firmware folders.
   - Partition image discovery (`boot.img`, `super.img`, `recovery.img`, `init_boot.img`, etc.).
   - Path-traversal safe extraction.

5. **Flashing Engine**
   - Official OEM flash script execution (`flash_all.bat`).
   - Batch partition flashing.
   - ADB sideload for recovery OTA zip packages.
   - Safety checks and user confirmation before destructive writes.

6. **Mi Unlock Integration**
   - Automatically detects official MiFlash Unlock installations.
   - Clear guidance on Xiaomi's required server-side account binding, SIM card linking, and wait periods.

7. **Download Manager & Root Utilities**
   - Resumable file downloads with SHA-256 integrity validation.
   - Root framework guides (Magisk, KernelSU, APatch) and boot image discovery.

---

## Running the Application

### Option 1: Direct Python Execution
```powershell
python main.py
```

### Option 2: Prebuilt Windows Executable
Launch `dist/OpenXiaomiToolkit/OpenXiaomiToolkit.exe`.

---

## Running Automated Tests
```powershell
pytest tests/test_toolkit.py
```
