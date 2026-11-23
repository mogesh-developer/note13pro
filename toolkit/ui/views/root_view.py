from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QTextEdit, QTableWidget,
    QTableWidgetItem, QHeaderView, QGroupBox
)
from toolkit.root.service import RootService

class RootView(QWidget):
    def __init__(self):
        super().__init__()
        self._init_ui()

    def _init_ui(self):
        layout = QVBoxLayout(self)

        title = QLabel("Root & Boot Image Assistant")
        title.setStyleSheet("font-size: 18px; font-weight: bold; color: #2563eb;")
        layout.addWidget(title)

        box = QGroupBox("Official Root Frameworks & Safe Workflows")
        b_layout = QVBoxLayout(box)

        self.table = QTableWidget(0, 3)
        self.table.setHorizontalHeaderLabels(["Method / Solution", "Recommended Partition Target", "Workflow Guide"])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)

        resources = RootService.OFFICIAL_RESOURCES
        self.table.setRowCount(len(resources))
        for r, item in enumerate(resources):
            self.table.setItem(r, 0, QTableWidgetItem(f"{item['name']} ({item['author']})"))
            self.table.setItem(r, 1, QTableWidgetItem(item["recommended_target"]))
            self.table.setItem(r, 2, QTableWidgetItem(item["method"]))

        b_layout.addWidget(self.table)
        layout.addWidget(box)

        notes = QTextEdit()
        notes.setReadOnly(True)
        notes.setMaximumHeight(160)
        notes.setText(
            "Security & Safety Guidelines:\n"
            "- Never root without an unlocked bootloader.\n"
            "- Always test a patched boot image first using 'fastboot boot boot.img' instead of flashing directly.\n"
            "- If bootloop occurs after temporary boot, simply reboot the device to return to unmodified stock state."
        )
        layout.addWidget(notes)
