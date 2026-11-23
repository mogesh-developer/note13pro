from typing import List, Dict, Any, Optional
from toolkit.core.platform_tools import PlatformTools
from toolkit.devices.manager import DeviceManager

class PackageService:
    # Common MIUI/HyperOS bloatware packages with descriptions and safety levels
    KNOWN_BLOATWARE = [
        {"package": "com.miui.analytics", "name": "MIUI Analytics", "safe": True, "category": "Telemetry"},
        {"package": "com.miui.msa.global", "name": "MIUI System Ads (MSA)", "safe": True, "category": "Advertising"},
        {"package": "com.xiaomi.mipicks", "name": "GetApps (Mi Picks)", "safe": True, "category": "App Store"},
        {"package": "com.miui.bugreport", "name": "Mi Feedback / Bug Report", "safe": True, "category": "Telemetry"},
        {"package": "com.miui.yellowpage", "name": "Yellow Pages", "safe": True, "category": "Service"},
        {"package": "com.miui.hybrid", "name": "Quick Apps", "safe": True, "category": "Web Apps"},
        {"package": "com.mi.globalbrowser", "name": "Mi Browser", "safe": True, "category": "Browser"},
        {"package": "com.miui.videoplayer", "name": "Mi Video", "safe": True, "category": "Media"},
        {"package": "com.miui.player", "name": "Mi Music", "safe": True, "category": "Media"},
        {"package": "com.miui.cleanmaster", "name": "Cleaner (Clean Master)", "safe": True, "category": "Cleaner"},
        {"package": "com.google.android.apps.tachyon", "name": "Google Meet / Duo", "safe": True, "category": "Google"},
        {"package": "com.facebook.services", "name": "Facebook Services", "safe": True, "category": "Social Preload"},
        {"package": "com.facebook.katana", "name": "Facebook App", "safe": True, "category": "Social Preload"},
        {"package": "com.facebook.system", "name": "Facebook App Installer", "safe": True, "category": "Social Preload"},
        {"package": "com.facebook.appmanager", "name": "Facebook App Manager", "safe": True, "category": "Social Preload"}
    ]

    @classmethod
    def list_installed_packages(cls, serial: str) -> List[str]:
        adb = PlatformTools.get_adb_path()
        if not adb:
            return []
        code, out = DeviceManager.run_cmd([adb, "-s", serial, "shell", "pm", "list", "packages", "-u"])
        if code != 0:
            return []
        
        pkgs = []
        for line in out.splitlines():
            line = line.strip()
            if line.startswith("package:"):
                pkgs.append(line.replace("package:", "").strip())
        return pkgs

    @classmethod
    def scan_bloatware(cls, serial: str) -> List[Dict[str, Any]]:
        installed = set(cls.list_installed_packages(serial))
        results = []
        for item in cls.KNOWN_BLOATWARE:
            is_present = item["package"] in installed
            results.append({
                **item,
                "installed": is_present
            })
        return results

    @classmethod
    def uninstall_package(cls, serial: str, package_name: str) -> tuple[int, str]:
        """Uninstall package for user 0 (safe debloat without root)."""
        adb = PlatformTools.get_adb_path()
        if not adb:
            return -1, "ADB not found"
        return DeviceManager.run_cmd([adb, "-s", serial, "shell", "pm", "uninstall", "-k", "--user", "0", package_name])

    @classmethod
    def restore_package(cls, serial: str, package_name: str) -> tuple[int, str]:
        """Reinstall an uninstalled-for-user system package."""
        adb = PlatformTools.get_adb_path()
        if not adb:
            return -1, "ADB not found"
        return DeviceManager.run_cmd([adb, "-s", serial, "shell", "cmd", "package", "install-existing", package_name])

    @classmethod
    def get_dialer_status(cls, serial: str) -> Dict[str, Any]:
        installed = set(cls.list_installed_packages(serial))
        google_dialer = "com.google.android.dialer" in installed
        miui_dialer = "com.android.contacts" in installed or "com.miui.telephony" in installed

        return {
            "google_dialer_installed": google_dialer,
            "miui_dialer_installed": miui_dialer,
            "active": "google" if google_dialer else ("miui" if miui_dialer else "other")
        }

    @classmethod
    def disable_google_dialer(cls, serial: str) -> tuple[int, str]:
        return cls.uninstall_package(serial, "com.google.android.dialer")

    @classmethod
    def restore_google_dialer(cls, serial: str) -> tuple[int, str]:
        return cls.restore_package(serial, "com.google.android.dialer")
