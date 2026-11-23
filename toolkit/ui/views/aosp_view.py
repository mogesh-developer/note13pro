from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QTableWidget, QTableWidgetItem, QHeaderView
)
from PySide6.QtGui import QDesktopServices
from PySide6.QtCore import QUrl
from toolkit.firmware.aosp_catalog import AospCatalogService

class AospView(QWidget):
    def __init__(self):
        super().__init__()
        self._init_ui()

    def _init_ui(self):
        layout = QVBoxLayout(self)

        title = QLabel("Custom AOSP & Alternative ROM Catalog")
        title.setStyleSheet("font-size: 18px; font-weight: bold; color: #2563eb;")
        layout.addWidget(title)

        desc = QLabel("Official download directories for popular open-source AOSP ROMs supporting Xiaomi devices:")
        layout.addWidget(desc)

        self.table = QTableWidget(0, 3)
        self.table.setHorizontalHeaderLabels(["ROM Name", "Description", "Official Download Portal"])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)

        catalog = AospCatalogService.get_catalog()
        self.table.setRowCount(len(catalog))
        for r, item in enumerate(catalog):
            self.table.setItem(r, 0, QTableWidgetItem(item.get("name", "")))
            self.table.setItem(r, 1, QTableWidgetItem(item.get("note", "")))
            self.table.setItem(r, 2, QTableWidgetItem(item.get("url", "")))

        layout.addWidget(self.table)

        btn_layout = QHBoxLayout()
        self.btn_open = QPushButton("Open Selected Portal in Web Browser")
        self.btn_open.clicked.connect(self.open_selected)
        btn_layout.addWidget(self.btn_open)
        btn_layout.addStretch()
        layout.addLayout(btn_layout)

    def open_selected(self):
        row = self.table.currentRow()
        if row >= 0:
            url = self.table.item(row, 2).text()
            if url:
                QDesktopServices.openUrl(QUrl(url))
