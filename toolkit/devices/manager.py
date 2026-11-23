import subprocess
import re
import shlex
from typing import List, Dict, Optional, Any
from toolkit.core.platform_tools import PlatformTools

class Device:
    def __init__(self, serial: str, mode: str, product: str = "", model: str = ""):
        self.serial = serial
        self.mode = mode  # 'adb', 'fastboot', 'recovery', 'sideload', 'unauthorized'
        self.product = product
        self.model = model
        self.details: Dict[str, Any] = {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "serial": self.serial,
            "mode": self.mode,
            "product": self.product,
            "model": self.model,
            "details": self.details
        }

class DeviceManager:
    @staticmethod
    def run_cmd(args: List[str], timeout: int = 5) -> tuple[int, str]:
        try:
            res = subprocess.run(
                args,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                timeout=timeout,
                creationflags=subprocess.CREATE_NO_WINDOW if subprocess.mswindows else 0
            )
            return res.returncode, res.stdout.strip()
        except subprocess.TimeoutExpired:
            return -1, "Command timed out"
        except Exception as e:
            return -1, str(e)

    @classmethod
    def scan_adb_devices(cls) -> List[Device]:
        adb = PlatformTools.get_adb_path()
        if not adb:
            return []

        code, out = cls.run_cmd([adb, "devices", "-l"])
        if code != 0:
            return []

        devices = []
        for line in out.splitlines()[1:]:
            line = line.strip()
            if not line:
                continue
            parts = line.split()
            if len(parts) >= 2:
                serial = parts[0]
                state = parts[1]
                
                product = ""
                model = ""
                for part in parts[2:]:
                    if part.startswith("product:"):
                        product = part.split(":", 1)[1]
                    elif part.startswith("model:"):
                        model = part.split(":", 1)[1]
                
                dev = Device(serial=serial, mode=state, product=product, model=model)
                if state == "device":
                    cls.populate_adb_details(dev, adb)
                devices.append(dev)
        return devices

    @classmethod
    def populate_adb_details(cls, dev: Device, adb: str):
        # Fetch getprop
        code, out = cls.run_cmd([adb, "-s", dev.serial, "shell", "getprop"], timeout=4)
        if code == 0:
            props = {}
            for line in out.splitlines():
                m = re.match(r'\[([^\]]+)\]:\s*\[([^\]]*)\]', line.strip())
                if m:
                    props[m.group(1)] = m.group(2)
            
            dev.details["ro.product.model"] = props.get("ro.product.model", dev.model)
            dev.details["ro.product.name"] = props.get("ro.product.name", dev.product)
            dev.details["ro.product.device"] = props.get("ro.product.device", "")
            dev.details["ro.build.version.release"] = props.get("ro.build.version.release", "")
            dev.details["ro.build.version.sdk"] = props.get("ro.build.version.sdk", "")
            dev.details["ro.build.version.incremental"] = props.get("ro.build.version.incremental", "")
            dev.details["ro.miui.ui.version.name"] = props.get("ro.miui.ui.version.name", "")
            dev.details["ro.product.marketname"] = props.get("ro.product.marketname", "")
            dev.details["ro.boot.hardware"] = props.get("ro.boot.hardware", "")
            dev.details["ro.boot.slot_suffix"] = props.get("ro.boot.slot_suffix", "")
            dev.details["ro.boot.flash.locked"] = props.get("ro.boot.flash.locked", "")

            if not dev.model and dev.details["ro.product.model"]:
                dev.model = dev.details["ro.product.model"]
            if not dev.product and dev.details["ro.product.device"]:
                dev.product = dev.details["ro.product.device"]

        # Fetch battery info
        code, batt_out = cls.run_cmd([adb, "-s", dev.serial, "shell", "dumpsys", "battery"], timeout=3)
        if code == 0:
            battery = {}
            for b_line in batt_out.splitlines():
                if ":" in b_line:
                    k, v = b_line.split(":", 1)
                    battery[k.strip()] = v.strip()
            dev.details["battery"] = battery

    @classmethod
    def scan_fastboot_devices(cls) -> List[Device]:
        fb = PlatformTools.get_fastboot_path()
        if not fb:
            return []

        code, out = cls.run_cmd([fb, "devices"])
        if code != 0:
            return []

        devices = []
        for line in out.splitlines():
            line = line.strip()
            if not line:
                continue
            parts = line.split()
            if len(parts) >= 2:
                serial = parts[0]
                mode = parts[1]  # 'fastboot'
                dev = Device(serial=serial, mode="fastboot")
                cls.populate_fastboot_details(dev, fb)
                devices.append(dev)
        return devices

    @classmethod
    def populate_fastboot_details(cls, dev: Device, fb: str):
        # Fetch getvar all
        code, out = cls.run_cmd([fb, "-s", dev.serial, "getvar", "all"], timeout=4)
        if code == 0 or "product:" in out or "unlocked:" in out:
            vars_dict = {}
            for line in out.splitlines():
                clean = re.sub(r'^\(bootloader\)\s*', '', line.strip())
                if ":" in clean:
                    k, v = clean.split(":", 1)
                    vars_dict[k.strip()] = v.strip()
            
            dev.product = vars_dict.get("product", "")
            dev.details["product"] = dev.product
            dev.details["unlocked"] = vars_dict.get("unlocked", "")
            dev.details["is-userspace"] = vars_dict.get("is-userspace", "")
            dev.details["current-slot"] = vars_dict.get("current-slot", "")
            dev.details["has-slot:boot"] = vars_dict.get("has-slot:boot", "")
            dev.details["battery-voltage"] = vars_dict.get("battery-voltage", "")
            dev.details["anti"] = vars_dict.get("anti", "")
            dev.details["secure"] = vars_dict.get("secure", "")
            dev.details["all_vars"] = vars_dict

    @classmethod
    def scan_all_devices(cls) -> List[Device]:
        devices = []
        devices.extend(cls.scan_adb_devices())
        devices.extend(cls.scan_fastboot_devices())
        return devices
