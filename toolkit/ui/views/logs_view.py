from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QTextEdit, QPushButton,
    QHBoxLayout, QFileDialog
)
from toolkit.database.db import Database

class LogsView(QWidget):
    def __init__(self):
        super().__init__()
        self.db = Database()
        self._init_ui()

    def _init_ui(self):
        layout = QVBoxLayout(self)

        title = QLabel("Operations & Command History Log")
        title.setObjectName("titleLabel")
        layout.addWidget(title)

        btn_layout = QHBoxLayout()
        self.btn_refresh = QPushButton("Refresh Logs")
        self.btn_refresh.clicked.connect(self.load_logs)
        btn_layout.addWidget(self.btn_refresh)

        self.btn_export = QPushButton("Export Log to File")
        self.btn_export.setObjectName("secondaryButton")
        self.btn_export.clicked.connect(self.export_logs)
        btn_layout.addWidget(self.btn_export)
        btn_layout.addStretch()
        layout.addLayout(btn_layout)

        self.log_text = QTextEdit()
        self.log_text.setObjectName("terminalConsole")
        self.log_text.setReadOnly(True)
        layout.addWidget(self.log_text)

        self.load_logs()

    def load_logs(self):
        history = self.db.get_command_history(limit=100)
        lines = []
        for h in history:
            lines.append(f"[{h['timestamp']}] ({h['tool'].upper()}) Exit: {h['exit_code']}")
            lines.append(f"  Command: {h['command']}")
            if h.get('output'):
                lines.append(f"  Output:\n{h['output']}\n")
        self.log_text.setText("\n".join(lines) if lines else "No logged operations recorded yet.")

    def export_logs(self):
        path, _ = QFileDialog.getSaveFileName(self, "Export Log", "toolkit_operations.log", "Log Files (*.log *.txt)")
        if path:
            with open(path, "w", encoding="utf-8") as f:
                f.write(self.log_text.toPlainText())
