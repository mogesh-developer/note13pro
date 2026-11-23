from typing import Dict, Any, List
from toolkit.core.platform_tools import PlatformTools
from toolkit.devices.manager import DeviceManager

class GarnetSpecialistService:
    """
    Dedicated diagnostic and maintenance service for Redmi Note 13 Pro 5G / POCO X6 5G (garnet / 2312DRA50I).
    """
    CODENAME = "garnet"
    INDIAN_MODEL_ID = "2312DRA50I"

    # Known stable resources for garnet
    RECOMMENDED_RESOURCES = [
        {
            "category": "Custom Recovery (TWRP)",
            "title": "TWRP for Redmi Note 13 Pro 5G (garnet)",
            "author": "Nebrassy / TeamWin community",
            "url": "https://twrp.me/xiaomi/redminote13pro5g.html",
            "fastboot_cmd": "fastboot flash recovery twrp-garnet.img"
        },
        {
            "category": "Custom Recovery (OrangeFox)",
            "title": "OrangeFox Recovery Project (garnet)",
            "author": "OrangeFox Recovery Project",
            "url": "https://orangefox.download/device/garnet",
            "fastboot_cmd": "fastboot flash recovery OrangeFox-garnet.img"
        },
        {
            "category": "Official Stock Firmware (India Fastboot ROM)",
            "title": "HyperOS India Stable Fastboot ROM (garnet_in_global)",
            "author": "Xiaomi Official",
            "url": "https://xiaomifirmwareupdater.com/hyperos/garnet/",
            "fastboot_cmd": "flash_all.bat"
        },
        {
            "category": "Root Solution",
            "title": "Magisk / KernelSU GKI",
            "author": "topjohnwu / tiann",
            "url": "https://github.com/tiann/KernelSU",
            "fastboot_cmd": "fastboot boot init_boot.img"
        }
    ]

    @classmethod
    def check_anti_rollback(cls, serial: str) -> Dict[str, Any]:
        """
        Queries fastboot getvar anti to verify the Anti-Rollback (ARB) index.
        Prevents hard-bricking from flashing older MIUI/HyperOS ROMs.
        """
        fb = PlatformTools.get_fastboot_path()
        if not fb:
            return {"status": "error", "message": "Fastboot executable not found."}

        code, out = DeviceManager.run_cmd([fb, "-s", serial, "getvar", "anti"], timeout=5)
        # Parse anti: X
        anti_idx = "Unknown"
        for line in out.splitlines():
            clean = line.replace("(bootloader)", "").strip()
            if "anti:" in clean:
                anti_idx = clean.split("anti:", 1)[1].strip()

        return {
            "anti_rollback_index": anti_idx,
            "raw_output": out,
            "warning": (
                "Anti-Rollback (ARB) Protection is active on Redmi Note 13 Pro 5G. "
                "NEVER flash a firmware package with an ARB index lower than your current device index, "
                "or the device will trigger an EDL hard brick (Qualcomm 9008)."
            )
        }

    @classmethod
    def query_garnet_slots(cls, serial: str) -> Dict[str, Any]:
        """Queries A/B slot info for garnet (Snapdragon 7s Gen 2 uses A/B partition layout)."""
        fb = PlatformTools.get_fastboot_path()
        if not fb:
            return {"status": "error", "message": "Fastboot executable not found."}

        code, out = DeviceManager.run_cmd([fb, "-s", serial, "getvar", "all"], timeout=6)
        details = {}
        for line in out.splitlines():
            clean = line.replace("(bootloader)", "").strip()
            if ":" in clean:
                k, v = clean.split(":", 1)
                k = k.strip()
                if any(target in k for target in ["slot", "product", "unlocked", "anti", "battery-voltage"]):
                    details[k] = v.strip()

        return details

    @classmethod
    def switch_slot(cls, serial: str, slot: str) -> tuple[int, str]:
        """Safely switch boot slot (a or b)."""
        fb = PlatformTools.get_fastboot_path()
        if not fb:
            return -1, "Fastboot not found"
        return DeviceManager.run_cmd([fb, "-s", serial, "set_active", slot])

    @classmethod
    def reboot_userspace_fastbootd(cls, serial: str) -> tuple[int, str]:
        """Reboot from bootloader fastboot into userspace fastbootd (for dynamic partitions/super.img)."""
        fb = PlatformTools.get_fastboot_path()
        if not fb:
            return -1, "Fastboot not found"
        return DeviceManager.run_cmd([fb, "-s", serial, "reboot", "fastboot"])
