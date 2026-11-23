from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QFileDialog, QComboBox, QTextEdit, QMessageBox, QGroupBox
)
from PySide6.QtCore import QThread, Signal
from toolkit.flasher.engine import FlasherEngine
from toolkit.devices.manager import DeviceManager

class FlashWorker(QThread):
    log_signal = Signal(str)
    progress_signal = Signal(int, int, str)
    finished_signal = Signal(bool)

    def __init__(self, mode: str, serial: str, path: str):
        super().__init__()
        self.mode = mode
        self.serial = serial
        self.path = path
        self.engine = FlasherEngine()

    def run(self):
        if self.mode == "official_script":
            success = self.engine.flash_official_script(
                self.path,
                self.serial,
                on_log=lambda l: self.log_signal.emit(l)
            )
        elif self.mode == "sideload":
            success = self.engine.adb_sideload(
                self.serial,
                self.path,
                on_log=lambda l: self.log_signal.emit(l)
            )
        else:
            success = False
            self.log_signal.emit("[ERROR] Unsupported flash mode")

        self.finished_signal.emit(success)

    def cancel(self):
        self.engine.cancel()

class FlasherView(QWidget):
    def __init__(self):
        super().__init__()
        self.worker = None
        self._init_ui()

    def _init_ui(self):
        layout = QVBoxLayout(self)

        title = QLabel("Device Flashing Workflows")
        title.setObjectName("titleLabel")
        layout.addWidget(title)

        box = QGroupBox("Flash Configuration")
        b_layout = QVBoxLayout(box)

        # Device selection
        d_layout = QHBoxLayout()
        d_layout.addWidget(QLabel("Target Device:"))
        self.combo_devices = QComboBox()
        d_layout.addWidget(self.combo_devices)
        self.btn_refresh_devs = QPushButton("Scan Devices")
        self.btn_refresh_devs.clicked.connect(self.refresh_devices)
        d_layout.addWidget(self.btn_refresh_devs)
        b_layout.addLayout(d_layout)

        # Mode selection
        m_layout = QHBoxLayout()
        m_layout.addWidget(QLabel("Flash Mode:"))
        self.combo_mode = QComboBox()
        self.combo_mode.addItem("Official Fastboot Script (flash_all.bat)", "official_script")
        self.combo_mode.addItem("ADB Sideload (Recovery OTA ZIP)", "sideload")
        m_layout.addWidget(self.combo_mode)
        b_layout.addLayout(m_layout)

        # File selection
        f_layout = QHBoxLayout()
        self.btn_select_file = QPushButton("Select File / Script")
        self.btn_select_file.clicked.connect(self.select_file)
        f_layout.addWidget(self.btn_select_file)
        self.lbl_file = QLabel("No file selected.")
        f_layout.addWidget(self.lbl_file)
        f_layout.addStretch()
        b_layout.addLayout(f_layout)

        # Action buttons
        btn_layout = QHBoxLayout()
        self.btn_start = QPushButton("Start Flashing")
        self.btn_start.setObjectName("dangerButton")
        self.btn_start.clicked.connect(self.start_flash)
        btn_layout.addWidget(self.btn_start)

        self.btn_cancel = QPushButton("Cancel")
        self.btn_cancel.setObjectName("secondaryButton")
        self.btn_cancel.setEnabled(False)
        self.btn_cancel.clicked.connect(self.cancel_flash)
        btn_layout.addWidget(self.btn_cancel)
        btn_layout.addStretch()
        b_layout.addLayout(btn_layout)

        layout.addWidget(box)

        self.console = QTextEdit()
        self.console.setObjectName("terminalConsole")
        self.console.setReadOnly(True)
        layout.addWidget(self.console)

        self.selected_path = None
        self.refresh_devices()

    def refresh_devices(self):
        self.combo_devices.clear()
        devices = DeviceManager.scan_all_devices()
        for d in devices:
            self.combo_devices.addItem(f"{d.serial} ({d.mode})", d.serial)
        if not devices:
            self.combo_devices.addItem("No connected devices found", "")

    def select_file(self):
        f_path, _ = QFileDialog.getOpenFileName(
            self,
            "Select Flash Script or Package",
            "",
            "Flash Scripts & Packages (*.bat *.zip *.tgz);;All Files (*.*)"
        )
        if f_path:
            self.selected_path = f_path
            self.lbl_file.setText(f_path)

    def start_flash(self):
        serial = self.combo_devices.currentData()
        if not serial:
            QMessageBox.warning(self, "No Device", "Please select a target device.")
            return
        if not self.selected_path:
            QMessageBox.warning(self, "No File", "Please select a flash script or package file.")
            return

        reply = QMessageBox.critical(
            self,
            "WARNING: Destructive Operation",
            f"You are about to flash device {serial}.\nFlashing modified or incorrect firmware can BRICK your device or wipe all data.\n\nAre you absolutely sure you wish to continue?",
            QMessageBox.Yes | QMessageBox.No
        )
        if reply != QMessageBox.Yes:
            return

        mode = self.combo_mode.currentData()
        self.worker = FlashWorker(mode, serial, self.selected_path)
        self.worker.log_signal.connect(self.console.append)
        self.worker.finished_signal.connect(self.on_finished)

        self.btn_start.setEnabled(False)
        self.btn_cancel.setEnabled(True)
        self.console.append(f"\n[FLASH INITIALIZED] Target: {serial}, Mode: {mode}\n")
        self.worker.start()

    def cancel_flash(self):
        if self.worker:
            self.worker.cancel()

    def on_finished(self, success: bool):
        self.btn_start.setEnabled(True)
        self.btn_cancel.setEnabled(False)
        status = "COMPLETED" if success else "STOPPED / FAILED"
        self.console.append(f"\n[OPERATION {status}]\n")
