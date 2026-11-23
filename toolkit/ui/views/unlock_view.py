from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QTextEdit, QMessageBox, QGroupBox, QComboBox
)
from toolkit.unlock.mi_unlock import MiUnlockService
from toolkit.unlock.hyperos_fix import HyperOSFixService
from toolkit.devices.manager import DeviceManager

class UnlockView(QWidget):
    def __init__(self):
        super().__init__()
        self._init_ui()

    def _init_ui(self):
        layout = QVBoxLayout(self)

        title = QLabel("Xiaomi Official Mi Unlock & HyperOS Assistant")
        title.setObjectName("titleLabel")
        layout.addWidget(title)

        # Device selector for automated diagnostics
        dev_layout = QHBoxLayout()
        dev_layout.addWidget(QLabel("Target Device:"))
        self.combo_devices = QComboBox()
        dev_layout.addWidget(self.combo_devices)

        self.btn_refresh = QPushButton("Detect & Diagnose Device")
        self.btn_refresh.clicked.connect(self.run_diagnostics)
        dev_layout.addWidget(self.btn_refresh)
        dev_layout.addStretch()
        layout.addLayout(dev_layout)

        # Redmi Note 13 Pro (garnet) & HyperOS "System Being Upgraded" Fix Tool
        garnet_box = QGroupBox("Redmi Note 13 Pro 5G (garnet) & HyperOS Fix ('System is being upgraded' / Error 30003)")
        g_layout = QVBoxLayout(garnet_box)

        self.lbl_garnet_info = QLabel("Diagnose your connected device to verify variant and HyperOS unlock eligibility.")
        self.lbl_garnet_info.setStyleSheet("color: #38bdf8; font-weight: bold;")
        g_layout.addWidget(self.lbl_garnet_info)

        fix_btn_layout = QHBoxLayout()
        self.btn_fix_sync = QPushButton("1. Clear Stuck Xiaomi Account / Settings Sync")
        self.btn_fix_sync.setObjectName("secondaryButton")
        self.btn_fix_sync.clicked.connect(self.fix_sync_action)
        fix_btn_layout.addWidget(self.btn_fix_sync)

        self.btn_quota_guide = QPushButton("2. View India / Global Quota Reset Timings")
        self.btn_quota_guide.clicked.connect(self.show_quota_timings)
        fix_btn_layout.addWidget(self.btn_quota_guide)

        fix_btn_layout.addStretch()
        g_layout.addLayout(fix_btn_layout)
        layout.addWidget(garnet_box)

        # Local tool status
        status_box = QGroupBox("Official MiFlash Unlock Tool")
        s_layout = QHBoxLayout(status_box)
        self.tool_path = MiUnlockService.find_official_unlock_tool()

        self.lbl_status = QLabel(f"Detected Tool: {self.tool_path or 'Not found in standard paths'}")
        s_layout.addWidget(self.lbl_status)
        s_layout.addStretch()

        self.btn_launch = QPushButton("Launch Mi Unlock")
        self.btn_launch.setEnabled(self.tool_path is not None)
        self.btn_launch.clicked.connect(self.launch_tool)
        s_layout.addWidget(self.btn_launch)
        layout.addWidget(status_box)

        # Full step-by-step workflow text
        guide_box = QGroupBox("Step-by-Step Resolution for 'System is being upgraded' on Note 13 Pro 5G")
        guide_layout = QVBoxLayout(guide_box)
        self.guide_text = QTextEdit()
        self.guide_text.setReadOnly(True)

        info = MiUnlockService.get_unlock_prerequisites()
        lines = [
            "=== WHY DOES 'THE SYSTEM IS BEING UPGRADED' OCCUR ON REDMI NOTE 13 PRO 5G (GARNET)? ===\n",
            "1. Xiaomi Server Daily Quota (Major Cause):",
            "   Xiaomi limits the number of bootloader unlock requests per day globally and in India.",
            "   When the daily quota is exhausted, Xiaomi's servers return: 'The system is being upgraded. Please try again later.'",
            "   -> EXACT RESET TIME: 00:00 Beijing Time (GMT+8), which is 9:30 PM Indian Standard Time (IST) every day!\n",
            "2. Xiaomi Community App Authorization Requirement:",
            "   On HyperOS (Redmi Note 13 series), you CANNOT bind in Developer Options until your Mi Account has community approval.",
            "   -> Install Xiaomi Community App (v5.3.31 or latest stable Global release).",
            "   -> Set Region to 'Global' or 'India' in profile settings.",
            "   -> Go to 'Me' -> 'Unlock Bootloader' and apply. Apply right at 9:30 PM IST if quota is full.",
            "   -> Once approved, wait 24-48 hours for Xiaomi's database to synchronize your account.\n",
            "3. Network & SIM Verification Prerequisites:",
            "   -> Turn OFF Wi-Fi completely. You MUST be connected via Mobile Data on SIM 1 (the number linked to your Mi Account).",
            "   -> Log out of Mi Account on phone, turn off Find Device, reboot, log back in, toggle Find Device ON, then tap 'Add account and device'.\n",
            f"Official Xiaomi Unlock Download: {info['official_download_url']}"
        ]
        self.guide_text.setText("\n".join(lines))
        guide_layout.addWidget(self.guide_text)
        layout.addWidget(guide_box)

        self.refresh_devices()

    def refresh_devices(self):
        self.combo_devices.clear()
        devices = DeviceManager.scan_all_devices()
        for d in devices:
            self.combo_devices.addItem(f"{d.serial} ({d.mode})", d.serial)
        if not devices:
            self.combo_devices.addItem("No connected devices found", "")

    def run_diagnostics(self):
        serial = self.combo_devices.currentData()
        if not serial:
            self.refresh_devices()
            serial = self.combo_devices.currentData()
        if not serial:
            QMessageBox.warning(self, "No Device", "Please connect your Redmi Note 13 Pro 5G with USB Debugging enabled.")
            return

        diag = HyperOSFixService.diagnose_device(serial)
        if "error" in diag:
            QMessageBox.critical(self, "Error", diag["error"])
            return

        is_garnet = diag.get("is_garnet", False)
        status_msg = (
            f"Device: {diag.get('marketname', 'Unknown')} | Codename: {diag.get('product', 'Unknown')} "
            f"| Region: {diag.get('region', 'Unknown')} | OS: {diag.get('hyperos_version', 'HyperOS')}"
        )
        if is_garnet:
            status_msg += " (VERIFIED: Redmi Note 13 Pro 5G - garnet)"
        self.lbl_garnet_info.setText(status_msg)

    def fix_sync_action(self):
        serial = self.combo_devices.currentData()
        if not serial:
            QMessageBox.warning(self, "No Device", "Please connect a device first.")
            return
        code, out = HyperOSFixService.reset_cloud_sync(serial)
        QMessageBox.information(
            self,
            "Sync Reset Complete",
            f"Xiaomi Account, Cloud Service, and Settings framework restarted.\n\nNow:\n1. Ensure Wi-Fi is OFF and Mobile Data is active.\n2. Go to Developer Options -> Mi Unlock Status.\n3. Tap 'Add account and device'."
        )

    def show_quota_timings(self):
        QMessageBox.information(
            self,
            "Xiaomi Daily Quota Timers",
            "Xiaomi Server Quota Reset Times:\n\n"
            "- Beijing Time (CST): 00:00 (Midnight)\n"
            "- Indian Standard Time (IST): 9:30 PM\n"
            "- Central European Time (CET): 5:00 PM\n"
            "- Eastern Time (EST): 11:00 AM\n\n"
            "TIP: Open the Xiaomi Community App or Developer Options at exactly 9:29:50 PM IST, and tap Apply / Add Account at 9:30:01 PM IST."
        )

    def launch_tool(self):
        if self.tool_path:
            MiUnlockService.launch_tool(self.tool_path)
        else:
            QMessageBox.information(self, "Tool Not Found", "Please download official MiFlash Unlock from Xiaomi.")
