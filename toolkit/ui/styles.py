"""
QSS Stylesheet for Open Xiaomi Service Toolkit
Provides high contrast, modern dark/slate theme with explicit foreground colors
so all text, tables, inputs, labels, and buttons are crystal clear and easily readable.
"""

APP_STYLE = """
QMainWindow {
    background-color: #0f172a;
}

QWidget {
    color: #f1f5f9;
    font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
    font-size: 13px;
}

/* Sidebar */
QFrame#sidebar {
    background-color: #090d16;
    border-right: 1px solid #1e293b;
}

/* QStackedWidget Views Container */
QStackedWidget {
    background-color: #0f172a;
    padding: 16px;
}

/* Group Boxes */
QGroupBox {
    border: 1px solid #334155;
    border-radius: 8px;
    margin-top: 14px;
    padding-top: 18px;
    font-weight: 600;
    color: #38bdf8;
    background-color: #1e293b;
}

QGroupBox::title {
    subcontrol-origin: margin;
    subcontrol-position: top left;
    left: 14px;
    padding: 0 6px;
    color: #38bdf8;
}

/* Labels */
QLabel {
    color: #f1f5f9;
}

QLabel#titleLabel {
    font-size: 20px;
    font-weight: bold;
    color: #38bdf8;
    padding-bottom: 6px;
}

/* Buttons */
QPushButton {
    background-color: #2563eb;
    color: #ffffff;
    border: 1px solid #3b82f6;
    border-radius: 6px;
    padding: 8px 16px;
    font-weight: 600;
    outline: none;
}

QPushButton:hover {
    background-color: #1d4ed8;
    border-color: #60a5fa;
}

QPushButton:pressed {
    background-color: #1e40af;
}

QPushButton:disabled {
    background-color: #334155;
    color: #64748b;
    border-color: #475569;
}

QPushButton#dangerButton {
    background-color: #dc2626;
    border-color: #ef4444;
}

QPushButton#dangerButton:hover {
    background-color: #b91c1c;
}

QPushButton#secondaryButton {
    background-color: #334155;
    border-color: #475569;
    color: #f8fafc;
}

QPushButton#secondaryButton:hover {
    background-color: #475569;
}

/* Line Edit & Inputs */
QLineEdit {
    background-color: #0b1120;
    color: #f8fafc;
    border: 1px solid #334155;
    border-radius: 6px;
    padding: 8px 12px;
    selection-background-color: #2563eb;
}

QLineEdit:focus {
    border: 1px solid #38bdf8;
}

/* Combo Box */
QComboBox {
    background-color: #0b1120;
    color: #f8fafc;
    border: 1px solid #334155;
    border-radius: 6px;
    padding: 6px 12px;
    min-height: 24px;
}

QComboBox:focus {
    border: 1px solid #38bdf8;
}

QComboBox QAbstractItemView {
    background-color: #1e293b;
    color: #f8fafc;
    selection-background-color: #2563eb;
    selection-color: #ffffff;
    border: 1px solid #475569;
}

/* Text Edit & Consoles */
QTextEdit {
    background-color: #0b1120;
    color: #f8fafc;
    border: 1px solid #334155;
    border-radius: 6px;
    padding: 10px;
    font-size: 13px;
    line-height: 1.4;
}

QTextEdit#terminalConsole {
    background-color: #020617;
    color: #38bdf8;
    font-family: "Cascadia Code", "Consolas", monospace;
    font-size: 12px;
    border: 1px solid #1e293b;
}

/* Tables */
QTableWidget {
    background-color: #0b1120;
    color: #f8fafc;
    gridline-color: #1e293b;
    border: 1px solid #334155;
    border-radius: 6px;
    selection-background-color: #2563eb;
    selection-color: #ffffff;
}

QHeaderView::section {
    background-color: #1e293b;
    color: #94a3b8;
    font-weight: 600;
    padding: 8px;
    border: none;
    border-right: 1px solid #334155;
    border-bottom: 1px solid #334155;
}

QTableWidget::item {
    padding: 6px;
}

QTableWidget::item:selected {
    background-color: #2563eb;
    color: #ffffff;
}

/* Progress Bar */
QProgressBar {
    background-color: #1e293b;
    border: 1px solid #334155;
    border-radius: 6px;
    text-align: center;
    color: #ffffff;
    font-weight: bold;
    height: 22px;
}

QProgressBar::chunk {
    background-color: #38bdf8;
    border-radius: 5px;
}

/* Scrollbars */
QScrollBar:vertical {
    border: none;
    background: #0f172a;
    width: 10px;
    margin: 0px;
}

QScrollBar::handle:vertical {
    background: #334155;
    min-height: 20px;
    border-radius: 5px;
}

QScrollBar::handle:vertical:hover {
    background: #475569;
}

QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
    height: 0px;
}
"""
