from __future__ import annotations

import json
import shutil
import threading
import time
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Optional

import lz4.block

from scfile.consts import NBT_FILENAMES
from scfile.convert.base import ensure_unique_path
from scfile.core import UserOptions
from scfile.enums import FileFormat
from scfile import exceptions

from .util import get_downloads_dir

from scfile.formats.dae import DaeEncoder
from scfile.formats.dds import DdsEncoder
from scfile.formats.glb import GlbEncoder
from scfile.formats.hdri import OlCubemapDecoder
from scfile.formats.json import JsonEncoder
from scfile.formats.mcsa import McsaDecoder
from scfile.formats.mcsb import McsbDecoder
from scfile.formats.mic import MicDecoder
from scfile.formats.ms3d import Ms3dEncoder
from scfile.formats.nbt import NbtDecoder
from scfile.formats.obj import ObjEncoder
from scfile.formats.ol import OlDecoder
from scfile.formats.png import PngEncoder
from scfile.formats.texarr import TextureArrayDecoder
from scfile.formats.zip import TextureArrayEncoder


MODEL_ENCODERS: dict[FileFormat, type] = {
    FileFormat.OBJ: ObjEncoder,
    FileFormat.GLB: GlbEncoder,
    FileFormat.DAE: DaeEncoder,
    FileFormat.MS3D: Ms3dEncoder,
}


@dataclass
class ConvertJobOptions:
    output_mode: str  # "zip" | "folder"
    output_dir: str = ""
    zip_dir: str = ""
    preserve_structure: bool = True
    unique_names: bool = True

    model_formats: list[str] = None  # e.g. ["glb","obj"]
    parse_skeleton: bool = True
    parse_animation: bool = False

    @classmethod
    def from_json(cls, value: str) -> "ConvertJobOptions":
        raw = json.loads(value) if value else {}
        if not isinstance(raw, dict):
            raw = {}

        return cls(
            output_mode=str(raw.get("output_mode", "zip")).lower(),
            output_dir=str(raw.get("output_dir", "")),
            zip_dir=str(raw.get("zip_dir", "")),
            preserve_structure=bool(raw.get("preserve_structure", True)),
            unique_names=bool(raw.get("unique_names", True)),
            model_formats=[str(x).lower() for x in (raw.get("model_formats") or [])],
            parse_skeleton=bool(raw.get("parse_skeleton", True)),
            parse_animation=bool(raw.get("parse_animation", False)),
        )


def _parse_model_formats(values: Iterable[str]) -> Optional[list[FileFormat]]:
    out: list[FileFormat] = []
    for v in values:
        v = str(v).strip().lower()
        if not v:
            continue
        try:
            out.append(FileFormat[v.upper()])
        except KeyError:
            continue
    out = [f for f in out if f in MODEL_ENCODERS]
    return out or None


def _convert_one(decoder_cls, encoder_cls, source: Path, out_dir: Path, options: UserOptions) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)

    with decoder_cls(file=source, options=options) as src:
        with src.convert_to(encoder=encoder_cls) as enc:
            output = out_dir / f"{source.stem}{enc.suffix}"
            if not options.overwrite:
                output = ensure_unique_path(path=output, suffix=enc.suffix)
            enc.save(path=output)
            return output


def convert_auto_return_paths(source: Path, out_dir: Path, options: UserOptions) -> list[Path]:
    src_path = Path(source)
    src_suffix = src_path.suffix.lstrip(".").lower()

    model_formats = options.model_formats or options.default_model_formats

    match src_suffix:
        case FileFormat.MCSB.value:
            return [
                _convert_one(McsbDecoder, MODEL_ENCODERS[fmt], src_path, out_dir, options)
                for fmt in model_formats
            ]

        case FileFormat.MCSA.value | FileFormat.MCVD.value:
            return [
                _convert_one(McsaDecoder, MODEL_ENCODERS[fmt], src_path, out_dir, options)
                for fmt in model_formats
            ]

        case FileFormat.OL.value:
            try:
                return [_convert_one(OlDecoder, DdsEncoder, src_path, out_dir, options)]
            except lz4.block.LZ4BlockError:
                return [_convert_one(OlCubemapDecoder, DdsEncoder, src_path, out_dir, options)]

        case FileFormat.MIC.value:
            return [_convert_one(MicDecoder, PngEncoder, src_path, out_dir, options)]

        case FileFormat.TEXARR.value:
            return [_convert_one(TextureArrayDecoder, TextureArrayEncoder, src_path, out_dir, options)]

        case FileFormat.NBT.value:
            return [_convert_one(NbtDecoder, JsonEncoder, src_path, out_dir, options)]

        case _:
            if src_path.name in NBT_FILENAMES:
                return [_convert_one(NbtDecoder, JsonEncoder, src_path, out_dir, options)]
            raise exceptions.UnsupportedFormatError(src_path)


def _copy_tree_files(src_root: Path, dst_root: Path, rel_files: list[str]) -> None:
    dst_root.mkdir(parents=True, exist_ok=True)
    for rel in rel_files:
        src = (src_root / rel).resolve()
        dst = (dst_root / rel).resolve()
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)


def _zip_tree(zip_path: Path, src_root: Path, rel_files: list[str]) -> None:
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for rel in rel_files:
            zf.write((src_root / rel), arcname=rel)


def run_convert_task(
    task_manager,
    task_id: str,
    input_rel_paths: list[Path],
    options: ConvertJobOptions,
    cancel_event: threading.Event | None = None,
) -> None:
    cancel_event = cancel_event or threading.Event()
    task_manager.update(task_id, status="running", started_at=time.time())
    task_manager.log(task_id, f"Conversion started. Files: {len(input_rel_paths)}")

    out_root = task_manager.task_output_dir(task_id)
    in_root = task_manager.task_input_dir(task_id)

    model_formats = _parse_model_formats(options.model_formats)
    user_options = UserOptions(
        model_formats=model_formats,
        parse_skeleton=options.parse_skeleton,
        parse_animation=options.parse_animation,
        overwrite=not options.unique_names,
    )

    rel_outputs: list[str] = []
    errors = 0

    task_manager.update(task_id, total=len(input_rel_paths), done=0, errors=0)

    for idx, rel_in in enumerate(input_rel_paths, start=1):
        if cancel_event.is_set():
            task_manager.update(task_id, status="error", message="Cancelled.")
            return

        src = (in_root / rel_in).resolve()
        dst_dir = out_root / rel_in.parent if options.preserve_structure else out_root

        try:
            outputs = convert_auto_return_paths(src, dst_dir, user_options)
            for out_file in outputs:
                rel_outputs.append(out_file.relative_to(out_root).as_posix())
            task_manager.log(task_id, f"[{idx}/{len(input_rel_paths)}] OK  {rel_in.as_posix()}")

        except exceptions.ScFileException as err:
            errors += 1
            task_manager.log(task_id, f"[{idx}/{len(input_rel_paths)}] ERR {rel_in.as_posix()}  ({err})")

        except Exception as err:
            errors += 1
            task_manager.log(task_id, f"[{idx}/{len(input_rel_paths)}] EXC {rel_in.as_posix()}  ({err})")

        task_manager.update(task_id, done=idx, errors=errors, outputs=rel_outputs)

    # Output handling
    if options.output_mode == "folder" and options.output_dir:
        try:
            out_dir = Path(options.output_dir).expanduser()
            _copy_tree_files(out_root, out_dir, rel_outputs)
            task_manager.log(task_id, f"Copied results to folder: {out_dir}")
            task_manager.update(task_id, meta={"output_dir": str(out_dir)})
        except Exception as err:
            errors += 1
            task_manager.log(task_id, f"Failed to copy results to folder: {err}")

    if options.output_mode == "zip":
        try:
            zip_path = task_manager.task_dir(task_id) / "result.zip"
            _zip_tree(zip_path, out_root, rel_outputs)

            dest_dir = Path(options.zip_dir).expanduser() if options.zip_dir else get_downloads_dir()
            try:
                dest_dir.mkdir(parents=True, exist_ok=True)
            except Exception:
                dest_dir = task_manager.task_dir(task_id)

            dest_zip = ensure_unique_path(dest_dir / f"sc-file-{task_id}.zip", suffix=".zip")
            try:
                shutil.copy2(zip_path, dest_zip)
                task_manager.update(task_id, zip_path=str(dest_zip), meta={"zip_path": str(dest_zip)})
                task_manager.log(task_id, f"ZIP ready: {dest_zip.name}")
            except Exception:
                task_manager.update(task_id, zip_path=str(zip_path), meta={"zip_path": str(zip_path)})
                task_manager.log(task_id, f"ZIP ready: {zip_path.name}")

        except Exception as err:
            errors += 1
            task_manager.log(task_id, f"Failed to create ZIP: {err}")

    final_status = "done" if errors == 0 else "error"
    task_manager.update(task_id, status=final_status, finished_at=time.time(), errors=errors, outputs=rel_outputs)
    task_manager.log(task_id, f"Finished. Outputs: {len(rel_outputs)} Errors: {errors}")
