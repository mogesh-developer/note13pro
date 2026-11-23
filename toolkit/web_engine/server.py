import os
import json
import shutil
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware

from toolkit.devices.manager import DeviceManager
from toolkit.core.platform_tools import PlatformTools
from toolkit.firmware.inspector import FirmwarePackage
from toolkit.devices.packages import PackageService
from toolkit.unlock.mi_unlock import MiUnlockService
from toolkit.unlock.hyperos_fix import HyperOSFixService
from toolkit.drivers.service import DriverService
from toolkit.drivers.fastboot_fix import FastbootFixService
from toolkit.flasher.hybrid import HybridFlasher
from toolkit.database.db import Database

FRONTEND_DIR = Path(r"c:\Users\Acer-Nitro\Documents\xiaomi\analysis\frontend")

app = FastAPI(title="TechOffice Xiaomi Service Local Engine")
db = Database()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory jobs tracking
active_jobs: Dict[str, Dict[str, Any]] = {}
job_seq = 0

def make_job(action: str, status: str = "running") -> str:
    global job_seq
    job_seq += 1
    jid = f"job-{job_seq}"
    active_jobs[jid] = {
        "id": jid,
        "action": action,
        "status": status,
        "progress": 100 if status == "completed" else 0,
        "log": f"Started {action}\n"
    }
    return jid

# 1. Main HTML Page
@app.get("/")
def serve_root():
    index_file = FRONTEND_DIR / "index.html"
    with open(index_file, "r", encoding="utf-8") as f:
        content = f.read()
    # Inject token and replace CSRF token
    content = content.replace("__CSRF_TOKEN__", "local-token-free")
    content = content.replace("let TOKEN=''", "let TOKEN='local-token-free'")
    content = content.replace("let TOKEN = ''", "let TOKEN='local-token-free'")
    return HTMLResponse(content)

# 2. License Bypass Endpoints (Permanently Active & Registered)
@app.post("/api/license/status")
@app.get("/api/license/status")
def license_status():
    return {
        "active": True,
        "licensed": True,
        "type": "LIFETIME_COMMUNITY_UNLOCKED",
        "customer": "Customer (Offline Licensed)",
        "expires_in": "99999 days",
        "valid": True
    }

@app.post("/api/license/activate")
def license_activate():
    return {"success": True, "message": "Software is permanently activated (Free & Local-First)."}

@app.post("/api/license/renew")
def license_renew():
    return {"success": True, "message": "Lifetime license renewed."}

# 3. Device Scanning & Diagnostics
@app.post("/api/scan")
@app.get("/api/scan")
def scan_devices():
    devices = DeviceManager.scan_all_devices()
    # Check if Fastboot device is attached but missing Windows driver
    fb_hw = FastbootFixService.check_fastboot_driver_status()

    device_list = []
    for d in devices:
        device_list.append({
            "serial": d.serial,
            "mode": d.mode,
            "product": d.product or d.model or "xiaomi_device",
            "model": d.model or d.product or "Xiaomi Device",
            "state": d.mode,
            "unlocked": d.details.get("unlocked", "unknown"),
            "details": d.details
        })

    return {
        "devices": device_list,
        "active": device_list[0] if device_list else None,
        "fastboot_driver_missing": fb_hw.get("driver_missing", False),
        "fastboot_hardware": fb_hw
    }

@app.post("/api/inspect")
def inspect_device(payload: Dict[str, Any] = {}):
    devices = DeviceManager.scan_all_devices()
    active = devices[0].to_dict() if devices else {}
    return {"device": active, "connected": len(devices) > 0}

@app.post("/api/diagnostics/preflight")
def preflight_diagnostics():
    devices = DeviceManager.scan_all_devices()
    active = devices[0] if devices else None
    return {
        "ready": active is not None,
        "device": active.to_dict() if active else None,
        "warnings": []
    }

# 4. Command Execution
@app.post("/api/commands/run")
@app.post("/api/commands/manual")
def execute_command(payload: Dict[str, Any]):
    cmd = payload.get("command") or payload.get("cmd") or ""
    tool = payload.get("tool") or "fastboot" if "fastboot" in cmd else "adb"
    
    parts = cmd.split()
    if not parts:
        return {"exit_code": 0, "output": ""}

    if parts[0] in ["adb", "fastboot"]:
        tool = parts[0]
        args_tail = parts[1:]
    else:
        args_tail = parts

    exe = PlatformTools.get_adb_path() if tool == "adb" else PlatformTools.get_fastboot_path()
    if not exe:
        return {"exit_code": -1, "output": f"{tool} executable not found."}

    code, out = DeviceManager.run_cmd([exe] + args_tail, timeout=20)
    db.log_command(tool, cmd, code, out)
    return {"exit_code": code, "output": out, "log": out}

# 5. Fastboot & Drivers
@app.post("/api/drivers/status")
@app.get("/api/drivers/status")
def drivers_status():
    status = DriverService.get_status()
    fb_hw = FastbootFixService.check_fastboot_driver_status()
    return {
        **status,
        "fastboot_hardware_detected": fb_hw.get("connected", False),
        "fastboot_driver_missing": fb_hw.get("driver_missing", False),
        "fastboot_notice": fb_hw.get("message", "")
    }

@app.post("/api/drivers/install-signed-inf")
def install_fastboot_inf():
    res = FastbootFixService.launch_admin_installer()
    return {"success": res, "message": "Elevated driver installation launched."}

# 6. Mi Unlock & HyperOS Integration
@app.post("/api/mi-unlock/status")
def mi_unlock_status():
    tool = MiUnlockService.find_official_unlock_tool()
    prereq = MiUnlockService.get_unlock_prerequisites()
    return {
        "installed": tool is not None,
        "tool_path": tool or "",
        "guide": prereq
    }

@app.post("/api/mi-unlock/launch")
def mi_unlock_launch():
    tool = MiUnlockService.find_official_unlock_tool()
    if tool:
        MiUnlockService.launch_tool(tool)
        return {"success": True, "message": f"Launched {tool}"}
    return {"success": False, "error": "Official MiFlash Unlock tool not found on disk."}

# 7. Package Debloater & Dialer Fixes
@app.post("/api/dialer/status")
def dialer_status():
    devices = [d for d in DeviceManager.scan_adb_devices() if d.mode == "device"]
    if not devices:
        return {"google_dialer_installed": False, "miui_dialer_installed": False}
    return PackageService.get_dialer_status(devices[0].serial)

@app.post("/api/dialer/action")
def dialer_action(payload: Dict[str, Any]):
    action = payload.get("action", "")
    devices = [d for d in DeviceManager.scan_adb_devices() if d.mode == "device"]
    if not devices:
        return {"error": "No ADB device connected"}
    serial = devices[0].serial

    if action == "remove_google":
        code, out = PackageService.disable_google_dialer(serial)
    elif action == "restore_google":
        code, out = PackageService.restore_google_dialer(serial)
    else:
        code, out = 0, "No action"
    return {"exit_code": code, "output": out}

@app.post("/api/packages")
def list_packages():
    devices = [d for d in DeviceManager.scan_adb_devices() if d.mode == "device"]
    if not devices:
        return {"packages": []}
    return {"packages": PackageService.scan_bloatware(devices[0].serial)}

# 8. Archive & Firmware Inspection
@app.post("/api/archive/inspect")
def inspect_archive(payload: Dict[str, Any]):
    path = payload.get("path", "")
    if not path or not os.path.exists(path):
        return {"error": "Invalid archive path"}
    pkg = FirmwarePackage(path)
    return pkg.inspect()

# 9. Generic Jobs
@app.post("/api/jobs")
def get_jobs():
    return {"jobs": list(active_jobs.values())}

@app.post("/api/jobs/cancel")
def cancel_job(payload: Dict[str, Any]):
    jid = payload.get("id")
    if jid in active_jobs:
        active_jobs[jid]["status"] = "cancelled"
    return {"success": True}

# 10. Mount all static files
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR)), name="static")
