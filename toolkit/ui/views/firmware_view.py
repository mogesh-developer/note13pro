from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QTableWidget, QTableWidgetItem, QHeaderView, QTextEdit, QMessageBox
)
from toolkit.firmware.inspector import FirmwarePackage

class FirmwareView(QWidget):
    def __init__(self):
        super().__init__()
        self._init_ui()

    def _init_ui(self):
        layout = QVBoxLayout(self)

        title = QLabel("Firmware & ROM Archive Inspector")
        title.setObjectName("titleLabel")
        layout.addWidget(title)

        top_layout = QHBoxLayout()
        self.btn_select = QPushButton("Select ROM Archive (.zip, .tgz, folder)")
        self.btn_select.clicked.connect(self.select_file)
        top_layout.addWidget(self.btn_select)

        self.lbl_path = QLabel("No archive selected.")
        top_layout.addWidget(self.lbl_path)
        top_layout.addStretch()
        layout.addLayout(top_layout)

        # Images table
        self.table = QTableWidget(0, 3)
        self.table.setHorizontalHeaderLabels(["Partition", "Image Name", "Size (bytes)"])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        layout.addWidget(self.table)

        # Metadata
        self.text_meta = QTextEdit()
        self.text_meta.setReadOnly(True)
        self.text_meta.setMaximumHeight(150)
        layout.addWidget(self.text_meta)

    def select_file(self):
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            "Select Firmware Archive",
            "",
            "Firmware Archives (*.zip *.tgz *.tar.gz *.tar);;All Files (*.*)"
        )
        if file_path:
            self.lbl_path.setText(file_path)
            pkg = FirmwarePackage(file_path)
            res = pkg.inspect()
            if "error" in res:
                QMessageBox.critical(self, "Inspection Error", res["error"])
                return

            images = res.get("images", [])
            self.table.setRowCount(len(images))
            for r, img in enumerate(images):
                self.table.setItem(r, 0, QTableWidgetItem(img.get("partition", "")))
                self.table.setItem(r, 1, QTableWidgetItem(img.get("name", "")))
                self.table.setItem(r, 2, QTableWidgetItem(str(img.get("size", 0))))

            meta = res.get("metadata", {})
            lines = [f"Archive Type: {meta.get('type')}", f"Total Images Found: {meta.get('images_count')}"]
            if meta.get("scripts"):
                lines.append(f"Flash Scripts: {', '.join(meta['scripts'])}")
            self.text_meta.setText("\n".join(lines))
