from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from .util import get_downloads_dir


@dataclass
class ThemeConfig:
    # Main theme: yellow, black, white(text)
    accent: str = "#FFD400"
    bg: str = "#0B0B0B"
    panel: str = "#121212"
    panel2: str = "#0F0F0F"
    text: str = "#FFFFFF"
    muted_text: str = "#CFCFCF"
    danger: str = "#FF4D4D"


@dataclass
class AppConfig:
    theme: ThemeConfig = field(default_factory=ThemeConfig)

    # UI
    language: str = "ru"  # "ru" | "en"
    theme_name: str = "niklaser"
    background_enabled: bool = False
    background_image: str = ""  # filename under app_dir/ui/
    background_opacity: float = 0.22  # 0..1
    background_blur: int = 0  # px
    reduce_motion: bool = False
    highlight_enabled: bool = True
    font_name: str = "europe"

    # Defaults for converter
    default_output_mode: str = "zip"  # "zip" | "folder"
    default_output_dir: str = ""
    default_zip_dir: str = ""  # empty = Downloads
    preserve_structure: bool = True
    unique_names: bool = True

    # Model options
    model_formats: list[str] = field(default_factory=lambda: ["glb"])
    parse_skeleton: bool = True
    parse_animation: bool = False

    # Logging
    log_level: str = "INFO"

    # Behavior
    auto_download_zip: bool = True


def get_app_dir() -> Path:
    """Return per-user directory for configs/work/logs."""

    if os.name == "nt":
        base = os.getenv("LOCALAPPDATA") or os.getenv("APPDATA") or str(Path.home())
        return Path(base) / "sc-file-web"

    xdg = os.getenv("XDG_STATE_HOME") or os.getenv("XDG_CONFIG_HOME")
    if xdg:
        return Path(xdg) / "sc-file-web"

    return Path.home() / ".sc-file-web"


def _coerce_theme(data: dict[str, Any]) -> ThemeConfig:
    theme = ThemeConfig()
    for key in asdict(theme).keys():
        value = data.get(key)
        if isinstance(value, str) and value:
            setattr(theme, key, value)
    return theme


def load_config(app_dir: Path) -> AppConfig:
    cfg_path = app_dir / "config.json"
    cfg = AppConfig()

    if not cfg_path.exists():
        cfg.default_zip_dir = str(get_downloads_dir())
        return cfg

    try:
        raw = json.loads(cfg_path.read_text(encoding="utf-8"))
    except Exception:
        cfg.default_zip_dir = str(get_downloads_dir())
        return cfg

    if isinstance(raw, dict):
        theme_raw = raw.get("theme")
        if isinstance(theme_raw, dict):
            cfg.theme = _coerce_theme(theme_raw)

        # UI
        language = raw.get("language")
        if isinstance(language, str) and language.lower() in ("ru", "en"):
            cfg.language = language.lower()

        theme_name = raw.get("theme_name")
        if isinstance(theme_name, str) and theme_name.strip():
            cfg.theme_name = theme_name.strip()

        for key in ("background_enabled", "reduce_motion", "auto_download_zip"):
            if key in raw:
                setattr(cfg, key, bool(raw[key]))
        if "highlight_enabled" in raw:
            cfg.highlight_enabled = bool(raw["highlight_enabled"])

        font_name = raw.get("font_name")
        if isinstance(font_name, str) and font_name.strip():
            cfg.font_name = font_name.strip().lower()

        bg_image = raw.get("background_image")
        if isinstance(bg_image, str):
            cfg.background_image = bg_image

        try:
            if "background_opacity" in raw:
                cfg.background_opacity = float(raw["background_opacity"])
        except Exception:
            pass

        try:
            if "background_blur" in raw:
                cfg.background_blur = int(raw["background_blur"])
        except Exception:
            pass

        for key in (
            "default_output_mode",
            "default_output_dir",
            "default_zip_dir",
            "preserve_structure",
            "unique_names",
            "parse_skeleton",
            "parse_animation",
            "log_level",
        ):
            if key in raw:
                setattr(cfg, key, raw[key])

        model_formats = raw.get("model_formats")
        if isinstance(model_formats, list):
            cfg.model_formats = [str(x).lower() for x in model_formats if str(x)]

    if not isinstance(cfg.default_zip_dir, str) or not cfg.default_zip_dir.strip():
        cfg.default_zip_dir = str(get_downloads_dir())

    # Clamp UI values
    cfg.background_opacity = max(0.0, min(float(cfg.background_opacity or 0.0), 1.0))
    try:
        cfg.background_blur = max(0, min(int(cfg.background_blur or 0), 32))
    except Exception:
        cfg.background_blur = 0

    if cfg.font_name not in ("europe", "arial", "jetbrains"):
        cfg.font_name = "europe"

    return cfg


def save_config(app_dir: Path, cfg: AppConfig) -> None:
    app_dir.mkdir(parents=True, exist_ok=True)
    cfg_path = app_dir / "config.json"
    cfg_path.write_text(json.dumps(asdict(cfg), ensure_ascii=False, indent=2), encoding="utf-8")
