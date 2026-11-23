import os
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional

class MiUnlockService:
    @staticmethod
    def find_official_unlock_tool() -> Optional[str]:
        """Search common installation directories for batch_unlock.exe or miflash_unlock.exe."""
        search_dirs = [
            Path.home() / "Downloads",
            Path.home() / "Desktop",
            Path("C:/miflash_unlock"),
            Path("C:/MiUnlock"),
            Path("C:/Program Files/Xiaomi/MiFlashUnlock"),
            Path("C:/Program Files (x86)/Xiaomi/MiFlashUnlock")
        ]
        
        target_names = ["miflash_unlock.exe", "batch_unlock.exe"]
        for d in search_dirs:
            if d.exists():
                for root, _, files in os.walk(d):
                    for f in files:
                        if f.lower() in target_names:
                            return str(Path(root) / f)
        return None

    @staticmethod
    def get_unlock_prerequisites() -> Dict[str, Any]:
        return {
            "title": "Xiaomi Bootloader Unlock Official Procedure",
            "steps": [
                {
                    "step": 1,
                    "title": "Xiaomi Account & SIM Card Binding",
                    "description": "On the phone, go to Settings -> Developer Options -> Mi Unlock Status. Tap 'Add account and device'. The device MUST have mobile data active on the SIM card linked to the Xiaomi Account."
                },
                {
                    "step": 2,
                    "title": "Mandatory Wait Period",
                    "description": "Xiaomi enforces a server-side timer (normally 168 hours / 7 days, or up to 30 days on HyperOS / Chinese accounts). No third-party tool can safely bypass this server check."
                },
                {
                    "step": 3,
                    "title": "Official Mi Unlock Authentication",
                    "description": "Launch Xiaomi's official MiFlash Unlock tool, sign in with the exact same Mi Account, connect the device in Fastboot mode, and proceed with unlocking."
                },
                {
                    "step": 4,
                    "title": "Data Wipe Warning",
                    "description": "Unlocking the bootloader automatically erases all user data and resets the device to factory defaults."
                }
            ],
            "official_download_url": "https://en.miui.com/unlock/download_en.html"
        }

    @staticmethod
    def launch_tool(tool_path: str) -> bool:
        if not os.path.exists(tool_path):
            return False
        try:
            subprocess.Popen([tool_path], cwd=os.path.dirname(tool_path))
            return True
        except Exception:
            return False
