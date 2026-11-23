from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit,
    QPushButton, QTextEdit, QComboBox, QMessageBox
)
from toolkit.core.platform_tools import PlatformTools
from toolkit.devices.manager import DeviceManager
from toolkit.database.db import Database

class ConsoleView(QWidget):
    def __init__(self):
        super().__init__()
        self.db = Database()
        self._init_ui()

    def _init_ui(self):
        layout = QVBoxLayout(self)

        title = QLabel("ADB & Fastboot Command Terminal")
        title.setObjectName("titleLabel")
        layout.addWidget(title)

        # Controls & Presets
        top_layout = QHBoxLayout()
        self.combo_tool = QComboBox()
        self.combo_tool.addItems(["adb", "fastboot"])
        top_layout.addWidget(QLabel("Tool:"))
        top_layout.addWidget(self.combo_tool)

        self.combo_presets = QComboBox()
        self.combo_presets.addItem("-- Select Command Preset --")
        self.presets = self.db.get_presets()
        for p in self.presets:
            self.combo_presets.addItem(f"[{p['tool']}] {p['name']}", p)
        self.combo_presets.currentIndexChanged.connect(self.on_preset_selected)
        top_layout.addWidget(self.combo_presets)
        top_layout.addStretch()
        layout.addLayout(top_layout)

        # Input box
        cmd_layout = QHBoxLayout()
        self.input_cmd = QLineEdit()
        self.input_cmd.setPlaceholderText("Enter command arguments (e.g. devices, getvar all, reboot)")
        self.input_cmd.returnPressed.connect(self.execute_command)
        cmd_layout.addWidget(self.input_cmd)

        self.btn_run = QPushButton("Execute")
        self.btn_run.clicked.connect(self.execute_command)
        cmd_layout.addWidget(self.btn_run)
        layout.addLayout(cmd_layout)

        # Output console
        self.console = QTextEdit()
        self.console.setObjectName("terminalConsole")
        self.console.setReadOnly(True)
        layout.addWidget(self.console)

    def on_preset_selected(self, index: int):
        data = self.combo_presets.currentData()
        if data:
            self.combo_tool.setCurrentText(data["tool"])
            self.input_cmd.setText(data["command"])

    def execute_command(self):
        tool = self.combo_tool.currentText()
        cmd_text = self.input_cmd.text().strip()
        if not cmd_text:
            return

        # Preflight safety checks
        dangerous = ["erase", "flash", "format", "repartition", "unlock", "oem unlock"]
        if any(d in cmd_text.lower() for d in dangerous):
            reply = QMessageBox.warning(
                self,
                "Confirm Operation",
                f"The command '{cmd_text}' may modify or erase device partitions.\nDo you want to proceed?",
                QMessageBox.Yes | QMessageBox.No
            )
            if reply != QMessageBox.Yes:
                return

        exe = PlatformTools.get_adb_path() if tool == "adb" else PlatformTools.get_fastboot_path()
        if not exe:
            self.console.append(f"[ERROR] {tool} executable not found on system.\n")
            return

        self.console.append(f"> {tool} {cmd_text}")
        code, out = DeviceManager.run_cmd([exe] + cmd_text.split(), timeout=15)
        self.db.log_command(tool, cmd_text, code, out)
        if out:
            self.console.append(out)
        self.console.append(f"[Exit code: {code}]\n")
