import sqlite3
import os
import json
from pathlib import Path
from typing import Dict, Any, List, Optional

class Database:
    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            config_dir = Path.home() / ".open_xiaomi_toolkit"
            config_dir.mkdir(parents=True, exist_ok=True)
            self.db_path = str(config_dir / "toolkit.db")
        else:
            self.db_path = db_path
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            # Settings table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
            """)
            # Command history table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS command_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    tool TEXT NOT NULL,
                    command TEXT NOT NULL,
                    exit_code INTEGER,
                    output TEXT
                )
            """)
            # Custom command presets
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS command_presets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    tool TEXT NOT NULL,
                    command TEXT NOT NULL,
                    description TEXT
                )
            """)
            # Operations / Flash logs
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS operations_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    operation_type TEXT NOT NULL,
                    target_device TEXT,
                    status TEXT NOT NULL,
                    details TEXT
                )
            """)
            # Downloads catalog / tracking
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS downloads (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    url TEXT NOT NULL,
                    destination TEXT NOT NULL,
                    filename TEXT NOT NULL,
                    total_bytes INTEGER DEFAULT 0,
                    downloaded_bytes INTEGER DEFAULT 0,
                    status TEXT DEFAULT 'pending',
                    hash_expected TEXT,
                    hash_computed TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

            # Seed default command presets if empty
            cursor.execute("SELECT COUNT(*) as cnt FROM command_presets")
            if cursor.fetchone()["cnt"] == 0:
                defaults = [
                    ("Reboot System", "adb", "reboot", "Standard reboot to system"),
                    ("Reboot to Bootloader", "adb", "reboot bootloader", "Reboot to fastboot mode"),
                    ("Reboot to Recovery", "adb", "reboot recovery", "Reboot to stock or custom recovery"),
                    ("Reboot to EDL (Emergency)", "adb", "reboot edl", "Reboot Qualcomm EDL 9008"),
                    ("Fastboot Get All Vars", "fastboot", "getvar all", "Query all bootloader variables"),
                    ("Fastboot Device Info", "fastboot", "oem device-info", "Check bootloader unlock status"),
                    ("Fastboot Reboot Fastboot", "fastboot", "reboot fastboot", "Enter userspace fastbootd mode"),
                    ("Fastboot Reboot Recovery", "fastboot", "reboot recovery", "Fastboot reboot to recovery")
                ]
                cursor.executemany(
                    "INSERT INTO command_presets (name, tool, command, description) VALUES (?, ?, ?, ?)",
                    defaults
                )
                conn.commit()
        finally:
            conn.close()

    def get_setting(self, key: str, default: Any = None) -> Any:
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT value FROM settings WHERE key = ?", (key,))
            row = cur.fetchone()
            if row:
                try:
                    return json.loads(row["value"])
                except Exception:
                    return row["value"]
            return default
        finally:
            conn.close()

    def set_setting(self, key: str, value: Any):
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            str_val = json.dumps(value) if not isinstance(value, str) else value
            cur.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                (key, str_val)
            )
            conn.commit()
        finally:
            conn.close()

    def log_command(self, tool: str, command: str, exit_code: int, output: str):
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO command_history (tool, command, exit_code, output) VALUES (?, ?, ?, ?)",
                (tool, command, exit_code, output[:10000])
            )
            conn.commit()
        finally:
            conn.close()

    def get_command_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM command_history ORDER BY id DESC LIMIT ?", (limit,))
            return [dict(row) for row in cur.fetchall()]
        finally:
            conn.close()

    def get_presets(self) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM command_presets ORDER BY id ASC")
            return [dict(row) for row in cur.fetchall()]
        finally:
            conn.close()
