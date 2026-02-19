# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_data_files
from PyInstaller.utils.hooks import collect_submodules

datas = [('webapp\\static', 'webapp\\static')]
hiddenimports = ['zstandard', 'rich._unicode_data.unicode17-0-0', 'rich._unicode_data']
datas += collect_data_files('rich')
datas += collect_data_files('scmapmerge')
hiddenimports += collect_submodules('webview')
hiddenimports += collect_submodules('scmapmerge')


a = Analysis(
    ['scfile_webapp_entry.py'],
    pathex=['sc-file-4.2.1', 'sc-mapmerge-2.1.1'],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='SC-FILE_MODDED',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['webapp\\static\\app_icon.ico'],
)
