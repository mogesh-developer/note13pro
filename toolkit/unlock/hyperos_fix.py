import os
from typing import Dict, Any, List
from toolkit.core.platform_tools import PlatformTools
from toolkit.devices.manager import DeviceManager

class HyperOSFixService:
    """
    Automated diagnostics and troubleshooting for Redmi Note 13 Pro 5G (garnet)
    and HyperOS devices encountering:
    'The system is being upgraded. Please try again later. (Error 30003)'
    """
    @classmethod
    def diagnose_device(cls, serial: str) -> Dict[str, Any]:
        adb = PlatformTools.get_adb_path()
        if not adb:
            return {"error": "ADB not found"}

        # Check device properties
        code, out = DeviceManager.run_cmd([adb, "-s", serial, "shell", "getprop"], timeout=4)
        props = {}
        for line in out.splitlines():
            if "]: [" in line:
                parts = line.strip().split("]: [", 1)
                k = parts[0].lstrip("[")
                v = parts[1].rstrip("]")
                props[k] = v

        product = props.get("ro.product.device", "")
        marketname = props.get("ro.product.marketname", "")
        region = props.get("ro.miui.region", "")
        hyperos_ver = props.get("ro.miui.ui.version.name", "")
        build_id = props.get("ro.build.display.id", "")

        is_garnet = "garnet" in product.lower() or "garnet" in props.get("ro.product.name", "").lower()

        return {
            "serial": serial,
            "product": product,
            "marketname": marketname,
            "region": region,
            "hyperos_version": hyperos_ver,
            "build_id": build_id,
            "is_garnet": is_garnet,
            "error_30003_reasons": [
                "1. HyperOS Server Quota Exhaustion: Xiaomi resets the global/India unlock quota exactly at 00:00 Beijing Time (GMT+8 / 9:30 PM IST). When quota is full, it outputs 'The system is being upgraded'.",
                "2. Missing Xiaomi Community App Approval: HyperOS requires applying for unlock permission inside the Xiaomi Community app (v5.3.31+) with Region set to Global/India before binding.",
                "3. SIM Card Mobile Data Required: Wi-Fi must be disabled. The phone MUST bind using active mobile data from the registered SIM.",
                "4. Xiaomi Cloud & Find Device Sync: If Find Device sync is stale, the token handshake fails."
            ]
        }

    @classmethod
    def reset_cloud_sync(cls, serial: str) -> tuple[int, str]:
        """Restarts the Xiaomi sync and framework services to clear stuck token state."""
        adb = PlatformTools.get_adb_path()
        if not adb:
            return -1, "ADB not found"

        commands = [
            "am force-stop com.xiaomi.account",
            "am force-stop com.miui.cloudservice",
            "am force-stop com.android.settings"
        ]
        logs = []
        for cmd in commands:
            code, out = DeviceManager.run_cmd([adb, "-s", serial, "shell"] + cmd.split())
            logs.append(f"{cmd} -> {code}")

        return 0, "\n".join(logs)

    @classmethod
    def clear_settings_cache(cls, serial: str) -> tuple[int, str]:
        """Clears Settings app cache to force a fresh server handshake."""
        adb = PlatformTools.get_adb_path()
        if not adb:
            return -1, "ADB not found"

        return DeviceManager.run_cmd([adb, "-s", serial, "shell", "pm", "clear", "com.android.settings"])
