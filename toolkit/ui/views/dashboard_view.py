from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QTableWidget, QTableWidgetItem, QHeaderView, QTextEdit, QGroupBox
)
from PySide6.QtCore import Qt
from toolkit.devices.manager import DeviceManager

class DashboardView(QWidget):
    def __init__(self):
        super().__init__()
        self._init_ui()

    def _init_ui(self):
        layout = QVBoxLayout(self)

        # Header / Status
        header_layout = QHBoxLayout()
        title = QLabel("Device Dashboard")
        title.setObjectName("titleLabel")
        header_layout.addWidget(title)

        header_layout.addStretch()
        self.btn_refresh = QPushButton("Refresh Devices")
        self.btn_refresh.clicked.connect(self.refresh_devices)
        header_layout.addWidget(self.btn_refresh)
        layout.addLayout(header_layout)

        # Devices Table
        self.table = QTableWidget(0, 4)
        self.table.setHorizontalHeaderLabels(["Serial", "Mode", "Product / Codename", "Model"])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.table.setSelectionBehavior(QTableWidget.SelectRows)
        self.table.itemSelectionChanged.connect(self.on_device_selected)
        layout.addWidget(self.table)

        # Device Details
        self.group_details = QGroupBox("Selected Device Properties & Diagnostics")
        details_layout = QVBoxLayout(self.group_details)
        self.text_details = QTextEdit()
        self.text_details.setObjectName("terminalConsole")
        self.text_details.setReadOnly(True)
        details_layout.addWidget(self.text_details)
        layout.addWidget(self.group_details)

        self.devices = []
        self.refresh_devices()

    def refresh_devices(self):
        self.devices = DeviceManager.scan_all_devices()
        self.table.setRowCount(len(self.devices))
        for row, dev in enumerate(self.devices):
            self.table.setItem(row, 0, QTableWidgetItem(dev.serial))
            self.table.setItem(row, 1, QTableWidgetItem(dev.mode))
            self.table.setItem(row, 2, QTableWidgetItem(dev.product or "-"))
            self.table.setItem(row, 3, QTableWidgetItem(dev.model or "-"))

        if not self.devices:
            self.text_details.setText("No devices detected in ADB or Fastboot mode.\n\nTips:\n- Enable USB Debugging in Android Developer Options.\n- Connect device in Fastboot mode (Power + Volume Down).\n- Ensure proper Android USB drivers are installed.")
        else:
            self.table.selectRow(0)

    def on_device_selected(self):
        selected_rows = self.table.selectionModel().selectedRows()
        if not selected_rows:
            return
        row = selected_rows[0].row()
        if row < len(self.devices):
            dev = self.devices[row]
            lines = [
                f"Serial Number: {dev.serial}",
                f"Connection Mode: {dev.mode.upper()}",
                f"Product Codename: {dev.product or 'Unknown'}",
                f"Model: {dev.model or 'Unknown'}",
                "\n--- Properties / Bootloader Variables ---"
            ]
            for k, v in dev.details.items():
                if k != "all_vars":
                    lines.append(f"{k}: {v}")
            self.text_details.setText("\n".join(lines))
