from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from toolkit.devices.manager import DeviceManager
from toolkit.core.platform_tools import PlatformTools
from toolkit.firmware.inspector import FirmwarePackage
from toolkit.flasher.engine import FlasherEngine, FlashPlan
from toolkit.unlock.mi_unlock import MiUnlockService
from toolkit.drivers.service import DriverService
from toolkit.root.service import RootService
from toolkit.database.db import Database

app = FastAPI(title="Open Xiaomi Service API", version="1.0.0")
db = Database()
flasher = FlasherEngine()

class CommandRequest(BaseModel):
    tool: str  # 'adb' or 'fastboot'
    command: str
    serial: Optional[str] = None

class FlashRequest(BaseModel):
    mode: str
    target_serial: str
    files: List[Dict[str, str]]
    script_path: Optional[str] = None

@app.get("/api/status")
def get_api_status():
    return {
        "status": "online",
        "registration_required": False,
        "local_first": True,
        "tools": PlatformTools.get_versions()
    }

@app.get("/api/devices")
def scan_devices():
    devices = DeviceManager.scan_all_devices()
    return [d.to_dict() for d in devices]

@app.post("/api/commands/run")
def run_command(req: CommandRequest):
    exe = PlatformTools.get_adb_path() if req.tool == "adb" else PlatformTools.get_fastboot_path()
    if not exe:
        raise HTTPException(status_code=400, detail=f"{req.tool} executable not found")

    args = [exe]
    if req.serial:
        args.extend(["-s", req.serial])
    args.extend(req.command.split())

    code, out = DeviceManager.run_cmd(args, timeout=15)
    db.log_command(req.tool, req.command, code, out)
    return {"exit_code": code, "output": out}

@app.post("/api/firmware/inspect")
def inspect_firmware(payload: Dict[str, str]):
    path = payload.get("path")
    if not path:
        raise HTTPException(status_code=400, detail="Missing path parameter")
    pkg = FirmwarePackage(path)
    return pkg.inspect()

@app.get("/api/unlock/info")
def get_unlock_info():
    official_tool = MiUnlockService.find_official_unlock_tool()
    prereqs = MiUnlockService.get_unlock_prerequisites()
    return {
        "official_tool_installed": official_tool is not None,
        "tool_path": official_tool or "",
        "guide": prereqs
    }

@app.get("/api/drivers/status")
def get_drivers_status():
    return DriverService.get_status()

@app.get("/api/root/resources")
def get_root_resources():
    return RootService.OFFICIAL_RESOURCES

@app.get("/api/presets")
def get_command_presets():
    return db.get_presets()
