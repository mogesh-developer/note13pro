import subprocess
import os
import sys
import threading
from pathlib import Path
from typing import List, Dict, Optional, Callable, Any
from toolkit.core.platform_tools import PlatformTools

class FlashPlan:
    def __init__(self, mode: str, target_serial: str, files: List[Dict[str, str]]):
        self.mode = mode  # 'clean_all', 'save_user_data', 'lock', 'individual', 'sideload'
        self.target_serial = target_serial
        self.files = files  # [{'partition': 'boot', 'filepath': '...'}]
        self.script_path: Optional[str] = None
        self.preflight_errors: List[str] = []

    def validate(self) -> bool:
        self.preflight_errors.clear()
        if not self.target_serial:
            self.preflight_errors.append("No target device serial specified.")

        if self.script_path and not os.path.exists(self.script_path):
            self.preflight_errors.append(f"Flash script not found: {self.script_path}")

        for item in self.files:
            fp = item.get("filepath", "")
            if not os.path.exists(fp):
                self.preflight_errors.append(f"Image file does not exist: {fp}")

        return len(self.preflight_errors) == 0

class FlasherEngine:
    def __init__(self):
        self.is_running = False
        self._cancel_requested = False
        self._current_process: Optional[subprocess.Popen] = None

    def cancel(self):
        self._cancel_requested = True
        if self._current_process:
            try:
                self._current_process.terminate()
            except Exception:
                pass

    def run_command_stream(
        self,
        args: List[str],
        cwd: Optional[str] = None,
        on_log: Optional[Callable[[str], None]] = None
    ) -> int:
        if self._cancel_requested:
            if on_log:
                on_log("[ABORT] Operation cancelled by user.")
            return -1

        try:
            self._current_process = subprocess.Popen(
                args,
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                creationflags=subprocess.CREATE_NO_WINDOW if subprocess.mswindows else 0
            )

            if on_log:
                on_log(f"> {' '.join(args)}")

            for line in self._current_process.stdout:
                if self._cancel_requested:
                    self._current_process.terminate()
                    if on_log:
                        on_log("[ABORT] Process terminated on user cancel.")
                    return -1
                if on_log:
                    on_log(line.rstrip())

            self._current_process.wait()
            return self._current_process.returncode
        except Exception as e:
            if on_log:
                on_log(f"[ERROR] Subprocess error: {e}")
            return -1
        finally:
            self._current_process = None

    def flash_batch_images(
        self,
        plan: FlashPlan,
        on_progress: Optional[Callable[[int, int, str], None]] = None,
        on_log: Optional[Callable[[str], None]] = None
    ) -> bool:
        self.is_running = True
        self._cancel_requested = False

        fb = PlatformTools.get_fastboot_path()
        if not fb:
            if on_log:
                on_log("[ERROR] Fastboot executable not found.")
            self.is_running = False
            return False

        if not plan.validate():
            if on_log:
                for err in plan.preflight_errors:
                    on_log(f"[PREFLIGHT ERROR] {err}")
            self.is_running = False
            return False

        total = len(plan.files)
        success = True

        try:
            for idx, item in enumerate(plan.files):
                if self._cancel_requested:
                    break

                part = item["partition"]
                filepath = item["filepath"]
                slot = item.get("slot", "")

                target_part = f"{part}_{slot}" if slot else part
                cmd = [fb, "-s", plan.target_serial, "flash", target_part, filepath]

                if on_progress:
                    on_progress(idx + 1, total, f"Flashing {target_part}...")

                code = self.run_command_stream(cmd, on_log=on_log)
                if code != 0:
                    if on_log:
                        on_log(f"[FAILED] Error flashing {target_part} (exit code {code})")
                    success = False
                    break

            if success and not self._cancel_requested:
                if on_log:
                    on_log("[SUCCESS] All partition images flashed successfully.")
                return True
            else:
                if on_log:
                    on_log("[HALTED] Flash operation was stopped or failed.")
                return False

        finally:
            self.is_running = False

    def flash_official_script(
        self,
        script_path: str,
        target_serial: str,
        on_log: Optional[Callable[[str], None]] = None
    ) -> bool:
        self.is_running = True
        self._cancel_requested = False
        p = Path(script_path)
        cwd = str(p.parent)

        try:
            if on_log:
                on_log(f"[START] Executing official script: {p.name} in {cwd}")

            # Windows cmd.exe script runner
            cmd = ["cmd.exe", "/c", p.name]
            # Set environment variable for device serial if needed
            os.environ["ANDROID_SERIAL"] = target_serial

            code = self.run_command_stream(cmd, cwd=cwd, on_log=on_log)
            return code == 0
        finally:
            self.is_running = False

    def adb_sideload(
        self,
        target_serial: str,
        zip_path: str,
        on_log: Optional[Callable[[str], None]] = None
    ) -> bool:
        self.is_running = True
        self._cancel_requested = False

        adb = PlatformTools.get_adb_path()
        if not adb:
            if on_log:
                on_log("[ERROR] ADB executable not found.")
            self.is_running = False
            return False

        try:
            cmd = [adb, "-s", target_serial, "sideload", zip_path]
            code = self.run_command_stream(cmd, on_log=on_log)
            return code == 0
        finally:
            self.is_running = False
