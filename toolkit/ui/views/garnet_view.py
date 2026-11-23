from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QTextEdit, QTableWidget, QTableWidgetItem, QHeaderView, QGroupBox,
    QMessageBox, QComboBox
)
from PySide6.QtGui import QDesktopServices
from PySide6.QtCore import QUrl
from toolkit.devices.garnet_specialist import GarnetSpecialistService
from toolkit.devices.manager import DeviceManager

class GarnetSpecialistView(QWidget):
    def __init__(self):
        super().__init__()
        self._init_ui()

    def _init_ui(self):
        layout = QVBoxLayout(self)

        title = QLabel("Redmi Note 13 Pro 5G (garnet / Indian 2312DRA50I) Specialist Tools")
        title.setObjectName("titleLabel")
        layout.addWidget(title)

        # Device selection & quick diagnostics
        top_layout = QHBoxLayout()
        top_layout.addWidget(QLabel("Connected Device:"))
        self.combo_devices = QComboBox()
        top_layout.addWidget(self.combo_devices)

        self.btn_refresh = QPushButton("Refresh & Query Device")
        self.btn_refresh.clicked.connect(self.query_device_slots)
        top_layout.addWidget(self.btn_refresh)
        top_layout.addStretch()
        layout.addLayout(top_layout)

        # ARB & Partition Slot Box
        hw_box = QGroupBox("Hardware Safety & Anti-Rollback (ARB) Protection")
        hw_layout = QVBoxLayout(hw_box)

        self.text_arb = QTextEdit()
        self.text_arb.setObjectName("terminalConsole")
        self.text_arb.setReadOnly(True)
        self.text_arb.setMaximumHeight(130)
        hw_layout.addWidget(self.text_arb)

        actions_bar = QHBoxLayout()
        self.btn_check_arb = QPushButton("1. Check Anti-Rollback (ARB) Index")
        self.btn_check_arb.clicked.connect(self.check_arb)
        actions_bar.addWidget(self.btn_check_arb)

        self.btn_switch_slot = QPushButton("2. Toggle A/B Boot Slot")
        self.btn_switch_slot.setObjectName("secondaryButton")
        self.btn_switch_slot.clicked.connect(self.toggle_slot)
        actions_bar.addWidget(self.btn_switch_slot)

        self.btn_fastbootd = QPushButton("3. Reboot to Userspace Fastbootd")
        self.btn_fastbootd.setObjectName("secondaryButton")
        self.btn_fastbootd.clicked.connect(self.reboot_fastbootd)
        actions_bar.addWidget(self.btn_fastbootd)
        actions_bar.addStretch()
        hw_layout.addLayout(actions_bar)
        layout.addWidget(hw_box)

        # Official & Custom garnet Resources Table
        res_box = QGroupBox("Verified Firmware & Recovery Directory for garnet (India)")
        r_layout = QVBoxLayout(res_box)

        self.table = QTableWidget(0, 3)
        self.table.setHorizontalHeaderLabels(["Category", "Resource Title", "Download & Guide Link"])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)

        resources = GarnetSpecialistService.RECOMMENDED_RESOURCES
        self.table.setRowCount(len(resources))
        for r, item in enumerate(resources):
            self.table.setItem(r, 0, QTableWidgetItem(item["category"]))
            self.table.setItem(r, 1, QTableWidgetItem(f"{item['title']} ({item['author']})"))
            self.table.setItem(r, 2, QTableWidgetItem(item["url"]))

        r_layout.addWidget(self.table)

        btn_row = QHBoxLayout()
        self.btn_open_portal = QPushButton("Open Selected Resource Portal in Browser")
        self.btn_open_portal.clicked.connect(self.open_selected_portal)
        btn_row.addWidget(self.btn_open_portal)
        btn_row.addStretch()
        r_layout.addLayout(btn_row)

        layout.addWidget(res_box)

        self.refresh_devices()

    def refresh_devices(self):
        self.combo_devices.clear()
        devices = DeviceManager.scan_all_devices()
        for d in devices:
            self.combo_devices.addItem(f"{d.serial} ({d.mode})", d.serial)
        if not devices:
            self.combo_devices.addItem("No connected devices found", "")

    def query_device_slots(self):
        serial = self.combo_devices.currentData()
        if not serial:
            self.refresh_devices()
            serial = self.combo_devices.currentData()
        if not serial:
            QMessageBox.warning(self, "No Device", "Please connect your phone in Fastboot mode.")
            return

        details = GarnetSpecialistService.query_garnet_slots(serial)
        lines = [f"Device Serial: {serial}"]
        for k, v in details.items():
            lines.append(f"{k}: {v}")

        self.text_arb.setText("\n".join(lines))

    def check_arb(self):
        serial = self.combo_devices.currentData()
        if not serial:
            QMessageBox.warning(self, "No Device", "Please select a connected Fastboot device.")
            return

        res = GarnetSpecialistService.check_anti_rollback(serial)
        arb_idx = res.get("anti_rollback_index", "Unknown")
        QMessageBox.information(
            self,
            "Anti-Rollback (ARB) Protection",
            f"Device ARB Index: {arb_idx}\n\n{res.get('warning')}"
        )
        self.text_arb.append(f"\nAnti-Rollback Index (anti): {arb_idx}\n")

    def toggle_slot(self):
        serial = self.combo_devices.currentData()
        if not serial:
            return
        details = GarnetSpecialistService.query_garnet_slots(serial)
        curr = details.get("current-slot", "a")
        target = "b" if curr == "a" else "a"

        reply = QMessageBox.question(
            self,
            "Switch Slot",
            f"Current active boot slot is '{curr}'.\nSwitch active slot to '{target}'?",
            QMessageBox.Yes | QMessageBox.No
        )
        if reply == QMessageBox.Yes:
            code, out = GarnetSpecialistService.switch_slot(serial, target)
            QMessageBox.information(self, "Result", f"Exit: {code}\n{out}")
            self.query_device_slots()

    def reboot_fastbootd(self):
        serial = self.combo_devices.currentData()
        if not serial:
            return
        code, out = GarnetSpecialistService.reboot_userspace_fastbootd(serial)
        QMessageBox.information(
            self,
            "Reboot Fastbootd",
            f"Command sent: fastboot reboot fastboot\nExit: {code}\n{out}\n\nPhone should now display 'fastbootd' on screen."
        )

    def open_selected_portal(self):
        row = self.table.currentRow()
        if row >= 0:
            url = self.table.item(row, 2).text()
            if url:
                QDesktopServices.openUrl(QUrl(url))
