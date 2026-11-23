import sys
from PySide6.QtWidgets import (
    QMainWindow, QWidget, QHBoxLayout, QVBoxLayout,
    QListWidget, QStackedWidget, QLabel, QFrame
)
from PySide6.QtCore import Qt

from toolkit.ui.styles import APP_STYLE
from toolkit.ui.views.dashboard_view import DashboardView
from toolkit.ui.views.console_view import ConsoleView
from toolkit.ui.views.firmware_view import FirmwareView
from toolkit.ui.views.flasher_view import FlasherView
from toolkit.ui.views.garnet_view import GarnetSpecialistView
from toolkit.ui.views.debloat_view import DebloatView
from toolkit.ui.views.unlock_view import UnlockView
from toolkit.ui.views.drivers_view import DriversView
from toolkit.ui.views.downloader_view import DownloaderView
from toolkit.ui.views.aosp_view import AospView
from toolkit.ui.views.root_view import RootView
from toolkit.ui.views.logs_view import LogsView
from toolkit.ui.views.settings_view import SettingsView

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Open Xiaomi Service Toolkit — Free & Local-First")
        self.resize(1200, 780)
        self.setStyleSheet(APP_STYLE)
        self._init_ui()

    def _init_ui(self):
        central = QWidget()
        self.setCentralWidget(central)
        main_layout = QHBoxLayout(central)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # Sidebar
        sidebar = QFrame()
        sidebar.setObjectName("sidebar")
        sidebar.setFixedWidth(250)
        sb_layout = QVBoxLayout(sidebar)
        sb_layout.setContentsMargins(12, 24, 12, 24)

        app_title = QLabel("Xiaomi Toolkit")
        app_title.setStyleSheet("font-size: 19px; font-weight: 800; color: #38bdf8; padding-left: 8px;")
        sb_layout.addWidget(app_title)

        app_subtitle = QLabel("Garnet & Local-First Edition")
        app_subtitle.setStyleSheet("font-size: 11px; color: #94a3b8; padding-left: 8px; margin-bottom: 24px;")
        sb_layout.addWidget(app_subtitle)

        self.nav_list = QListWidget()
        self.nav_list.setStyleSheet("""
            QListWidget {
                background-color: transparent;
                border: none;
                outline: none;
                font-size: 13px;
                color: #cbd5e1;
            }
            QListWidget::item {
                padding: 10px 14px;
                border-radius: 6px;
                margin-bottom: 4px;
            }
            QListWidget::item:selected {
                background-color: #2563eb;
                color: #ffffff;
                font-weight: bold;
            }
            QListWidget::item:hover:!selected {
                background-color: #1e293b;
                color: #ffffff;
            }
        """)

        nav_items = [
            "Device Dashboard",
            "Redmi Note 13 Pro (garnet)",
            "ADB & Fastboot Console",
            "Firmware & ROM Browser",
            "Flashing Workflows",
            "Debloat & App Manager",
            "Mi Unlock & HyperOS Fix",
            "USB Drivers & Fastboot Fix",
            "Download Manager",
            "AOSP ROM Catalog",
            "Root & Boot Utilities",
            "Operations & Logs",
            "Settings & About"
        ]
        self.nav_list.addItems(nav_items)
        self.nav_list.currentRowChanged.connect(self.switch_view)
        sb_layout.addWidget(self.nav_list)
        sb_layout.addStretch()

        main_layout.addWidget(sidebar)

        # Content Pages
        self.stack = QStackedWidget()
        self.stack.setStyleSheet("background-color: #0f172a; padding: 20px;")

        self.stack.addWidget(DashboardView())
        self.stack.addWidget(GarnetSpecialistView())
        self.stack.addWidget(ConsoleView())
        self.stack.addWidget(FirmwareView())
        self.stack.addWidget(FlasherView())
        self.stack.addWidget(DebloatView())
        self.stack.addWidget(UnlockView())
        self.stack.addWidget(DriversView())
        self.stack.addWidget(DownloaderView())
        self.stack.addWidget(AospView())
        self.stack.addWidget(RootView())
        self.stack.addWidget(LogsView())
        self.stack.addWidget(SettingsView())

        main_layout.addWidget(self.stack)

        self.nav_list.setCurrentRow(0)

    def switch_view(self, index: int):
        self.stack.setCurrentIndex(index)
