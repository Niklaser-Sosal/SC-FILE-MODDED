from __future__ import annotations

import os
from pathlib import Path, PurePosixPath


def sanitize_relpath(value: str) -> Path:
    """
    Convert an arbitrary upload filename into a safe *relative* path.

    - Normalizes path separators.
    - Drops drive letters / UNC prefixes.
    - Removes empty / '.' / '..' parts.
    """

    # Browser uploads may include paths (e.g. webkitRelativePath) or backslashes.
    value = (value or "").replace("\\", "/").strip()
    p = PurePosixPath(value)

    safe_parts: list[str] = []
    for part in p.parts:
        if part in ("", ".", ".."):
            continue
        # Drop Windows drive letter parts like "C:" and any colon-containing segment.
        if ":" in part:
            continue
        safe_parts.append(part)

    if not safe_parts:
        return Path("file")

    return Path(*safe_parts)


def resolve_in(root: Path, rel: str | Path) -> Path:
    """Resolve `rel` under `root` and prevent path traversal."""

    rel_path = sanitize_relpath(str(rel)) if not isinstance(rel, Path) else rel
    candidate = (root / rel_path).resolve()
    root_resolved = root.resolve()

    if candidate == root_resolved or candidate.is_relative_to(root_resolved):
        return candidate

    raise ValueError("Path escapes root")


def get_downloads_dir() -> Path:
    """Best-effort path to the user's Downloads directory."""

    if os.name == "nt":
        base = os.getenv("USERPROFILE") or str(Path.home())
        return Path(base) / "Downloads"

    # Linux/macOS fallback
    return Path.home() / "Downloads"
