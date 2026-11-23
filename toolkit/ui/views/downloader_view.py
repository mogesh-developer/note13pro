from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QLineEdit, QProgressBar, QTextEdit, QGroupBox
)
from PySide6.QtCore import QThread, Signal
from pathlib import Path
import asyncio
from toolkit.downloader.manager import DownloadTask

class DownloadWorker(QThread):
    progress_signal = Signal(int, int, float)
    status_signal = Signal(str)
    finished_signal = Signal(bool)

    def __init__(self, url: str, dest_dir: str):
        super().__init__()
        self.url = url
        self.dest_dir = dest_dir
        self.task = DownloadTask(url, dest_dir)

    def run(self):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        success = loop.run_until_complete(
            self.task.run(
                on_progress=lambda d, t, p: self.progress_signal.emit(d, t, p),
                on_status=lambda s: self.status_signal.emit(s)
            )
        )
        self.finished_signal.emit(success)

    def cancel(self):
        self.task.cancel()

class DownloaderView(QWidget):
    def __init__(self):
        super().__init__()
        self.worker = None
        self._init_ui()

    def _init_ui(self):
        layout = QVBoxLayout(self)

        title = QLabel("Public ROM & File Download Manager")
        title.setStyleSheet("font-size: 18px; font-weight: bold; color: #2563eb;")
        layout.addWidget(title)

        input_box = QGroupBox("New Download")
        in_layout = QVBoxLayout(input_box)

        url_layout = QHBoxLayout()
        url_layout.addWidget(QLabel("URL:"))
        self.input_url = QLineEdit()
        self.input_url.setPlaceholderText("https://.../firmware.zip")
        url_layout.addWidget(self.input_url)
        in_layout.addLayout(url_layout)

        btn_layout = QHBoxLayout()
        self.btn_start = QPushButton("Start Download")
        self.btn_start.clicked.connect(self.start_download)
        btn_layout.addWidget(self.btn_start)

        self.btn_cancel = QPushButton("Cancel")
        self.btn_cancel.setEnabled(False)
        self.btn_cancel.clicked.connect(self.cancel_download)
        btn_layout.addWidget(self.btn_cancel)
        btn_layout.addStretch()
        in_layout.addLayout(btn_layout)

        self.progress_bar = QProgressBar()
        self.progress_bar.setValue(0)
        in_layout.addWidget(self.progress_bar)

        layout.addWidget(input_box)

        self.log_text = QTextEdit()
        self.log_text.setReadOnly(True)
        layout.addWidget(self.log_text)

    def start_download(self):
        url = self.input_url.text().strip()
        if not url:
            return
        dest = str(Path.home() / "Downloads" / "XiaomiToolkit")
        self.worker = DownloadWorker(url, dest)
        self.worker.progress_signal.connect(self.on_progress)
        self.worker.status_signal.connect(self.on_status)
        self.worker.finished_signal.connect(self.on_finished)

        self.btn_start.setEnabled(False)
        self.btn_cancel.setEnabled(True)
        self.worker.start()

    def cancel_download(self):
        if self.worker:
            self.worker.cancel()

    def on_progress(self, downloaded: int, total: int, pct: float):
        self.progress_bar.setValue(int(pct))

    def on_status(self, msg: str):
        self.log_text.append(msg)

    def on_finished(self, success: bool):
        self.btn_start.setEnabled(True)
        self.btn_cancel.setEnabled(False)
        status = "Completed successfully!" if success else "Failed or cancelled."
        self.log_text.append(f"\nDownload finished: {status}\n")
