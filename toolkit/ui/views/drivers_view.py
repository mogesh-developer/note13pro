from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QTextEdit, QGroupBox, QMessageBox
)
from toolkit.drivers.service import DriverService
from toolkit.drivers.fastboot_fix import FastbootFixService

class DriversView(QWidget):
    def __init__(self):
        super().__init__()
        self._init_ui()

    def _init_ui(self):
        layout = QVBoxLayout(self)

        title = QLabel("USB Drivers & Fastboot Hardware Fix")
        title.setObjectName("titleLabel")
        layout.addWidget(title)

        # Immediate Fastboot Hardware Error Banner
        self.fastboot_alert_box = QGroupBox("Fastboot Hardware Detection & 1-Click Fix")
        fb_layout = QVBoxLayout(self.fastboot_alert_box)

        self.lbl_fb_status = QLabel("Checking Fastboot device hardware...")
        self.lbl_fb_status.setStyleSheet("font-weight: bold; font-size: 14px; color: #ef4444;")
        fb_layout.addWidget(self.lbl_fb_status)

        action_layout = QHBoxLayout()
        self.btn_install_driver = QPushButton("1-Click Install Official Fastboot Driver (Admin)")
        self.btn_install_driver.setStyleSheet("background-color: #10b981; color: white; font-weight: bold; padding: 8px 16px;")
        self.btn_install_driver.clicked.connect(self.install_driver_admin)
        action_layout.addWidget(self.btn_install_driver)

        self.btn_open_devmgmt = QPushButton("Open Windows Device Manager")
        self.btn_open_devmgmt.setObjectName("secondaryButton")
        self.btn_open_devmgmt.clicked.connect(FastbootFixService.open_device_manager)
        action_layout.addWidget(self.btn_open_devmgmt)

        self.btn_recheck = QPushButton("Re-check Status")
        self.btn_recheck.clicked.connect(self.check_fastboot_hw)
        action_layout.addWidget(self.btn_recheck)

        action_layout.addStretch()
        fb_layout.addLayout(action_layout)
        layout.addWidget(self.fastboot_alert_box)

        # General status box
        status_box = QGroupBox("Platform Tools & Paths")
        s_layout = QVBoxLayout(status_box)

        status = DriverService.get_status()
        self.lbl_adb = QLabel(f"ADB Executable: {status['adb_path']}")
        self.lbl_fb = QLabel(f"Fastboot Executable: {status['fastboot_path']}")
        s_layout.addWidget(self.lbl_adb)
        s_layout.addWidget(self.lbl_fb)
        layout.addWidget(status_box)

        guide_box = QGroupBox("Manual Step-by-Step Driver Selection (If Needed)")
        g_layout = QVBoxLayout(guide_box)
        text = QTextEdit()
        text.setReadOnly(True)
        guide_lines = [
            "WHY FASTBOOT IS NOT DETECTED:",
            "Windows 10/11 does not have the Fastboot Bootloader driver installed by default.",
            "When your phone is in Fastboot mode, Windows sees it as 'Android' with a yellow exclamation mark (Code 28).\n",
            "HOW TO FIX IN 10 SECONDS VIA DEVICE MANAGER:",
            "1. Click 'Open Windows Device Manager' above.",
            "2. Under 'Other devices', right-click the yellow 'Android' icon -> Select 'Update driver'.",
            "3. Choose 'Browse my computer for drivers' -> Click 'Browse...' and select folder:",
            f"   {FastbootFixService.DRIVER_DIR}",
            "4. Alternatively, click 'Let me pick from a list of available drivers on my computer' -> Select 'Android Device' -> 'Android Bootloader Interface' -> Click Next.\n",
            "Once installed, your phone will instantly appear in the Fastboot terminal and Dashboard!"
        ]
        text.setText("\n".join(guide_lines))
        g_layout.addWidget(text)
        layout.addWidget(guide_box)

        self.check_fastboot_hw()

    def check_fastboot_hw(self):
        info = FastbootFixService.check_fastboot_driver_status()
        if info.get("driver_missing"):
            self.lbl_fb_status.setText(
                "DETECTED: Phone is plugged in Fastboot mode (VID_18D1&PID_D00D), but Windows is missing the driver (Code 28)!\n"
                "Click '1-Click Install Official Fastboot Driver' below or update driver in Device Manager."
            )
            self.lbl_fb_status.setStyleSheet("color: #f87171; font-weight: bold; font-size: 13px;")
            self.btn_install_driver.setEnabled(True)
        elif info.get("connected"):
            self.lbl_fb_status.setText("STATUS: Fastboot device connected and driver is working!")
            self.lbl_fb_status.setStyleSheet("color: #34d399; font-weight: bold; font-size: 13px;")
            self.btn_install_driver.setEnabled(False)
        else:
            self.lbl_fb_status.setText("STATUS: No fastboot device detected on USB ports. Plug in phone while holding Volume Down + Power.")
            self.lbl_fb_status.setStyleSheet("color: #94a3b8; font-size: 13px;")
            self.btn_install_driver.setEnabled(True)

    def install_driver_admin(self):
        res = FastbootFixService.launch_admin_installer()
        if res:
            QMessageBox.information(
                self,
                "Driver Installation Launched",
                "A Windows User Account Control (UAC) prompt will appear requesting administrator permission.\n\nClick 'Yes' to install the official Google/Android Fastboot driver package.\nAfter installation, click 'Refresh Devices' on the dashboard!"
            )
        else:
            QMessageBox.warning(self, "Error", "Failed to launch driver installer.")
