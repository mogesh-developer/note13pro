from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QTextEdit, QGroupBox
)

class SettingsView(QWidget):
    def __init__(self):
        super().__init__()
        self._init_ui()

    def _init_ui(self):
        layout = QVBoxLayout(self)

        title = QLabel("Settings & About")
        title.setStyleSheet("font-size: 18px; font-weight: bold; color: #2563eb;")
        layout.addWidget(title)

        about_box = QGroupBox("About Open Xiaomi Service Toolkit")
        a_layout = QVBoxLayout(about_box)
        about_text = QTextEdit()
        about_text.setReadOnly(True)
        about_text.setText(
            "Open Xiaomi Service Toolkit — Free & Local-First\n"
            "Version: 1.0.0 (Clean Architecture & Independent)\n\n"
            "Principles:\n"
            "- Free and open to everyone.\n"
            "- Zero registration, zero mandatory accounts, zero proprietary licensing servers.\n"
            "- All device operations run strictly local on your workstation.\n"
            "- No telemetry or device serials are ever uploaded.\n\n"
            "Disclaimer:\n"
            "This software is provided for servicing and repair purposes. Always ensure you have backups of your device data before performing any flashing or unlocking procedures."
        )
        a_layout.addWidget(about_text)
        layout.addWidget(about_box)
