from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from .runner import run


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="python -m scfile.webapp", description="SC-FILE:MODDED Web UI")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=0, type=int, help="0 = pick a free port")
    parser.add_argument("--no-window", action="store_true", help="Do not open a desktop window (open browser).")
    parser.add_argument("files", nargs="*")
    args = parser.parse_args(argv)

    if args.files:
        files = []
        for f in args.files:
            try:
                p = Path(f).expanduser()
                if p.exists() and p.is_file():
                    files.append(str(p.resolve()))
            except Exception:
                continue
        if files:
            os.environ.setdefault("SCFILE_OPEN_FILES", json.dumps(files, ensure_ascii=False))
            os.environ.setdefault("SCFILE_WEB_START_PATH", "/fast")

            try:
                from .config import get_app_dir, load_config
                from .logging_config import setup_logging

                cfg = load_config(get_app_dir())
                if getattr(cfg, "fast_console_enabled", False):
                    logger, _ = setup_logging(get_app_dir(), cfg.log_level)
                    logger.info("Fast console mode enabled. Files: %s", len(files))

                    if cfg.default_output_mode != "folder":
                        logger.warning("Fast console mode uses folder output only. ZIP mode ignored.")

                    args = []
                    if cfg.default_output_dir and cfg.default_output_mode == "folder":
                        args += ["--output", cfg.default_output_dir]
                        if cfg.preserve_structure:
                            args += ["--relative"]
                    elif cfg.preserve_structure:
                        args += ["--relative"]

                    if cfg.parse_skeleton:
                        args += ["--skeleton"]
                    if cfg.parse_animation:
                        args += ["--animation"]
                    if cfg.unique_names:
                        args += ["--unique"]
                    for fmt in (cfg.model_formats or []):
                        args += ["-F", str(fmt)]
                    args += files

                    from scfile.cli.commands import scfile as cli_scfile

                    try:
                        cli_scfile.main(args=args, standalone_mode=False)
                    except SystemExit:
                        pass

                    logger.info("Fast console conversion finished.")
                    return
            except Exception:
                pass

    run(host=args.host, port=args.port, window=not args.no_window)


if __name__ == "__main__":
    main()
