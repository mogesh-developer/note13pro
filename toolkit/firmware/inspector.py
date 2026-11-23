import os
import zipfile
import tarfile
import re
import json
from pathlib import Path
from typing import Dict, List, Optional, Any

class FirmwarePackage:
    def __init__(self, filepath: str):
        self.filepath = Path(filepath)
        self.filename = self.filepath.name
        self.size = self.filepath.stat().st_size if self.filepath.exists() else 0
        self.format = self._detect_format()
        self.metadata: Dict[str, Any] = {}
        self.images: List[Dict[str, Any]] = []

    def _detect_format(self) -> str:
        name_lower = self.filename.lower()
        if name_lower.endswith('.tgz') or name_lower.endswith('.tar.gz') or name_lower.endswith('.tar'):
            return "fastboot_tar"
        elif name_lower.endswith('.zip'):
            return "recovery_or_fastboot_zip"
        elif self.filepath.is_dir():
            return "extracted_directory"
        return "unknown"

    def inspect(self) -> Dict[str, Any]:
        """Inspect contents without full extraction."""
        if self.format == "fastboot_tar":
            return self._inspect_tar()
        elif self.format == "recovery_or_fastboot_zip":
            return self._inspect_zip()
        elif self.format == "extracted_directory":
            return self._inspect_dir()
        return {"error": "Unsupported archive format"}

    def _inspect_tar(self) -> Dict[str, Any]:
        images = []
        scripts = []
        is_fastboot = False

        try:
            mode = "r:gz" if self.filename.endswith(('.tgz', '.tar.gz')) else "r:"
            with tarfile.open(self.filepath, mode) as tar:
                for member in tar.getmembers():
                    name = member.name.replace("\\", "/")
                    base = os.path.basename(name)
                    if base.endswith(('.bat', '.sh')):
                        scripts.append(name)
                        if "flash_all" in base:
                            is_fastboot = True
                    elif base.endswith('.img'):
                        part_name = base[:-4]
                        images.append({
                            "name": base,
                            "path": name,
                            "partition": part_name,
                            "size": member.size
                        })
        except Exception as e:
            return {"error": f"Failed to read tar archive: {e}"}

        self.images = images
        self.metadata = {
            "type": "fastboot_rom" if is_fastboot else "tar_archive",
            "scripts": scripts,
            "images_count": len(images),
            "total_size": self.size
        }
        return {"metadata": self.metadata, "images": self.images}

    def _inspect_zip(self) -> Dict[str, Any]:
        images = []
        is_ota = False
        is_payload = False
        is_fastboot = False
        scripts = []

        try:
            with zipfile.ZipFile(self.filepath, 'r') as z:
                names = z.namelist()
                for name in names:
                    norm = name.replace("\\", "/")
                    base = os.path.basename(norm)
                    if base == "payload.bin":
                        is_payload = True
                        is_ota = True
                    elif "META-INF/com/google/android/update-binary" in norm:
                        is_ota = True
                    elif "flash_all" in base:
                        is_fastboot = True
                        scripts.append(norm)
                    elif base.endswith('.img'):
                        info = z.getinfo(name)
                        images.append({
                            "name": base,
                            "path": norm,
                            "partition": base[:-4],
                            "size": info.file_size
                        })
        except Exception as e:
            return {"error": f"Failed to read zip archive: {e}"}

        rom_type = "payload_ota" if is_payload else ("recovery_rom" if is_ota else ("fastboot_rom" if is_fastboot else "generic_zip"))
        self.images = images
        self.metadata = {
            "type": rom_type,
            "has_payload": is_payload,
            "scripts": scripts,
            "images_count": len(images),
            "total_size": self.size
        }
        return {"metadata": self.metadata, "images": self.images}

    def _inspect_dir(self) -> Dict[str, Any]:
        images = []
        scripts = []
        for root, dirs, files in os.walk(self.filepath):
            for f in files:
                rel = os.path.relpath(os.path.join(root, f), self.filepath).replace("\\", "/")
                if f.endswith(('.bat', '.sh')) and "flash_all" in f:
                    scripts.append(rel)
                elif f.endswith('.img'):
                    f_size = os.path.getsize(os.path.join(root, f))
                    images.append({
                        "name": f,
                        "path": rel,
                        "partition": f[:-4],
                        "size": f_size
                    })
        self.images = images
        self.metadata = {
            "type": "extracted_directory",
            "scripts": scripts,
            "images_count": len(images),
            "total_size": sum(img["size"] for img in images)
        }
        return {"metadata": self.metadata, "images": self.images}

    def extract_all(self, target_dir: str, progress_callback=None) -> bool:
        target = Path(target_dir)
        target.mkdir(parents=True, exist_ok=True)

        if self.format == "fastboot_tar":
            mode = "r:gz" if self.filename.endswith(('.tgz', '.tar.gz')) else "r:"
            with tarfile.open(self.filepath, mode) as tar:
                members = tar.getmembers()
                total = len(members)
                for i, m in enumerate(members):
                    # Prevent path traversal
                    dest = (target / m.name).resolve()
                    if not str(dest).startswith(str(target.resolve())):
                        continue
                    tar.extract(m, target)
                    if progress_callback:
                        progress_callback(i + 1, total, m.name)
            return True

        elif self.format == "recovery_or_fastboot_zip":
            with zipfile.ZipFile(self.filepath, 'r') as z:
                infolist = z.infolist()
                total = len(infolist)
                for i, info in enumerate(infolist):
                    dest = (target / info.filename).resolve()
                    if not str(dest).startswith(str(target.resolve())):
                        continue
                    z.extract(info, target)
                    if progress_callback:
                        progress_callback(i + 1, total, info.filename)
            return True

        return False
