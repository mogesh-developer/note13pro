from toolkit.devices.packages import PackageService
from toolkit.firmware.aosp_catalog import AospCatalogService
from toolkit.flasher.hybrid import HybridFlasher
import tempfile
import os

def test_aosp_catalog():
    catalog = AospCatalogService.get_catalog()
    assert len(catalog) > 0
    names = [c["name"] for c in catalog]
    assert "LineageOS" in names

def test_known_bloatware_list():
    assert len(PackageService.KNOWN_BLOATWARE) > 10
    pkgs = [p["package"] for p in PackageService.KNOWN_BLOATWARE]
    assert "com.miui.analytics" in pkgs
    assert "com.miui.msa.global" in pkgs

def test_hybrid_script_inspector():
    with tempfile.NamedTemporaryFile("w", suffix=".bat", delete=False) as f:
        f.write("@echo off\n")
        f.write("fastboot flash boot boot.img\n")
        f.write("fastboot format userdata\n")
        f.write("pause\n")
        f_path = f.name

    try:
        res = HybridFlasher.inspect_script(f_path)
        assert res["total_fastboot_commands"] == 2
        assert res["wipes_data"] is True
        assert res["interactive_prompts_detected"] == 1
    finally:
        if os.path.exists(f_path):
            os.remove(f_path)
