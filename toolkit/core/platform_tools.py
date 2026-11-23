import shutil
import subprocess
import os
import sys
from pathlib import Path
from typing import Optional, Dict

class PlatformTools:
    DEFAULT_WINDOWS_PATH = r"C:\platform-tools"

    @classmethod
    def get_adb_path(cls) -> Optional[str]:
        # 1. Check custom path in settings or env
        env_path = os.environ.get("ADB_PATH")
        if env_path and os.path.exists(env_path):
            return env_path
        
        # 2. Check system PATH
        which_adb = shutil.which("adb")
        if which_adb:
            return which_adb
            
        # 3. Check standard C:\platform-tools
        candidate = Path(cls.DEFAULT_WINDOWS_PATH) / "adb.exe"
        if candidate.exists():
            return str(candidate)
            
        # 4. Check local app folder
        local_candidate = Path("platform-tools") / "adb.exe"
        if local_candidate.exists():
            return str(local_candidate.resolve())

        return None

    @classmethod
    def get_fastboot_path(cls) -> Optional[str]:
        env_path = os.environ.get("FASTBOOT_PATH")
        if env_path and os.path.exists(env_path):
            return env_path
            
        which_fb = shutil.which("fastboot")
        if which_fb:
            return which_fb

        candidate = Path(cls.DEFAULT_WINDOWS_PATH) / "fastboot.exe"
        if candidate.exists():
            return str(candidate)

        local_candidate = Path("platform-tools") / "fastboot.exe"
        if local_candidate.exists():
            return str(local_candidate.resolve())

        return None

    @classmethod
    def get_versions(cls) -> Dict[str, str]:
        adb = cls.get_adb_path()
        fb = cls.get_fastboot_path()
        res = {"adb": "Not found", "fastboot": "Not found", "adb_path": adb or "", "fastboot_path": fb or ""}
        
        if adb:
            try:
                out = subprocess.check_output([adb, "version"], text=True, stderr=subprocess.STDOUT, timeout=3)
                lines = out.strip().split("\n")
                res["adb"] = lines[0] if lines else "Installed"
            except Exception as e:
                res["adb"] = f"Error: {e}"

        if fb:
            try:
                out = subprocess.check_output([fb, "--version"], text=True, stderr=subprocess.STDOUT, timeout=3)
                lines = out.strip().split("\n")
                res["fastboot"] = lines[0] if lines else "Installed"
            except Exception as e:
                res["fastboot"] = f"Error: {e}"

        return res
