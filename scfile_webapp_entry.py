from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path


def _detect_static_dir() -> Path | None:
    env = os.getenv("SCFILE_WEB_STATIC_DIR")
    if env:
        p = Path(env)
        if (p / "index.html").exists():
            return p

    meipass = getattr(sys, "_MEIPASS", None)
    if meipass:
        base = Path(str(meipass))
        for rel in (Path("scfile") / "webapp" / "static", Path("webapp") / "static"):
            p = base / rel
            if (p / "index.html").exists():
                return p

    for base in (Path.cwd(), Path(__file__).resolve().parent):
        p = base / "webapp" / "static"
        if (p / "index.html").exists():
            return p

    return None


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="scfile-web", description="SC-FILE Web UI (desktop)")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=0, type=int, help="0 = pick a free port")
    parser.add_argument("--no-window", action="store_true", help="Do not open a desktop window (open browser).")
    args = parser.parse_args(argv)

    static_dir = _detect_static_dir()
    if static_dir:
        os.environ.setdefault("SCFILE_WEB_STATIC_DIR", str(static_dir))
        icon = static_dir / "app_icon.ico"
        if icon.exists():
            os.environ.setdefault("SCFILE_WEB_APP_ICON", str(icon))
        os.environ.setdefault("SCFILE_LOGS_DIR", str(static_dir.parent.parent / "logs"))

    from scfile.webapp.runner import run

    run(host=args.host, port=args.port, window=not args.no_window)


if __name__ == "__main__":
    main()
