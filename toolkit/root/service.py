import os
from typing import Dict, Any, List, Optional
from toolkit.firmware.inspector import FirmwarePackage

class RootService:
    OFFICIAL_RESOURCES = [
        {
            "name": "Magisk",
            "author": "topjohnwu",
            "repo": "https://github.com/topjohnwu/Magisk",
            "method": "Patch boot.img / init_boot.img in Magisk App, then flash via fastboot.",
            "recommended_target": "boot.img or init_boot.img (Android 13+)"
        },
        {
            "name": "KernelSU",
            "author": "tiann",
            "repo": "https://github.com/tiann/KernelSU",
            "method": "GKI-based kernel root or custom kernel flash.",
            "recommended_target": "GKI Kernel boot.img (Android 12+ GKI 5.10+)"
        },
        {
            "name": "APatch",
            "author": "bmax121",
            "repo": "https://github.com/bmax121/APatch",
            "method": "Patch boot.img with KernelPatch directly without modifying system/vendor.",
            "recommended_target": "boot.img"
        }
    ]

    @staticmethod
    def inspect_boot_images(firmware_path: str) -> List[Dict[str, Any]]:
        pkg = FirmwarePackage(firmware_path)
        res = pkg.inspect()
        images = res.get("images", [])
        
        boot_targets = []
        for img in images:
            p_name = img.get("partition", "").lower()
            if p_name in ["boot", "init_boot", "vendor_boot"]:
                boot_targets.append(img)
        return boot_targets
