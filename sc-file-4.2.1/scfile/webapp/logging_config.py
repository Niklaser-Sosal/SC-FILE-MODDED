from __future__ import annotations

import logging
import os
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path


def setup_logging(app_dir: Path, level: str = "INFO") -> tuple[logging.Logger, Path]:
    env_dir = Path(os.environ["SCFILE_LOGS_DIR"]) if "SCFILE_LOGS_DIR" in os.environ else None
    if env_dir:
        logs_dir = env_dir
    elif getattr(sys, "frozen", False):
        logs_dir = Path(sys.executable).resolve().parent / "logs"
    else:
        logs_dir = app_dir / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)
    log_path = logs_dir / "sc-file-web.log"

    logger = logging.getLogger("scfile.webapp")
    logger.setLevel(level.upper())
    logger.propagate = False

    # Avoid duplicate handlers when re-running in the same interpreter.
    logger.handlers.clear()

    formatter = logging.Formatter("%(asctime)s %(levelname)s %(message)s")

    file_handler = RotatingFileHandler(
        log_path,
        maxBytes=5 * 1024 * 1024,
        backupCount=3,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

    return logger, log_path
