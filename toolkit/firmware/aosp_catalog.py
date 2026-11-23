import os
import json
from typing import List, Dict, Any

class AospCatalogService:
    @staticmethod
    def get_catalog() -> List[Dict[str, Any]]:
        catalog_path = r"c:\Users\Acer-Nitro\Documents\xiaomi\analysis\frontend\aosp_rom_catalog.json"
        if os.path.exists(catalog_path):
            try:
                with open(catalog_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass

        # Fallback catalog
        return [
            {"id": "lineageos", "name": "LineageOS", "url": "https://download.lineageos.org/devices", "kind": "downloads", "note": "Official project-maintained device catalog"},
            {"id": "crdroid", "name": "crDroid", "url": "https://crdroid.net/downloads", "kind": "downloads", "note": "Official download directory with Xiaomi devices"},
            {"id": "pixelos", "name": "PixelOS", "url": "https://pixelos.net/download", "kind": "downloads", "note": "AOSP based with Google Pixel experience"},
            {"id": "evolutionx", "name": "Evolution X", "url": "https://evolution-x.org/devices", "kind": "downloads", "note": "Pixel UI with extensive customization options"},
            {"id": "arrowos", "name": "ArrowOS", "url": "https://arrowos.net/download", "kind": "downloads", "note": "Clean, simple and lightweight AOSP"}
        ]
