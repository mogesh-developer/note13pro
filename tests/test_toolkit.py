import pytest
import os
import tempfile
import zipfile
import tarfile
from toolkit.database.db import Database
from toolkit.core.platform_tools import PlatformTools
from toolkit.devices.manager import Device, DeviceManager
from toolkit.firmware.inspector import FirmwarePackage
from toolkit.flasher.engine import FlashPlan, FlasherEngine

def test_database_initialization():
    with tempfile.TemporaryDirectory() as tmp_dir:
        db_path = os.path.join(tmp_dir, "test.db")
        db = Database(db_path)
        assert db.get_setting("non_existent", "default") == "default"
        db.set_setting("theme", "dark")
        assert db.get_setting("theme") == "dark"

        # Check presets
        presets = db.get_presets()
        assert len(presets) > 0

        # Log command
        db.log_command("adb", "devices", 0, "List of devices attached")
        history = db.get_command_history()
        assert len(history) == 1
        assert history[0]["command"] == "devices"

def test_platform_tools_detection():
    adb = PlatformTools.get_adb_path()
    fb = PlatformTools.get_fastboot_path()
    assert adb is not None
    assert fb is not None
    versions = PlatformTools.get_versions()
    assert "adb" in versions
    assert "fastboot" in versions

def test_device_data_structure():
    dev = Device(serial="test1234", mode="fastboot", product="marble")
    d = dev.to_dict()
    assert d["serial"] == "test1234"
    assert d["mode"] == "fastboot"
    assert d["product"] == "marble"

def test_firmware_zip_inspection():
    with tempfile.TemporaryDirectory() as tmp_dir:
        zip_path = os.path.join(tmp_dir, "test_rom.zip")
        with zipfile.ZipFile(zip_path, "w") as z:
            z.writestr("boot.img", b"MOCK_BOOT_IMAGE_DATA")
            z.writestr("recovery.img", b"MOCK_RECOVERY_IMAGE_DATA")
            z.writestr("flash_all.bat", b"@echo off\r\nfastboot flash boot boot.img\r\n")

        pkg = FirmwarePackage(zip_path)
        res = pkg.inspect()
        assert "images" in res
        partitions = [img["partition"] for img in res["images"]]
        assert "boot" in partitions
        assert "recovery" in partitions
        assert res["metadata"]["type"] == "fastboot_rom"

def test_firmware_tar_inspection():
    with tempfile.TemporaryDirectory() as tmp_dir:
        tar_path = os.path.join(tmp_dir, "test_rom.tgz")
        with tarfile.open(tar_path, "w:gz") as tar:
            data = b"MOCK_IMAGE_BYTES"
            import io
            ti = tarfile.TarInfo("images/super.img")
            ti.size = len(data)
            tar.addfile(ti, io.BytesIO(data))
            
            sb = tarfile.TarInfo("flash_all.bat")
            sb.size = 10
            tar.addfile(sb, io.BytesIO(b"fastboot\r\n"))

        pkg = FirmwarePackage(tar_path)
        res = pkg.inspect()
        assert "images" in res
        partitions = [img["partition"] for img in res["images"]]
        assert "super" in partitions
        assert res["metadata"]["type"] == "fastboot_rom"

def test_flash_plan_validation():
    plan = FlashPlan(mode="clean_all", target_serial="", files=[])
    assert not plan.validate()
    assert "No target device serial specified." in plan.preflight_errors

    plan2 = FlashPlan(
        mode="clean_all",
        target_serial="DEVICE_1",
        files=[{"partition": "boot", "filepath": "non_existent_boot.img"}]
    )
    assert not plan2.validate()
    assert any("does not exist" in err for err in plan2.preflight_errors)
