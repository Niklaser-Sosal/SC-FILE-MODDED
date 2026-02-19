from __future__ import annotations

import argparse
import os
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DEFAULT_EXE_NAME = "SC-FILE_MODDED"  # ':' is not allowed in Windows filenames


def _find_scfile_dir(root: Path) -> Path | None:
    direct = root / "sc-file"
    if (direct / "pyproject.toml").exists() and (direct / "scfile").exists():
        return direct

    candidates = sorted(root.glob("sc-file-*"), reverse=True)
    for c in candidates:
        if (c / "pyproject.toml").exists() and (c / "scfile").exists():
            return c
    return None


def _find_scmapmerge_dir(root: Path) -> Path | None:
    direct = root / "sc-mapmerge"
    if (direct / "scmapmerge").exists():
        return direct

    candidates = sorted(root.glob("sc-mapmerge-*"), reverse=True)
    for c in candidates:
        if (c / "scmapmerge").exists():
            return c
    return None


def _find_static_dir(root: Path, scfile_dir: Path | None) -> Path | None:
    direct = root / "webapp" / "static"
    if (direct / "index.html").exists():
        return direct

    if scfile_dir:
        p = scfile_dir / "scfile" / "webapp" / "static"
        if (p / "index.html").exists():
            return p

    return None


def build(*, onefile: bool = True, noconsole: bool = True, clean: bool = True, name: str = DEFAULT_EXE_NAME) -> None:
    try:
        import PyInstaller.__main__  # type: ignore
    except Exception:
        print("[ERROR] PyInstaller is not installed for this Python.")
        print("        Run `scfile-setup.bat` (recommended) or install from requirements:")
        print("        `<venv>\\python.exe -m pip install -r sc-file-*\\requirements.txt -r sc-file-*\\requirements-web.txt`")
        raise SystemExit(1)

    scfile_dir = _find_scfile_dir(ROOT)
    if not scfile_dir:
        print(f"[ERROR] Could not find sc-file sources near: {ROOT}")
        raise SystemExit(1)

    scmapmerge_dir = _find_scmapmerge_dir(ROOT)
    if not scmapmerge_dir:
        print(f"[ERROR] Could not find sc-mapmerge sources near: {ROOT}")
        raise SystemExit(1)

    static_dir = _find_static_dir(ROOT, scfile_dir)
    if not static_dir:
        print(f"[ERROR] Could not find web assets near: {ROOT / 'webapp' / 'static'}")
        raise SystemExit(1)

    icon = static_dir / "app_icon.ico"
    if not icon.exists():
        print(f"[ERROR] Missing icon: {icon}")
        raise SystemExit(1)

    entrypoint = ROOT / "scfile_webapp_entry.py"
    if not entrypoint.exists():
        print(f"[ERROR] Missing entrypoint: {entrypoint}")
        raise SystemExit(1)

    dest = "webapp\\static" if os.name == "nt" else "webapp/static"
    add_static = f"{static_dir}{os.pathsep}{dest}"

    args: list[str] = [
        str(entrypoint),
        "--name",
        name,
        "--specpath",
        str(ROOT / "build"),
        "--workpath",
        str(ROOT / "build" / "work"),
        "--distpath",
        str(ROOT / "dist"),
        "--paths",
        str(scfile_dir),
        "--paths",
        str(scmapmerge_dir),
        "--add-data",
        add_static,
        "-i",
        str(icon),
        "--hidden-import",
        "rich._unicode_data.unicode17-0-0",
        "--hidden-import",
        "rich._unicode_data",
        "--collect-data",
        "rich",
        "--collect-submodules",
        "webview",
        "--collect-submodules",
        "scmapmerge",
        "--collect-data",
        "scmapmerge",
    ]

    if clean:
        args.append("--clean")
    if onefile:
        args.append("--onefile")
    if noconsole:
        args.append("--noconsole")

    PyInstaller.__main__.run(args)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Build SC-FILE:MODDED (Web UI) executable via PyInstaller.")
    parser.add_argument("--onedir", action="store_true", help="Build folder distribution instead of onefile.")
    parser.add_argument("--console", action="store_true", help="Show console window.")
    parser.add_argument("--no-clean", action="store_true", help="Do not pass --clean to PyInstaller.")
    parser.add_argument("--name", default=DEFAULT_EXE_NAME, help="EXE filename (no ':' on Windows).")
    args = parser.parse_args(argv)

    build(onefile=not args.onedir, noconsole=not args.console, clean=not args.no_clean, name=args.name)


if __name__ == "__main__":
    main()
