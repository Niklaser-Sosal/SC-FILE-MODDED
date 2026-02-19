from __future__ import annotations

import json
import sys
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from scfile.core import UserOptions

from .conversion import convert_auto_return_paths


def _ensure_scmapmerge_importable() -> None:
    try:
        import scmapmerge  # noqa: F401
        return
    except Exception:
        pass

    # Running from this monorepo: add sibling `sc-mapmerge-*/` to sys.path.
    root = Path(__file__).resolve().parents[3]
    candidates = sorted(root.glob("sc-mapmerge-*"), reverse=True)
    for c in candidates:
        if (c / "scmapmerge").exists():
            sys.path.insert(0, str(c))
            return


def _import_scmapmerge():
    _ensure_scmapmerge_importable()
    import scmapmerge  # type: ignore

    return scmapmerge


@dataclass
class MapMergeJobOptions:
    suffix: str = "jpg"
    filename: str = "Map %Y.%m.%d"
    preset: str = ""
    limit: int = 1_000_000_000
    compress: int = 6
    quality: int = 90
    debug: bool = False
    overwrite: bool = False
    skip_empty: bool = True

    @classmethod
    def from_json(cls, value: str) -> "MapMergeJobOptions":
        raw = json.loads(value) if value else {}
        if not isinstance(raw, dict):
            raw = {}

        return cls(
            suffix=str(raw.get("suffix", "jpg")).lower().lstrip("."),
            filename=str(raw.get("filename", "Map %Y.%m.%d")),
            preset=str(raw.get("preset", "")),
            limit=int(raw.get("limit", 1_000_000_000) or 0),
            compress=int(raw.get("compress", 6) or 0),
            quality=int(raw.get("quality", 90) or 0),
            debug=bool(raw.get("debug", False)),
            overwrite=bool(raw.get("overwrite", False)),
            skip_empty=bool(raw.get("skip_empty", True)),
        )


def list_presets() -> list[str]:
    try:
        _import_scmapmerge()
        from scmapmerge.utils.presets import PRESETS  # type: ignore

        return [p.name for p in PRESETS]
    except Exception:
        return []


def _find_preset(name: str):
    if not name:
        return None
    from scmapmerge.utils.presets import PRESETS  # type: ignore

    for p in PRESETS:
        if p.name == name:
            return p
    return None


def run_mapmerge_task(
    task_manager,
    task_id: str,
    input_rel_paths: list[Path],
    options: MapMergeJobOptions,
    cancel_event: threading.Event | None = None,
) -> None:
    cancel_event = cancel_event or threading.Event()

    task_manager.update(task_id, status="running", started_at=time.time())
    task_manager.log(task_id, f"MapMerge started. Files: {len(input_rel_paths)}")

    try:
        _import_scmapmerge()
        from scmapmerge.consts import OutputFile  # type: ignore
        from scmapmerge.datatype import Preset  # noqa: F401  # type: ignore
        from scmapmerge.image.output import OutputImage  # type: ignore
        from scmapmerge.region.listing.converted import ConvertedRegions  # type: ignore
        from scmapmerge.region.listing.encrypted import EncryptedRegions  # type: ignore
        from scmapmerge.utils.filename import FileName  # type: ignore
    except Exception as err:
        task_manager.log(task_id, f"scmapmerge is not available: {err}")
        task_manager.update(task_id, status="error", finished_at=time.time(), message="scmapmerge not available")
        return

    in_root = task_manager.task_input_dir(task_id)
    tmp_root = task_manager.task_tmp_dir(task_id) / "converted"
    out_root = task_manager.task_output_dir(task_id)
    tmp_root.mkdir(parents=True, exist_ok=True)
    out_root.mkdir(parents=True, exist_ok=True)

    encrypted_paths = [(in_root / rel).resolve() for rel in input_rel_paths]
    regions = EncryptedRegions.from_paths(encrypted_paths)

    preset = _find_preset(options.preset)
    if preset:
        regions.preset = preset
        if not regions.contains_preset:
            missing = getattr(regions, "missing_preset", [])
            task_manager.log(task_id, f"Missing regions for preset '{preset.name}': {missing}")
            task_manager.update(task_id, status="error", finished_at=time.time(), message="Missing preset regions")
            return
        regions.filter_preset()

    if options.skip_empty and getattr(regions, "contains_empty", False):
        regions.filter_empty()
        task_manager.log(task_id, "Empty regions filtered.")

    if getattr(regions, "possible_overlay", False) and options.suffix in OutputFile.NONTRANSPARENT_FORMATS:
        task_manager.log(task_id, "Warning: output may need alpha, but selected suffix does not support transparency.")

    total = len(regions) * 2 if len(regions) > 0 else 1
    task_manager.update(task_id, total=total, done=0, errors=0)

    converted_paths: list[Path] = []
    user_options = UserOptions()

    # Convert encrypted -> converted
    done = 0
    errors = 0
    for region in regions:
        if cancel_event.is_set():
            task_manager.update(task_id, status="error", message="Cancelled.")
            return

        try:
            outs = convert_auto_return_paths(Path(region.path), tmp_root, user_options)
            converted_paths.extend(outs)
            task_manager.log(task_id, f"OK  {Path(region.path).name}")
        except Exception as err:
            errors += 1
            task_manager.log(task_id, f"ERR {Path(region.path).name}  ({err})")

        done += 1
        task_manager.update(task_id, done=done, errors=errors)

    if not converted_paths:
        task_manager.update(task_id, status="error", finished_at=time.time(), errors=errors, message="No converted files")
        return

    # Merge converted -> full map
    conv_regions = ConvertedRegions.from_paths(converted_paths)
    conv_regions.find_scale()

    output = OutputImage(
        suffix=options.suffix,
        limit=options.limit,
        compress=options.compress,
        quality=options.quality,
        debug=options.debug,
    )
    output.regions = conv_regions
    output.create()

    for region in conv_regions:
        if cancel_event.is_set():
            task_manager.update(task_id, status="error", message="Cancelled.")
            return
        output.paste(region)
        done += 1
        task_manager.update(task_id, done=done, errors=errors)

    if preset and getattr(preset, "crop", None):
        output.crop(preset.crop)

    out_path = FileName(out_root, options.filename, options.suffix, options.overwrite).as_path()
    output.save(out_path)

    rel_out = out_path.relative_to(out_root).as_posix()
    task_manager.update(
        task_id,
        outputs=[rel_out],
        meta={"output_dir": str(out_root)},
        status="done" if errors == 0 else "error",
        finished_at=time.time(),
        errors=errors,
        message=f"Saved {rel_out}",
    )
    task_manager.log(task_id, f"Saved: {rel_out}")
