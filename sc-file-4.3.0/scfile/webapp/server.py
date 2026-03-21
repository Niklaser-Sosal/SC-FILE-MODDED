from __future__ import annotations

import base64
import json
import mimetypes
import os
import platform
import shutil
import sys
import zipfile
from hashlib import sha1
from dataclasses import asdict
from importlib import metadata
from pathlib import Path
from typing import Any
from urllib.parse import quote

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


WEB_VERSION = "1.1"

def _parse_open_files() -> list[str]:
    raw = os.getenv("SCFILE_OPEN_FILES", "").strip()
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except Exception:
        return []
    if not isinstance(data, list):
        return []
    out = []
    for item in data:
        if not isinstance(item, str):
            continue
        p = Path(item).expanduser()
        if p.exists() and p.is_file():
            out.append(str(p.resolve()))
    return out


def create_app(task_manager: TaskManager, cfg: AppConfig, log_path: Path) -> FastAPI:
    app = FastAPI(title="SC-FILE:MODDED Web", version=WEB_VERSION)
    app.state.task_manager = task_manager
    app.state.cfg = cfg
    app.state.log_path = log_path
    app.state.open_files = _parse_open_files()

    static_dir = _static_dir()
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

    logger = task_manager.logger
    logger.info("Web app init. static_dir=%s open_files=%s", str(static_dir), len(app.state.open_files or []))

    ui_dir = task_manager.app_dir / "ui"
    ui_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/user", StaticFiles(directory=ui_dir), name="user")

    @app.get("/", response_class=HTMLResponse)
    def index() -> str:
        return (static_dir / "index.html").read_text(encoding="utf-8")

    @app.get("/fast", response_class=HTMLResponse)
    def fast() -> str:
        fast_html = static_dir / "fast.html"
        if fast_html.exists():
            return fast_html.read_text(encoding="utf-8")
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
        if isinstance(payload, dict):
            try:
                logger.info("Settings update: %s", ", ".join(sorted(payload.keys())))
            except Exception:
                pass
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

        if "fast_console_enabled" in payload:
            cfg.fast_console_enabled = bool(payload["fast_console_enabled"])

        if "log_level" in payload and isinstance(payload["log_level"], str) and payload["log_level"].strip():
            cfg.log_level = payload["log_level"].strip().upper()

        if "background_enabled" in payload:
            cfg.background_enabled = bool(payload["background_enabled"])
        if "background_builtin" in payload and isinstance(payload["background_builtin"], str):
            value = payload["background_builtin"].strip()
            # Allow only filenames from static/backrounds
            if value and "/" not in value and "\\" not in value and ".." not in value:
                cfg.background_builtin = value
            elif not value:
                cfg.background_builtin = ""

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
        if "anime_prikoly_enabled" in payload:
            cfg.anime_prikoly_enabled = bool(payload["anime_prikoly_enabled"])
        if "highlight_enabled" in payload:
            cfg.highlight_enabled = bool(payload["highlight_enabled"])
        if "font_name" in payload and isinstance(payload["font_name"], str):
            font_name = payload["font_name"].strip().lower()
            if font_name in ("europe", "arial", "jetbrains"):
                cfg.font_name = font_name
        if "map_view_blur_enabled" in payload:
            cfg.map_view_blur_enabled = bool(payload["map_view_blur_enabled"])
        if "profile_nickname" in payload and isinstance(payload["profile_nickname"], str):
            nickname = payload["profile_nickname"].strip()
            cfg.profile_nickname = nickname[:32]
        if "activity_tracking_ack" in payload:
            cfg.activity_tracking_ack = bool(payload["activity_tracking_ack"])

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
            import scfile  # type: ignore

            scfile_version = getattr(scfile, "__version__", "unknown")
        except Exception:
            try:
                scfile_version = metadata.version("sc-file")
            except Exception:
                scfile_version = "unknown"

        return {
            "scfile_version": scfile_version,
            "web_version": WEB_VERSION,
            "app_dir": str(task_manager.app_dir),
            "config_path": str(task_manager.app_dir / "config.json"),
            "log_path": str(log_path),
            "logs_dir": str(log_path.parent),
            "downloads_dir": str(get_downloads_dir()),
            "static_dir": str(static_dir),
            "runtime_frozen": bool(getattr(sys, "frozen", False)),
            "python_version": platform.python_version(),
            "platform": platform.platform(),
            "open_files": list(app.state.open_files or []),
        }

    @app.post("/api/ui/background")
    async def upload_background(file: UploadFile = File(...)) -> dict[str, Any]:
        filename = str(file.filename or "").strip()
        logger.info("Background upload requested: %s", filename)
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
        cfg.background_builtin = ""
        cfg.background_enabled = True
        save_config(task_manager.app_dir, cfg)

        return {"ok": True, "filename": dest.name, "url": f"/user/{dest.name}"}

    @app.delete("/api/ui/background")
    async def clear_background() -> dict[str, Any]:
        logger.info("Background cleared")
        for p in ui_dir.glob("background.*"):
            try:
                p.unlink()
            except Exception:
                pass

        cfg.background_image = ""
        cfg.background_builtin = ""
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

        logger.info("Open path: %s", str(p))
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
        try:
            logger.info(
                "Convert request: files=%s output_mode=%s output_dir=%s zip_dir=%s",
                len(files),
                job_opts.output_mode,
                job_opts.output_dir,
                job_opts.zip_dir,
            )
        except Exception:
            pass

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

    @app.post("/api/convert/path")
    async def convert_from_paths(payload: dict[str, Any]) -> dict[str, Any]:
        opts_raw = payload.get("options") if isinstance(payload, dict) else {}
        paths_raw = payload.get("paths") if isinstance(payload, dict) else []

        if not isinstance(paths_raw, list) or not paths_raw:
            raise HTTPException(status_code=400, detail="No paths provided")

        try:
            options = ConvertJobOptions.from_json(json.dumps(opts_raw))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid options")

        task = task_manager.new_task(kind="convert")
        task_manager.ensure_dirs(task.id)
        in_root = task_manager.task_input_dir(task.id)

        used_names: set[str] = set()
        input_rel_paths: list[Path] = []

        def _unique_name(name: str) -> str:
            base = Path(name).stem
            ext = Path(name).suffix
            candidate = f"{base}{ext}"
            i = 1
            while candidate in used_names:
                candidate = f"{base}_{i}{ext}"
                i += 1
            used_names.add(candidate)
            return candidate

        for item in paths_raw:
            if not isinstance(item, str):
                continue
            p = Path(item).expanduser()
            if not p.exists() or not p.is_file():
                continue
            rel_name = _unique_name(p.name)
            dest = in_root / rel_name
            dest.parent.mkdir(parents=True, exist_ok=True)
            try:
                shutil.copy2(p, dest)
                input_rel_paths.append(Path(rel_name))
            except Exception:
                continue

        if not input_rel_paths:
            raise HTTPException(status_code=400, detail="No valid files to import")

        try:
            logger.info(
                "Convert-from-paths: requested=%s imported=%s output_mode=%s",
                len(paths_raw),
                len(input_rel_paths),
                options.output_mode,
            )
        except Exception:
            pass

        task_manager.update(task.id, total=len(input_rel_paths), message="Queued")
        task_manager.log(task.id, "Import complete, starting worker...")

        import threading

        thread = threading.Thread(
            target=run_convert_task,
            args=(task_manager, task.id, input_rel_paths, options),
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

    def _resolve_task_output_file(task_id: str, rel_path: str) -> Path:
        task = task_manager.get(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        out_root = task_manager.task_output_dir(task_id)
        try:
            path = resolve_in(out_root, rel_path)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid path")

        if not path.exists() or not path.is_file():
            raise HTTPException(status_code=404, detail="File not found")
        return path

    def _ensure_unique_dest(path: Path) -> Path:
        if not path.exists():
            return path
        stem = path.stem
        suffix = path.suffix
        for i in range(1, 10_000):
            candidate = path.with_name(f"{stem}_{i}{suffix}")
            if not candidate.exists():
                return candidate
        raise HTTPException(status_code=500, detail="Could not allocate destination path")

    def _hidden_map_cache_root() -> Path:
        base = task_manager.app_dir / ".scfile_hidden_cache" / "map_view"
        base.mkdir(parents=True, exist_ok=True)
        if os.name == "nt":
            try:
                os.system(f'attrib +h "{base.parent}" >nul 2>nul')
            except Exception:
                pass
        return base

    def _map_cache_dir(task_id: str, rel_path: str, source: Path | None = None) -> Path:
        version = ""
        if source is not None:
            try:
                stat = source.stat()
                version = f"|{stat.st_size}|{stat.st_mtime_ns}"
            except Exception:
                version = ""
        cache_profile = "mapv_tiles_2048_q76_m2"
        key_src = f"{cache_profile}|{task_id}|{Path(rel_path).as_posix()}{version}"
        key = sha1(key_src.encode("utf-8", errors="ignore")).hexdigest()
        base = _hidden_map_cache_root() / key[:2] / key
        base.mkdir(parents=True, exist_ok=True)
        return base

    def _encode_rel_for_url(rel: str) -> str:
        parts = [quote(segment, safe="") for segment in Path(rel).as_posix().split("/") if segment != ""]
        return "/".join(parts)

    def _watermark_text() -> str:
        encoded = "U0MtRklMRTpNT0RERUQgQlkgTmlrbGFzZXIgYW5kIGZ1Y2sgeW91IFNwZWN0cnVtIFND"
        try:
            return base64.b64decode(encoded).decode("utf-8", errors="ignore")
        except Exception:
            return "SC-FILE:MODDED"

    def _apply_map_watermark(image):
        try:
            from PIL import Image, ImageDraw, ImageFont  # type: ignore
        except Exception:
            return image

        text = _watermark_text()
        if not text:
            return image

        base_img = image.convert("RGBA")
        overlay = Image.new("RGBA", base_img.size, (0, 0, 0, 0))
        drawer = ImageDraw.Draw(overlay)
        font_size = max(16, int(max(base_img.size) * 0.018))
        font = ImageFont.load_default()
        for name in ("arial.ttf", "Arial.ttf", "DejaVuSans.ttf"):
            try:
                font = ImageFont.truetype(name, font_size)
                break
            except Exception:
                continue

        try:
            bbox = drawer.textbbox((0, 0), text, font=font)
            text_w = max(1, int(bbox[2] - bbox[0]))
            text_h = max(1, int(bbox[3] - bbox[1]))
        except Exception:
            text_w, text_h = (320, 28)

        step_x = max(260, text_w + 110)
        step_y = max(160, text_h + 70)
        alpha = 96

        for y in range(-text_h, int(base_img.height + step_y), step_y):
            shift = int(step_x * 0.35) if ((y // step_y) & 1) else 0
            for x in range(-text_w, int(base_img.width + step_x), step_x):
                drawer.text((x + shift, y), text, fill=(255, 212, 0, alpha), font=font)

        out = Image.alpha_composite(base_img, overlay)
        if image.mode == "RGBA":
            return out
        return out.convert("RGB")

    @app.get("/api/tasks/{task_id}/zip")
    def task_zip(task_id: str):
        task = task_manager.get(task_id)
        if not task or not task.zip_path:
            raise HTTPException(status_code=404, detail="ZIP not available")
        return FileResponse(task.zip_path, filename=f"sc-file-{task_id}.zip")

    @app.get("/api/tasks/{task_id}/map-view/{rel_path:path}/meta")
    def task_map_view_meta(task_id: str, rel_path: str) -> dict[str, Any]:
        path = _resolve_task_output_file(task_id, rel_path)
        stat = path.stat()

        width: int | None = None
        height: int | None = None
        try:
            from PIL import Image  # type: ignore

            with Image.open(path) as image:
                width, height = image.size
        except Exception:
            width, height = None, None

        mime, _ = mimetypes.guess_type(str(path))
        rel = Path(rel_path).as_posix()
        rel_url = _encode_rel_for_url(rel)
        tile_size = 2048
        tile_cols = ((width + tile_size - 1) // tile_size) if width else 0
        tile_rows = ((height + tile_size - 1) // tile_size) if height else 0
        return {
            "ok": True,
            "task_id": task_id,
            "rel_path": rel,
            "file_name": path.name,
            "suffix": path.suffix.lower(),
            "bytes": stat.st_size,
            "width": width,
            "height": height,
            "pixels": (width * height) if (width and height) else None,
            "mime": mime or "application/octet-stream",
            "download_url": f"/api/tasks/{task_id}/files/{rel_url}",
            "zip_url": f"/api/tasks/{task_id}/map-view/{rel_url}/zip",
            "copy_downloads_url": f"/api/tasks/{task_id}/map-view/{rel_url}/copy-downloads",
            "thumb_url": f"/api/tasks/{task_id}/map-view/{rel_url}/thumb.webp",
            "render_url": f"/api/tasks/{task_id}/map-view/{rel_url}/render.webp",
            "tile_size": tile_size,
            "tile_cols": tile_cols,
            "tile_rows": tile_rows,
            "tiles_total": tile_cols * tile_rows,
            "tile_url_template": f"/api/tasks/{task_id}/map-view/{rel_url}/tile/{{x}}/{{y}}.webp",
        }

    @app.get("/api/tasks/{task_id}/map-view/{rel_path:path}/render.webp")
    def task_map_view_render(task_id: str, rel_path: str):
        source = _resolve_task_output_file(task_id, rel_path)
        cache_dir = _map_cache_dir(task_id, rel_path, source)
        render_path = cache_dir / "render.webp"
        if render_path.exists():
            return FileResponse(render_path, media_type="image/webp")

        try:
            from PIL import Image  # type: ignore
        except Exception:
            raise HTTPException(status_code=500, detail="Pillow is required for map rendering")

        try:
            with Image.open(source) as image:
                image.load()
                out = image.convert("RGB")
                out = _apply_map_watermark(out)
                out.save(render_path, format="WEBP", quality=80, method=3)
        except Exception as err:
            raise HTTPException(status_code=400, detail=f"Unable to render map: {err}")

        return FileResponse(render_path, media_type="image/webp")

    @app.get("/api/tasks/{task_id}/map-view/{rel_path:path}/thumb.webp")
    def task_map_view_thumb(task_id: str, rel_path: str):
        source = _resolve_task_output_file(task_id, rel_path)
        cache_dir = _map_cache_dir(task_id, rel_path, source)
        thumb_path = cache_dir / "thumb.webp"
        if thumb_path.exists():
            return FileResponse(thumb_path, media_type="image/webp")

        try:
            from PIL import Image  # type: ignore
        except Exception:
            raise HTTPException(status_code=500, detail="Pillow is required for thumbnails")

        try:
            with Image.open(source) as image:
                image.load()
                thumb = image.convert("RGB")
                thumb.thumbnail((360, 240), Image.Resampling.LANCZOS)
                thumb = _apply_map_watermark(thumb)
                thumb.save(thumb_path, format="WEBP", quality=72, method=3)
        except Exception as err:
            raise HTTPException(status_code=400, detail=f"Unable to generate thumbnail: {err}")

        return FileResponse(thumb_path, media_type="image/webp")

    @app.get("/api/tasks/{task_id}/map-view/{rel_path:path}/tile/{x}/{y}.webp")
    def task_map_view_tile(task_id: str, rel_path: str, x: int, y: int):
        if x < 0 or y < 0:
            raise HTTPException(status_code=404, detail="Tile not found")

        source = _resolve_task_output_file(task_id, rel_path)
        cache_dir = _map_cache_dir(task_id, rel_path, source)
        tile_size = 2048
        tile_path = cache_dir / f"tile_{tile_size}_{x}_{y}.webp"
        if tile_path.exists():
            return FileResponse(tile_path, media_type="image/webp")

        try:
            from PIL import Image  # type: ignore
        except Exception:
            raise HTTPException(status_code=500, detail="Pillow is required for tiles")

        try:
            with Image.open(source) as image:
                image.load()
                width, height = image.size

                left = x * tile_size
                top = y * tile_size
                if left >= width or top >= height:
                    raise HTTPException(status_code=404, detail="Tile not found")

                right = min(left + tile_size, width)
                bottom = min(top + tile_size, height)

                tile = image.crop((left, top, right, bottom)).convert("RGB")
                tile = _apply_map_watermark(tile)
                tile.save(tile_path, format="WEBP", quality=76, method=2)
        except HTTPException:
            raise
        except Exception as err:
            raise HTTPException(status_code=400, detail=f"Unable to generate tile: {err}")

        return FileResponse(tile_path, media_type="image/webp")

    @app.post("/api/tasks/{task_id}/map-view/{rel_path:path}/copy-downloads")
    async def task_map_view_copy_downloads(task_id: str, rel_path: str) -> dict[str, Any]:
        source = _resolve_task_output_file(task_id, rel_path)
        downloads_dir = get_downloads_dir()
        downloads_dir.mkdir(parents=True, exist_ok=True)

        dest = _ensure_unique_dest(downloads_dir / source.name)
        shutil.copy2(source, dest)

        try:
            task_manager.log(task_id, f"Map copy to Downloads: {dest.name}")
        except Exception:
            pass

        return {"ok": True, "path": str(dest), "filename": dest.name}

    @app.get("/api/tasks/{task_id}/map-view/{rel_path:path}/zip")
    def task_map_view_zip(task_id: str, rel_path: str):
        source = _resolve_task_output_file(task_id, rel_path)
        zip_dir = task_manager.task_tmp_dir(task_id) / "map_view_zip"
        zip_dir.mkdir(parents=True, exist_ok=True)

        zip_path = _ensure_unique_dest(zip_dir / f"{source.stem}.zip")
        with zipfile.ZipFile(zip_path, mode="w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
            zf.write(source, arcname=source.name)

        try:
            task_manager.log(task_id, f"Map ZIP ready: {zip_path.name}")
        except Exception:
            pass

        return FileResponse(zip_path, filename=zip_path.name)

    @app.get("/api/tasks/{task_id}/texture-preview/{rel_path:path}")
    def task_texture_preview(task_id: str, rel_path: str):
        source = _resolve_task_output_file(task_id, rel_path)
        suffix = source.suffix.lower()

        if suffix != ".dds":
            return FileResponse(source)

        try:
            from PIL import Image  # type: ignore
        except Exception:
            raise HTTPException(status_code=500, detail="Pillow is not installed")

        try:
            stat = source.stat()
            cache_key_src = f"texprev_dds_webp_v2|{source.resolve()}|{stat.st_size}|{stat.st_mtime_ns}"
            cache_key = sha1(cache_key_src.encode("utf-8", errors="ignore")).hexdigest()
            cache_root = _hidden_map_cache_root().parent / "texture_preview"
            cache_dir = cache_root / cache_key[:2]
            cache_dir.mkdir(parents=True, exist_ok=True)
            cache_path = cache_dir / f"{cache_key}.webp"

            if cache_path.exists():
                return FileResponse(cache_path, media_type="image/webp")

            with Image.open(source) as img:
                out_img = img.convert("RGBA")
                max_side = max(int(out_img.width), int(out_img.height))
                if max_side > 6144:
                    scale = 6144.0 / float(max_side)
                    new_size = (
                        max(1, int(out_img.width * scale)),
                        max(1, int(out_img.height * scale)),
                    )
                    out_img = out_img.resize(new_size, Image.Resampling.BILINEAR)

                out_img.save(cache_path, format="WEBP", quality=84, method=2)
                return FileResponse(cache_path, media_type="image/webp")
        except Exception:
            raise HTTPException(status_code=415, detail="DDS preview is not supported for this file")

    @app.get("/api/tasks/{task_id}/files/{rel_path:path}")
    def task_file(task_id: str, rel_path: str):
        return FileResponse(_resolve_task_output_file(task_id, rel_path))

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
        try:
            logger.info(
                "MapMerge request: files=%s format=%s preset=%s",
                len(files),
                job_opts.suffix,
                job_opts.preset,
            )
        except Exception:
            pass

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
