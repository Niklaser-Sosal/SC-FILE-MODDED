from __future__ import annotations

import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SCFILE_DIR = ROOT / "sc-file-4.2.1"
SCMAPMERGE_DIR = ROOT / "sc-mapmerge-2.1.1"


def _resource_base() -> Path:
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        return Path(getattr(sys, "_MEIPASS"))  # type: ignore[arg-type]
    return ROOT


def _runtime_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return ROOT


def _ensure_dev_import_paths() -> None:
    # When running from sources (not frozen), add local project folders so imports work.
    if getattr(sys, "frozen", False):
        return
    if SCFILE_DIR.exists():
        sys.path.insert(0, str(SCFILE_DIR))
    if SCMAPMERGE_DIR.exists():
        sys.path.insert(0, str(SCMAPMERGE_DIR))


def _configure_env() -> None:
    base = _resource_base()
    static_dir = base / "webapp" / "static"

    if (static_dir / "index.html").exists():
        os.environ.setdefault("SCFILE_WEB_STATIC_DIR", str(static_dir))

    icon = static_dir / "app_icon.ico"
    if icon.exists():
        os.environ.setdefault("SCFILE_WEB_APP_ICON", str(icon))
    logs_dir = _runtime_root() / "logs"
    os.environ.setdefault("SCFILE_LOGS_DIR", str(logs_dir))


def main() -> None:
    _ensure_dev_import_paths()
    _configure_env()

    from scfile.webapp.__main__ import main as web_main

    web_main()


if __name__ == "__main__":
    main()
