from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QTableWidget, QTableWidgetItem, QHeaderView, QMessageBox, QGroupBox,
    QComboBox
)
from toolkit.devices.packages import PackageService
from toolkit.devices.manager import DeviceManager

class DebloatView(QWidget):
    def __init__(self):
        super().__init__()
        self._init_ui()

    def _init_ui(self):
        layout = QVBoxLayout(self)

        title = QLabel("Debloat & Package Manager (No Root Required)")
        title.setStyleSheet("font-size: 18px; font-weight: bold; color: #2563eb;")
        layout.addWidget(title)

        # Device selection & actions
        top_layout = QHBoxLayout()
        top_layout.addWidget(QLabel("Target Device:"))
        self.combo_devices = QComboBox()
        top_layout.addWidget(self.combo_devices)

        self.btn_refresh = QPushButton("Scan Bloatware")
        self.btn_refresh.clicked.connect(self.scan_packages)
        top_layout.addWidget(self.btn_refresh)
        top_layout.addStretch()
        layout.addLayout(top_layout)

        # Dialer Management Box
        dialer_box = QGroupBox("Google vs. MIUI/HyperOS Dialer Manager")
        d_layout = QHBoxLayout(dialer_box)
        self.lbl_dialer = QLabel("Status: Click Scan to check dialer status.")
        d_layout.addWidget(self.lbl_dialer)
        d_layout.addStretch()

        self.btn_disable_google = QPushButton("Disable Google Dialer")
        self.btn_disable_google.clicked.connect(self.disable_google_dialer)
        d_layout.addWidget(self.btn_disable_google)

        self.btn_restore_google = QPushButton("Restore Google Dialer")
        self.btn_restore_google.clicked.connect(self.restore_google_dialer)
        d_layout.addWidget(self.btn_restore_google)
        layout.addWidget(dialer_box)

        # Packages Table
        self.table = QTableWidget(0, 4)
        self.table.setHorizontalHeaderLabels(["Package ID", "App Name", "Category", "Status"])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        layout.addWidget(self.table)

        btn_bar = QHBoxLayout()
        self.btn_uninstall_sel = QPushButton("Uninstall Selected for User 0")
        self.btn_uninstall_sel.setStyleSheet("background-color: #dc2626; color: white; font-weight: bold;")
        self.btn_uninstall_sel.clicked.connect(self.uninstall_selected)
        btn_bar.addWidget(self.btn_uninstall_sel)

        self.btn_restore_sel = QPushButton("Restore Selected Package")
        self.btn_restore_sel.clicked.connect(self.restore_selected)
        btn_bar.addWidget(self.btn_restore_sel)
        btn_bar.addStretch()
        layout.addLayout(btn_bar)

        self.packages_data = []
        self.refresh_devices()

    def refresh_devices(self):
        self.combo_devices.clear()
        devices = [d for d in DeviceManager.scan_adb_devices() if d.mode == "device"]
        for d in devices:
            self.combo_devices.addItem(f"{d.serial} ({d.model or d.product})", d.serial)
        if not devices:
            self.combo_devices.addItem("No authorized ADB device connected", "")

    def scan_packages(self):
        serial = self.combo_devices.currentData()
        if not serial:
            self.refresh_devices()
            serial = self.combo_devices.currentData()
        if not serial:
            QMessageBox.warning(self, "No Device", "Please connect an authorized device in ADB mode.")
            return

        self.packages_data = PackageService.scan_bloatware(serial)
        self.table.setRowCount(len(self.packages_data))
        for r, item in enumerate(self.packages_data):
            self.table.setItem(r, 0, QTableWidgetItem(item["package"]))
            self.table.setItem(r, 1, QTableWidgetItem(item["name"]))
            self.table.setItem(r, 2, QTableWidgetItem(item["category"]))
            status = "Installed" if item["installed"] else "Uninstalled / Inactive"
            self.table.setItem(r, 3, QTableWidgetItem(status))

        dialer = PackageService.get_dialer_status(serial)
        self.lbl_dialer.setText(
            f"Google Dialer: {'Installed' if dialer['google_dialer_installed'] else 'Not Installed'} | "
            f"MIUI Dialer: {'Installed' if dialer['miui_dialer_installed'] else 'Not Installed'}"
        )

    def uninstall_selected(self):
        serial = self.combo_devices.currentData()
        row = self.table.currentRow()
        if row < 0 or not serial:
            return
        pkg = self.table.item(row, 0).text()
        reply = QMessageBox.question(self, "Confirm Debloat", f"Uninstall {pkg} for user 0?\n(Can be restored at any time)", QMessageBox.Yes | QMessageBox.No)
        if reply == QMessageBox.Yes:
            code, out = PackageService.uninstall_package(serial, pkg)
            QMessageBox.information(self, "Result", f"Exit code: {code}\n{out}")
            self.scan_packages()

    def restore_selected(self):
        serial = self.combo_devices.currentData()
        row = self.table.currentRow()
        if row < 0 or not serial:
            return
        pkg = self.table.item(row, 0).text()
        code, out = PackageService.restore_package(serial, pkg)
        QMessageBox.information(self, "Result", f"Exit code: {code}\n{out}")
        self.scan_packages()

    def disable_google_dialer(self):
        serial = self.combo_devices.currentData()
        if serial:
            code, out = PackageService.disable_google_dialer(serial)
            QMessageBox.information(self, "Result", f"Exit code: {code}\n{out}")
            self.scan_packages()

    def restore_google_dialer(self):
        serial = self.combo_devices.currentData()
        if serial:
            code, out = PackageService.restore_google_dialer(serial)
            QMessageBox.information(self, "Result", f"Exit code: {code}\n{out}")
            self.scan_packages()
