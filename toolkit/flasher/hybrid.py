import os
import re
from pathlib import Path
from typing import List, Dict, Any, Optional

class HybridFlasher:
    """
    Handles customized, EU, or modified Xiaomi fastboot ROMs.
    Inspects BAT scripts, identifies user prompts/replacements, and provides non-interactive safe execution.
    """
    @staticmethod
    def inspect_script(script_path: str) -> Dict[str, Any]:
        p = Path(script_path)
        if not p.exists():
            return {"error": "Script not found"}

        with open(p, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()

        fastboot_commands = []
        prompts = []
        wipes_data = False

        for line in lines:
            stripped = line.strip()
            if not stripped or stripped.startswith("rem") or stripped.startswith("::"):
                continue

            # Check for fastboot commands
            if "fastboot" in stripped.lower():
                fastboot_commands.append(stripped)
                if any(w in stripped.lower() for w in ["erase userdata", "format userdata", "-w"]):
                    wipes_data = True

            # Check for batch interactive prompts (e.g. set /p choice= or pause)
            if re.search(r'set\s+/p\s+', stripped, re.IGNORECASE) or stripped.lower() == "pause":
                prompts.append(stripped)

        return {
            "script_name": p.name,
            "total_fastboot_commands": len(fastboot_commands),
            "wipes_data": wipes_data,
            "interactive_prompts_detected": len(prompts),
            "commands_preview": fastboot_commands[:20]
        }
