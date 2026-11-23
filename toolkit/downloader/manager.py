import os
import hashlib
import httpx
import asyncio
from pathlib import Path
from typing import Optional, Callable

class DownloadTask:
    def __init__(self, url: str, destination_dir: str, filename: Optional[str] = None, expected_sha256: Optional[str] = None):
        self.url = url
        self.destination_dir = Path(destination_dir)
        self.filename = filename or url.split("/")[-1].split("?")[0]
        self.target_path = self.destination_dir / self.filename
        self.expected_sha256 = expected_sha256
        self.is_cancelled = False
        self.downloaded_bytes = 0
        self.total_bytes = 0

    def cancel(self):
        self.is_cancelled = True

    async def run(
        self,
        on_progress: Optional[Callable[[int, int, float], None]] = None,
        on_status: Optional[Callable[[str], None]] = None
    ) -> bool:
        self.destination_dir.mkdir(parents=True, exist_ok=True)
        temp_path = self.target_path.with_suffix(self.target_path.suffix + ".part")

        # Resume support: check existing part size
        resume_bytes = 0
        if temp_path.exists():
            resume_bytes = temp_path.stat().st_size
            self.downloaded_bytes = resume_bytes

        headers = {}
        if resume_bytes > 0:
            headers["Range"] = f"bytes={resume_bytes}-"

        if on_status:
            on_status(f"Connecting to {self.url}...")

        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                async with client.stream("GET", self.url, headers=headers) as response:
                    if response.status_code not in (200, 206):
                        if on_status:
                            on_status(f"Server returned HTTP {response.status_code}")
                        return False

                    content_length = response.headers.get("Content-Length")
                    if content_length:
                        self.total_bytes = resume_bytes + int(content_length)

                    mode = "ab" if resume_bytes > 0 and response.status_code == 206 else "wb"
                    if mode == "wb":
                        self.downloaded_bytes = 0

                    with open(temp_path, mode) as f:
                        async for chunk in response.aiter_bytes(chunk_size=65536):
                            if self.is_cancelled:
                                if on_status:
                                    on_status("Download cancelled by user.")
                                return False
                            f.write(chunk)
                            self.downloaded_bytes += len(chunk)
                            if on_progress and self.total_bytes > 0:
                                pct = (self.downloaded_bytes / self.total_bytes) * 100.0
                                on_progress(self.downloaded_bytes, self.total_bytes, pct)

            # Move part to final
            if temp_path.exists():
                if self.target_path.exists():
                    self.target_path.unlink()
                temp_path.rename(self.target_path)

            # Verify hash if provided
            if self.expected_sha256:
                if on_status:
                    on_status("Verifying SHA-256 checksum...")
                hasher = hashlib.sha256()
                with open(self.target_path, "rb") as vf:
                    while chunk := vf.read(1048576):
                        hasher.update(chunk)
                computed = hasher.hexdigest().lower()
                if computed != self.expected_sha256.lower():
                    if on_status:
                        on_status(f"Checksum mismatch! Expected {self.expected_sha256}, got {computed}")
                    return False
                if on_status:
                    on_status("Checksum verification passed!")

            if on_status:
                on_status(f"Download complete: {self.filename}")
            return True

        except Exception as e:
            if on_status:
                on_status(f"Download error: {e}")
            return False
