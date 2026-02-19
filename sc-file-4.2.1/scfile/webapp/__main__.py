from __future__ import annotations

import argparse

from .runner import run


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="python -m scfile.webapp", description="SC-FILE:MODDED Web UI")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=0, type=int, help="0 = pick a free port")
    parser.add_argument("--no-window", action="store_true", help="Do not open a desktop window (open browser).")
    args = parser.parse_args(argv)

    run(host=args.host, port=args.port, window=not args.no_window)


if __name__ == "__main__":
    main()
