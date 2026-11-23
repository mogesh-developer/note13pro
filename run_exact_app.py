import sys
import threading
import time
import uvicorn
from PySide6.QtWidgets import QApplication, QMainWindow
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtCore import QUrl
from toolkit.web_engine.server import app as fastapi_app

PORT = 28419

def start_server():
    uvicorn.run(fastapi_app, host="127.0.0.1", port=PORT, log_level="warning")

class ExactAppWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("TechOffice Xiaomi Service V0.9.59 (Offline Community Edition)")
        self.resize(1280, 800)

        self.browser = QWebEngineView()
        self.setCentralWidget(self.browser)
        self.browser.setUrl(QUrl(f"http://127.0.0.1:{PORT}/"))

def main():
    # Start local backend thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    time.sleep(1.0)

    app = QApplication(sys.argv)
    window = ExactAppWindow()
    window.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
