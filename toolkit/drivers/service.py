import subprocess
import shutil
from typing import Dict, Any, List
from toolkit.core.platform_tools import PlatformTools

class DriverService:
    @staticmethod
    def get_status() -> Dict[str, Any]:
        adb = PlatformTools.get_adb_path()
        fb = PlatformTools.get_fastboot_path()
        
        return {
            "adb_installed": adb is not None,
            "adb_path": adb or "Not found",
            "fastboot_installed": fb is not None,
            "fastboot_path": fb or "Not found",
            "system_driver_guide": [
                "1. If device is not detected in ADB: Enable USB Debugging in Developer Options.",
                "2. If device is not detected in Fastboot: Ensure 'Android Bootloader Interface' driver is installed via Device Manager.",
                "3. Windows 10/11: In Device Manager, right-click the yellow warning triangle on 'Android', select 'Update driver' -> 'Browse my computer' -> 'Let me pick from a list' -> 'Android Device' -> 'Android Bootloader Interface'."
            ]
        }
