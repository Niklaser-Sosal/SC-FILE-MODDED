from __future__ import annotations

import os
import shutil
from dataclasses import asdict
from importlib import metadata
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import AppConfig, get_app_dir, load_config, save_config
from .conversion import ConvertJobOptions, run_convert_task
from .mapmerge import MapMergeJobOptions, list_presets, run_mapmerge_task
from .tasks import TaskManager
from .util import get_downloads_dir, resolve_in


def _static_dir() -> Path:
    # Prefer external assets (root/webapp/static) for easier customization.
    env = os.getenv("SCFILE_WEB_STATIC_DIR")
    if env:
        p = Path(env)
        if (p / "index.html").exists():
            return p

    cwd = Path.cwd() / "webapp" / "static"
    if (cwd / "index.html").exists():
        return cwd

    # Monorepo layout: .../sc-file-*/scfile/webapp/server.py -> parents[3] is repo root.
    repo = Path(__file__).resolve().parents[3] / "webapp" / "static"
    if (repo / "index.html").exists():
        return repo

    return Path(__file__).parent / "static"


WEB_VERSION = "1.0.0"


def create_app(task_manager: TaskManager, cfg: AppConfig, log_path: Path) -> FastAPI:
    app = FastAPI(title="SC-FILE:MODDED Web", version=WEB_VERSION)
    app.state.task_manager = task_manager
    app.state.cfg = cfg
    app.state.log_path = log_path

    static_dir = _static_dir()
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

    ui_dir = task_manager.app_dir / "ui"
    ui_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/user", StaticFiles(directory=ui_dir), name="user")

    @app.get("/", response_class=HTMLResponse)
    def index() -> str:
        return (static_dir / "index.html").read_text(encoding="utf-8")

    @app.get("/api/health")
    def health() -> dict[str, Any]:
        return {"ok": True}

    @app.get("/api/settings")
    def get_settings() -> dict[str, Any]:
        data = asdict(cfg)
        if cfg.background_image:
            data["background_url"] = f"/user/{cfg.background_image}"
        return data

    @app.post("/api/settings")
    async def set_settings(payload: dict[str, Any]) -> dict[str, Any]:
        # Shallow merge; keep unknown keys in payload ignored for safety.
        if "theme" in payload and isinstance(payload["theme"], dict):
            for k, v in payload["theme"].items():
                if hasattr(cfg.theme, k) and isinstance(v, str) and v:
                    setattr(cfg.theme, k, v)

        if "language" in payload and isinstance(payload["language"], str):
            lang = payload["language"].lower().strip()
            if lang in ("ru", "en"):
                cfg.language = lang

        if "theme_name" in payload and isinstance(payload["theme_name"], str):
            name = payload["theme_name"].strip()
            if name:
                cfg.theme_name = name

        if "default_output_mode" in payload and isinstance(payload["default_output_mode"], str):
            mode = payload["default_output_mode"].lower().strip()
            if mode in ("zip", "folder"):
                cfg.default_output_mode = mode

        if "default_output_dir" in payload and isinstance(payload["default_output_dir"], str):
            cfg.default_output_dir = payload["default_output_dir"]

        if "default_zip_dir" in payload and isinstance(payload["default_zip_dir"], str):
            cfg.default_zip_dir = payload["default_zip_dir"]

        if "model_formats" in payload and isinstance(payload["model_formats"], list):
            cfg.model_formats = [str(x).lower() for x in payload["model_formats"] if str(x)]

        for key in ("preserve_structure", "unique_names", "parse_skeleton", "parse_animation", "auto_download_zip"):
            if key in payload:
                setattr(cfg, key, bool(payload[key]))

        if "log_level" in payload and isinstance(payload["log_level"], str) and payload["log_level"].strip():
            cfg.log_level = payload["log_level"].strip().upper()

        if "background_enabled" in payload:
            cfg.background_enabled = bool(payload["background_enabled"])

        if "background_opacity" in payload:
            try:
                cfg.background_opacity = float(payload["background_opacity"])
            except Exception:
                pass

        if "background_blur" in payload:
            try:
                cfg.background_blur = int(payload["background_blur"])
            except Exception:
                pass

        if "reduce_motion" in payload:
            cfg.reduce_motion = bool(payload["reduce_motion"])
        if "highlight_enabled" in payload:
            cfg.highlight_enabled = bool(payload["highlight_enabled"])
        if "font_name" in payload and isinstance(payload["font_name"], str):
            font_name = payload["font_name"].strip().lower()
            if font_name in ("europe", "arial", "jetbrains"):
                cfg.font_name = font_name

        if not isinstance(cfg.default_zip_dir, str) or not cfg.default_zip_dir.strip():
            cfg.default_zip_dir = str(get_downloads_dir())

        cfg.background_opacity = max(0.0, min(float(cfg.background_opacity or 0.0), 1.0))
        try:
            cfg.background_blur = max(0, min(int(cfg.background_blur or 0), 32))
        except Exception:
            cfg.background_blur = 0

        try:
            task_manager.logger.setLevel(cfg.log_level.upper())
        except Exception:
            pass

        save_config(task_manager.app_dir, cfg)
        data = asdict(cfg)
        if cfg.background_image:
            data["background_url"] = f"/user/{cfg.background_image}"
        return {"ok": True, "cfg": data}

    @app.get("/api/info")
    def info() -> dict[str, Any]:
        try:
            scfile_version = metadata.version("sc-file")
        except Exception:
            try:
                import scfile  # type: ignore

                scfile_version = getattr(scfile, "__version__", "unknown")
            except Exception:
                scfile_version = "unknown"

        return {
            "scfile_version": scfile_version,
            "web_version": WEB_VERSION,
            "app_dir": str(task_manager.app_dir),
            "log_path": str(log_path),
            "downloads_dir": str(get_downloads_dir()),
            "static_dir": str(static_dir),
        }

    @app.post("/api/ui/background")
    async def upload_background(file: UploadFile = File(...)) -> dict[str, Any]:
        filename = str(file.filename or "").strip()
        ext = Path(filename).suffix.lower()
        if ext not in (".png", ".jpg", ".jpeg", ".webp"):
            raise HTTPException(status_code=400, detail="Unsupported image type")

        for p in ui_dir.glob("background.*"):
            try:
                p.unlink()
            except Exception:
                pass

        dest = ui_dir / f"background{ext}"
        with open(dest, "wb") as fp:
            shutil.copyfileobj(file.file, fp)

        cfg.background_image = dest.name
        cfg.background_enabled = True
        save_config(task_manager.app_dir, cfg)

        return {"ok": True, "filename": dest.name, "url": f"/user/{dest.name}"}

    @app.delete("/api/ui/background")
    async def clear_background() -> dict[str, Any]:
        for p in ui_dir.glob("background.*"):
            try:
                p.unlink()
            except Exception:
                pass

        cfg.background_image = ""
        cfg.background_enabled = False
        save_config(task_manager.app_dir, cfg)
        return {"ok": True}

    @app.post("/api/open")
    async def open_path(payload: dict[str, Any]) -> dict[str, Any]:
        path = payload.get("path")
        if not isinstance(path, str) or not path:
            raise HTTPException(status_code=400, detail="Missing path")

        p = Path(path)
        if not p.exists():
            raise HTTPException(status_code=404, detail="Path not found")

        if os.name == "nt":
            os.startfile(str(p))  # type: ignore[attr-defined]
        else:
            # best-effort
            import subprocess

            subprocess.Popen(["xdg-open", str(p)])

        return {"ok": True}

    @app.post("/api/convert")
    async def convert(
        options: str = Form(...),
        files: list[UploadFile] = File(...),
    ) -> dict[str, Any]:
        job_opts = ConvertJobOptions.from_json(options)

        task = task_manager.new_task(kind="convert")
        task_manager.ensure_dirs(task.id)

        in_root = task_manager.task_input_dir(task.id)

        input_rel_paths: list[Path] = []

        for up in files:
            rel = resolve_in(in_root, up.filename).relative_to(in_root)
            dest = in_root / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            with open(dest, "wb") as fp:
                shutil.copyfileobj(up.file, fp)
            input_rel_paths.append(rel)

        task_manager.update(task.id, total=len(input_rel_paths), message="Queued")
        task_manager.log(task.id, "Upload complete, starting worker…")

        import threading

        thread = threading.Thread(
            target=run_convert_task,
            args=(task_manager, task.id, input_rel_paths, job_opts),
            daemon=True,
        )
        thread.start()

        return {"task_id": task.id}

    @app.get("/api/tasks/{task_id}")
    def task_status(task_id: str) -> dict[str, Any]:
        task = task_manager.get(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return task_manager.as_dict(task_id)

    @app.get("/api/tasks/{task_id}/zip")
    def task_zip(task_id: str):
        task = task_manager.get(task_id)
        if not task or not task.zip_path:
            raise HTTPException(status_code=404, detail="ZIP not available")
        return FileResponse(task.zip_path, filename=f"sc-file-{task_id}.zip")

    @app.get("/api/tasks/{task_id}/files/{rel_path:path}")
    def task_file(task_id: str, rel_path: str):
        task = task_manager.get(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        out_root = task_manager.task_output_dir(task_id)
        try:
            p = resolve_in(out_root, rel_path)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid path")

        if not p.exists() or not p.is_file():
            raise HTTPException(status_code=404, detail="File not found")

        return FileResponse(p)

    @app.get("/api/logs/tail")
    def logs_tail(lines: int = 200):
        lines = max(10, min(int(lines), 2000))
        if not log_path.exists():
            return JSONResponse({"lines": []})
        try:
            content = log_path.read_text(encoding="utf-8", errors="replace").splitlines()
            return JSONResponse({"lines": content[-lines:]})
        except Exception:
            return JSONResponse({"lines": []})

    @app.get("/api/mapmerge/presets")
    def mapmerge_presets() -> dict[str, Any]:
        return {"presets": list_presets()}

    @app.post("/api/mapmerge")
    async def mapmerge(
        options: str = Form(...),
        files: list[UploadFile] = File(...),
    ) -> dict[str, Any]:
        job_opts = MapMergeJobOptions.from_json(options)

        task = task_manager.new_task(kind="mapmerge")
        task_manager.ensure_dirs(task.id)

        in_root = task_manager.task_input_dir(task.id)
        input_rel_paths: list[Path] = []

        for up in files:
            rel = resolve_in(in_root, up.filename).relative_to(in_root)
            dest = in_root / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            with open(dest, "wb") as fp:
                shutil.copyfileobj(up.file, fp)
            input_rel_paths.append(rel)

        task_manager.update(task.id, total=max(1, len(input_rel_paths)), message="Queued")
        task_manager.log(task.id, "Upload complete, starting MapMerge worker…")

        import threading

        thread = threading.Thread(
            target=run_mapmerge_task,
            args=(task_manager, task.id, input_rel_paths, job_opts),
            daemon=True,
        )
        thread.start()

        return {"task_id": task.id}

    return app


def build_app():
    app_dir = get_app_dir()
    cfg = load_config(app_dir)

    from .logging_config import setup_logging

    logger, log_path = setup_logging(app_dir, cfg.log_level)
    task_manager = TaskManager(app_dir=app_dir, logger=logger)

    return create_app(task_manager, cfg, log_path)
