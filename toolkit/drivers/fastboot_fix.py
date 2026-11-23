import os
import subprocess
from pathlib import Path
from typing import Dict, Any, List

class FastbootFixService:
    DRIVER_INF_PATH = r"c:\Users\Acer-Nitro\Documents\xiaomi\drivers_pack\usb_driver\android_winusb.inf"
    DRIVER_DIR = r"c:\Users\Acer-Nitro\Documents\xiaomi\drivers_pack\usb_driver"

    @classmethod
    def check_fastboot_driver_status(cls) -> Dict[str, Any]:
        """Detects whether device is connected in Fastboot mode with missing Windows drivers."""
        try:
            cmd = "Get-PnpDevice | Where-Object { $_.InstanceId -like '*VID_18D1&PID_D00D*' -or ($_.FriendlyName -eq 'Android' -and $_.Status -eq 'Error') } | Select-Object Status, Class, FriendlyName, InstanceId | ConvertTo-Json"
            res = subprocess.run(["powershell", "-NoProfile", "-Command", cmd], capture_output=True, text=True)
            import json
            out = res.stdout.strip()
            if out:
                data = json.loads(out)
                # single object or list
                item = data[0] if isinstance(data, list) else data
                is_missing = item.get("Status") == "Error"
                return {
                    "connected": True,
                    "driver_missing": is_missing,
                    "device": item,
                    "message": "Device detected in Fastboot mode (VID_18D1&PID_D00D), but Windows has Code 28 (Driver Not Installed)." if is_missing else "Fastboot driver installed properly."
                }
        except Exception as e:
            pass

        return {
            "connected": False,
            "driver_missing": False,
            "message": "No Fastboot hardware detected or already working."
        }

    @classmethod
    def launch_admin_installer(cls) -> bool:
        """Launches an elevated PowerShell process to install android_winusb.inf into Windows driver store."""
        inf = cls.DRIVER_INF_PATH
        if not os.path.exists(inf):
            return False

        # PowerShell Start-Process -Verb RunAs pnputil /add-driver ... /install
        ps_cmd = f"Start-Process pnputil -ArgumentList '/add-driver \"\"{inf}\"\" /install' -Verb RunAs"
        try:
            subprocess.Popen(["powershell", "-NoProfile", "-Command", ps_cmd])
            return True
        except Exception:
            return False

    @classmethod
    def open_device_manager(cls):
        try:
            subprocess.Popen(["devmgmt.msc"])
        except Exception:
            pass
