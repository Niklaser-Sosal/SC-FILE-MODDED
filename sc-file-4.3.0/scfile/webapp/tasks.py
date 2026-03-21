from __future__ import annotations

import threading
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional


@dataclass
class Task:
    id: str
    kind: str  # "convert" | "mapmerge"
    status: str = "pending"  # pending|running|done|error
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    finished_at: Optional[float] = None

    total: int = 0
    done: int = 0
    errors: int = 0

    message: str = ""
    outputs: list[str] = field(default_factory=list)  # paths relative to task output root
    zip_path: Optional[str] = None  # absolute path

    logs: list[str] = field(default_factory=list)

    meta: dict[str, Any] = field(default_factory=dict)


class TaskManager:
    def __init__(self, app_dir: Path, logger):
        self.app_dir = app_dir
        self.logger = logger

        self.work_dir = app_dir / "work"
        self.tasks_dir = self.work_dir / "tasks"
        self.tasks_dir.mkdir(parents=True, exist_ok=True)

        self._lock = threading.Lock()
        self._tasks: dict[str, Task] = {}

    def new_task(self, kind: str) -> Task:
        task_id = uuid.uuid4().hex
        task = Task(id=task_id, kind=kind)
        with self._lock:
            self._tasks[task_id] = task
        return task

    def get(self, task_id: str) -> Optional[Task]:
        with self._lock:
            return self._tasks.get(task_id)

    def task_dir(self, task_id: str) -> Path:
        return self.tasks_dir / task_id

    def task_input_dir(self, task_id: str) -> Path:
        return self.task_dir(task_id) / "input"

    def task_output_dir(self, task_id: str) -> Path:
        return self.task_dir(task_id) / "output"

    def task_tmp_dir(self, task_id: str) -> Path:
        return self.task_dir(task_id) / "tmp"

    def ensure_dirs(self, task_id: str) -> None:
        for p in (self.task_input_dir(task_id), self.task_output_dir(task_id), self.task_tmp_dir(task_id)):
            p.mkdir(parents=True, exist_ok=True)

    def log(self, task_id: str, msg: str) -> None:
        task = self.get(task_id)
        if not task:
            return

        line = f"{time.strftime('%H:%M:%S')}  {msg}"
        with self._lock:
            task.logs.append(line)
            # clamp in-memory logs
            if len(task.logs) > 400:
                task.logs = task.logs[-400:]

        try:
            self.logger.info("[%s] %s", task_id, msg)
        except Exception:
            pass

    def update(self, task_id: str, **kwargs: Any) -> None:
        task = self.get(task_id)
        if not task:
            return
        with self._lock:
            for k, v in kwargs.items():
                setattr(task, k, v)

    def as_dict(self, task_id: str) -> dict[str, Any]:
        task = self.get(task_id)
        if not task:
            return {}

        with self._lock:
            return {
                "id": task.id,
                "kind": task.kind,
                "status": task.status,
                "created_at": task.created_at,
                "started_at": task.started_at,
                "finished_at": task.finished_at,
                "total": task.total,
                "done": task.done,
                "errors": task.errors,
                "message": task.message,
                "outputs": list(task.outputs),
                "zip_available": bool(task.zip_path),
                "logs": list(task.logs),
                "meta": dict(task.meta),
            }

