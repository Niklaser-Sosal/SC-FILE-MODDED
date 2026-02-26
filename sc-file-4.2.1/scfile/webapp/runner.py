from __future__ import annotations

import os
import socket
import threading
import time
import webbrowser
from pathlib import Path
from urllib.parse import quote


def _pick_free_port(host: str) -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind((host, 0))
        return int(s.getsockname()[1])


def _wait_http(url: str, timeout_s: float = 10.0) -> None:
    import urllib.request

    start = time.time()
    while time.time() - start < timeout_s:
        try:
            with urllib.request.urlopen(url, timeout=1) as r:
                if r.status == 200:
                    return
        except Exception:
            time.sleep(0.1)


def _find_app_icon() -> str | None:
    env = os.getenv("SCFILE_WEB_APP_ICON") or os.getenv("SCFILE_WEB_ICON")
    if env:
        p = Path(env)
        if p.exists():
            return str(p)

    static_dir = os.getenv("SCFILE_WEB_STATIC_DIR")
    if static_dir:
        for name in ("app_icon.ico", "app_icon.png"):
            p = Path(static_dir) / name
            if p.exists():
                return str(p)

    for base in (Path.cwd() / "webapp" / "static", Path(__file__).resolve().parents[3] / "webapp" / "static", Path(__file__).parent / "static"):
        for name in ("app_icon.ico", "app_icon.png"):
            p = base / name
            if p.exists():
                return str(p)
    return None


class JsApi:
    def __init__(self, base_url: str = "") -> None:
        self._window = None
        self._base_url = str(base_url or "").rstrip("/")
        self._map_windows = []

    def set_window(self, window) -> None:
        self._window = window

    def pick_directory(self, initial_dir: str = "") -> str:
        try:
            import webview  # type: ignore
        except Exception:
            return ""

        win = self._window or (webview.windows[0] if getattr(webview, "windows", None) else None)
        if not win:
            return ""

        directory = str(initial_dir or "")
        try:
            res = win.create_file_dialog(webview.FOLDER_DIALOG, directory=directory, allow_multiple=False)
        except Exception:
            res = None

        if not res:
            return ""
        return str(res[0])

    def open_map_view(self, task_id: str, rel_path: str, lang: str = "ru") -> bool:
        if not isinstance(task_id, str) or not task_id.strip():
            return False
        if not isinstance(rel_path, str) or not rel_path.strip():
            return False

        language = "en" if str(lang).lower().strip() == "en" else "ru"

        try:
            import webview  # type: ignore
        except Exception:
            return False

        base = self._base_url
        if not base:
            win = self._window or (webview.windows[0] if getattr(webview, "windows", None) else None)
            if not win:
                return False
            try:
                base = str(getattr(win, "real_url", "") or getattr(win, "url", "")).rstrip("/")
            except Exception:
                return False
            if "/static/" in base:
                base = base.split("/static/")[0]

        url = (
            f"{base}/static/map_view.html"
            f"?task={quote(task_id, safe='')}"
            f"&rel={quote(rel_path, safe='/')}"
            f"&lang={quote(language, safe='')}"
        )

        try:
            child = webview.create_window(
                "SC-FILE:MODDED • Map View",
                url,
                width=1360,
                height=900,
                min_size=(1024, 680),
                resizable=True,
                background_color="#0B0B0B",
            )
            self._map_windows.append(child)
            return True
        except Exception:
            return False

    def open_model_view(self, task_id: str, rel_path: str, lang: str = "ru") -> bool:
        if not isinstance(task_id, str) or not task_id.strip():
            return False
        if not isinstance(rel_path, str) or not rel_path.strip():
            return False

        language = "en" if str(lang).lower().strip() == "en" else "ru"

        try:
            import webview  # type: ignore
        except Exception:
            return False

        base = self._base_url
        if not base:
            win = self._window or (webview.windows[0] if getattr(webview, "windows", None) else None)
            if not win:
                return False
            try:
                base = str(getattr(win, "real_url", "") or getattr(win, "url", "")).rstrip("/")
            except Exception:
                return False
            if "/static/" in base:
                base = base.split("/static/")[0]

        url = (
            f"{base}/static/model_view.html"
            f"?task={quote(task_id, safe='')}"
            f"&rel={quote(rel_path, safe='/')}"
            f"&lang={quote(language, safe='')}"
        )

        try:
            child = webview.create_window(
                "SC-FILE:MODDED • Model View",
                url,
                width=1360,
                height=900,
                min_size=(1024, 680),
                resizable=True,
                background_color="#0B0B0B",
            )
            self._map_windows.append(child)
            return True
        except Exception:
            return False

    def open_texture_view(self, task_id: str, rel_path: str, lang: str = "ru") -> bool:
        if not isinstance(task_id, str) or not task_id.strip():
            return False
        if not isinstance(rel_path, str) or not rel_path.strip():
            return False

        language = "en" if str(lang).lower().strip() == "en" else "ru"

        try:
            import webview  # type: ignore
        except Exception:
            return False

        base = self._base_url
        if not base:
            win = self._window or (webview.windows[0] if getattr(webview, "windows", None) else None)
            if not win:
                return False
            try:
                base = str(getattr(win, "real_url", "") or getattr(win, "url", "")).rstrip("/")
            except Exception:
                return False
            if "/static/" in base:
                base = base.split("/static/")[0]

        url = (
            f"{base}/static/texture_view.html"
            f"?task={quote(task_id, safe='')}"
            f"&rel={quote(rel_path, safe='/')}"
            f"&lang={quote(language, safe='')}"
        )

        try:
            child = webview.create_window(
                "SC-FILE:MODDED - Texture View",
                url,
                width=1360,
                height=900,
                min_size=(1024, 680),
                resizable=True,
                background_color="#0B0B0B",
            )
            self._map_windows.append(child)
            return True
        except Exception:
            return False


def run(host: str = "127.0.0.1", port: int = 0, window: bool = True) -> None:
    import uvicorn

    from .server import build_app

    if port == 0:
        port = _pick_free_port(host)

    app = build_app()

    config = uvicorn.Config(
        app,
        host=host,
        port=port,
        log_level="warning",
        access_log=False,
        log_config=None,
    )
    server = uvicorn.Server(config)

    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    start_path = str(os.getenv("SCFILE_WEB_START_PATH") or "/").strip()
    if start_path and not start_path.startswith("/"):
        start_path = "/" + start_path
    url = f"http://{host}:{port}{start_path}"
    _wait_http(f"http://{host}:{port}/api/health")

    if window:
        icon = _find_app_icon()
        try:
            import webview  # type: ignore

            api = JsApi(base_url=f"http://{host}:{port}")
            win = webview.create_window(
                "SC-FILE:MODDED",
                url,
                width=1200,
                height=820,
                min_size=(980, 640),
                resizable=True,
                background_color="#0B0B0B",
                js_api=api,
            )
            api.set_window(win)
            webview.start(icon=icon)
        except Exception:
            webbrowser.open(url)
            thread.join()
    else:
        webbrowser.open(url)
        thread.join()

    server.should_exit = True
    thread.join(timeout=3)
