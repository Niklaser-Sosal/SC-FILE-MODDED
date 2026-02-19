@echo off
if defined SCFILE_DEBUG @echo on
setlocal EnableExtensions EnableDelayedExpansion

rem SC-FILE:MODDED Web UI launcher (Windows)
rem - uses existing venv if present
rem - creates/repairs venv if missing/broken
rem - installs deps only when requirements change
rem - starts web UI (pywebview window, fallback to browser)

set "APP_NAME=SC-FILE:MODDED"

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%.") do set "SCRIPT_DIR=%%~fI"
set "SCFILE_LOGS_DIR=%SCRIPT_DIR%\logs"

call :detect_layout "%SCRIPT_DIR%"
if defined SCFILE_DEBUG echo [DEBUG] SCFILE_DIR="%SCFILE_DIR%"
if not defined SCFILE_DIR goto :err_scfile

set "VENV_DIR=%SCFILE_DIR%\.venv"
set "PY=%VENV_DIR%\Scripts\python.exe"

if not defined SCFILE_WEB_STATIC_DIR goto :err_static

rem Restore missing bundled assets inside the sc-file package (if user deleted them).
set "PKG_STATIC=%SCFILE_DIR%\scfile\webapp\static"
if not exist "%PKG_STATIC%" mkdir "%PKG_STATIC%" >nul 2>nul
if /i not "%SCFILE_WEB_STATIC_DIR%"=="%PKG_STATIC%" (
  if not exist "%PKG_STATIC%\index.html" (
    if exist "%SCFILE_WEB_STATIC_DIR%\index.html" (
      echo [INFO] Restoring missing web assets into: "%PKG_STATIC%"
      xcopy /E /I /Y "%SCFILE_WEB_STATIC_DIR%\*" "%PKG_STATIC%\\" >nul
    )
  )
)

set "REQ1=%SCFILE_DIR%\requirements.txt"
set "REQ2=%SCFILE_DIR%\requirements-web.txt"
set "REQ_MARKER=%VENV_DIR%\scfile-web.requirements.sha256"

if not exist "%REQ1%" goto :err_req1
if not exist "%REQ2%" goto :err_req2

rem If venv exists - do not require system python in PATH.
if exist "%PY%" if exist "%VENV_DIR%\pyvenv.cfg" goto :venv_ok

echo [INFO] Creating/repairing venv: "%VENV_DIR%"
call :find_system_python
if not defined SYS_PY goto :err_nopy

call %SYS_PY% -m venv "%VENV_DIR%"
if errorlevel 1 goto :err_venv_create

:venv_ok
if not exist "%PY%" goto :err_venv_py

"%PY%" -c "import sys; raise SystemExit(0 if sys.version_info >= (3,11) else 1)" >nul 2>nul
if errorlevel 1 goto :err_venv_version

"%PY%" -m pip --version >nul 2>nul
if not errorlevel 1 goto :pip_ok
echo [INFO] pip not found. Bootstrapping (ensurepip)...
"%PY%" -m ensurepip --upgrade
if errorlevel 1 goto :err_pip_bootstrap
:pip_ok

set "REQ_HASH="
set "REQ_HASH_FILE=%VENV_DIR%\scfile-web.reqhash.txt"
"%PY%" -c "import hashlib, pathlib, sys; h=hashlib.sha256(); [h.update(pathlib.Path(p).read_bytes()) for p in sys.argv[1:]]; print(h.hexdigest())" "%REQ1%" "%REQ2%" 1>"%REQ_HASH_FILE%" 2>nul
if exist "%REQ_HASH_FILE%" set /p REQ_HASH=<"%REQ_HASH_FILE%"
if exist "%REQ_HASH_FILE%" del "%REQ_HASH_FILE%" >nul 2>nul

if not defined REQ_HASH goto :install_deps
if not exist "%REQ_MARKER%" goto :marker_missing
set "OLD_HASH="
set /p OLD_HASH=<"%REQ_MARKER%"
if /i not "!OLD_HASH!"=="!REQ_HASH!" goto :install_deps
echo [INFO] Dependencies OK (requirements unchanged). Verifying imports...
call :verify_imports
if errorlevel 1 goto :install_deps
goto :run

:marker_missing
echo [INFO] Requirements marker missing. Verifying imports...
call :verify_imports
if errorlevel 1 goto :install_deps
echo [INFO] Dependencies OK. Recreating marker.
echo !REQ_HASH!>"%REQ_MARKER%"
goto :run

:install_deps
echo [INFO] Installing/updating dependencies...
echo [INFO] Upgrading pip...
"%PY%" -m pip install --upgrade pip setuptools wheel
if errorlevel 1 goto :err_pip_upgrade

echo [INFO] pip install -r requirements...
"%PY%" -m pip install -r "%REQ1%" -r "%REQ2%"
if errorlevel 1 goto :err_pip_install

call :verify_imports
if errorlevel 1 goto :err_imports

if defined REQ_HASH echo !REQ_HASH!>"%REQ_MARKER%"

:run
echo [INFO] Starting %APP_NAME% Web UI...
pushd "%SCFILE_DIR%"
"%PY%" -m scfile.webapp %*
set "RC=%ERRORLEVEL%"
popd

if not "%RC%"=="0" goto :err_run
endlocal & exit /b 0

:err_scfile
echo [ERROR] Could not find "sc-file-*" folder near: "%SCRIPT_DIR%"
echo         Put this .bat next to sc-file-* (or inside a subfolder of that folder).
pause
endlocal
exit /b 1

:err_static
echo [ERROR] Could not find web assets (webapp\\static\\index.html).
echo         Make sure the "webapp\\static" folder exists near this .bat.
pause
endlocal
exit /b 1

:err_req1
echo [ERROR] Missing file: "%REQ1%"
pause
endlocal
exit /b 1

:err_req2
echo [ERROR] Missing file: "%REQ2%"
pause
endlocal
exit /b 1

:err_nopy
echo [ERROR] Python 3.11+ not found.
echo         Install Python 3.11+ and re-run.
pause
endlocal
exit /b 1

:err_venv_create
echo [ERROR] Failed to create venv.
pause
endlocal
exit /b 1

:err_venv_py
echo [ERROR] venv python not found: "%PY%"
echo         Delete "%VENV_DIR%" and run again.
pause
endlocal
exit /b 1

:err_venv_version
echo [ERROR] venv Python is too old or broken (need 3.11+).
echo         Delete "%VENV_DIR%" and run this launcher again.
pause
endlocal
exit /b 1

:err_pip_bootstrap
echo [ERROR] Failed to install pip (ensurepip).
pause
endlocal
exit /b 1

:err_pip_upgrade
echo [ERROR] pip upgrade failed.
pause
endlocal
exit /b 1

:err_pip_install
echo [ERROR] Dependency install failed.
pause
endlocal
exit /b 1

:err_imports
echo [ERROR] Imports still failing after install.
pause
endlocal
exit /b 1

:err_run
echo [ERROR] scfile.webapp exited with code %RC%.
pause
endlocal & exit /b %RC%

:find_system_python
set "SYS_PY="

python -c "import sys; raise SystemExit(0 if sys.version_info >= (3,11) else 1)" >nul 2>nul
if not errorlevel 1 (
  set "SYS_PY=python"
  goto :eof
)

python3 -c "import sys; raise SystemExit(0 if sys.version_info >= (3,11) else 1)" >nul 2>nul
if not errorlevel 1 (
  set "SYS_PY=python3"
  goto :eof
)

py -3 -c "import sys; raise SystemExit(0 if sys.version_info >= (3,11) else 1)" >nul 2>nul
if not errorlevel 1 (
  set "SYS_PY=py -3"
  goto :eof
)

py -3.11 -c "import sys; raise SystemExit(0 if sys.version_info >= (3,11) else 1)" >nul 2>nul
if not errorlevel 1 (
  set "SYS_PY=py -3.11"
  goto :eof
)

goto :eof

:verify_imports
set "CHK_ERR=0"
pushd "%SCFILE_DIR%" >nul 2>nul
"%PY%" -c "import fastapi, uvicorn, multipart, webview; import PIL; import PyInstaller; import scfile.webapp; import scfile.webapp.mapmerge as mm; mm._import_scmapmerge()" >nul 2>nul
if errorlevel 1 set "CHK_ERR=1"
popd >nul 2>nul
exit /b %CHK_ERR%

:detect_layout
set "ROOT="
set "SCFILE_DIR="
set "SCMAPMERGE_DIR="
set "SCFILE_WEB_STATIC_DIR="
set "SCFILE_WEB_APP_ICON="

for %%I in ("%~1") do set "CUR=%%~fI"

:detect_layout_loop
call :pick_scfile "%CUR%"
if defined SCFILE_DIR (
  set "ROOT=%CUR%"
  call :pick_scmapmerge "%CUR%"
  call :pick_static "%CUR%" "%~1"
  call :pick_icon
)
if defined SCFILE_DIR goto :eof

for %%I in ("%CUR%\\..") do set "PARENT=%%~fI"
if /i "%PARENT%"=="%CUR%" goto :eof
set "CUR=%PARENT%"
goto :detect_layout_loop

:pick_scfile
set "SCFILE_DIR="
if exist "%~1\\sc-file\\pyproject.toml" set "SCFILE_DIR=%~1\\sc-file"
for /f "delims=" %%D in ('dir /b /ad /o:-d "%~1\\sc-file-*" 2^>nul') do (
  if not defined SCFILE_DIR if exist "%~1\\%%D\\pyproject.toml" set "SCFILE_DIR=%~1\\%%D"
)
goto :eof

:pick_scmapmerge
set "SCMAPMERGE_DIR="
if exist "%~1\\sc-mapmerge\\scmapmerge\\__init__.py" set "SCMAPMERGE_DIR=%~1\\sc-mapmerge"
for /f "delims=" %%D in ('dir /b /ad /o:-d "%~1\\sc-mapmerge-*" 2^>nul') do (
  if not defined SCMAPMERGE_DIR if exist "%~1\\%%D\\scmapmerge\\__init__.py" set "SCMAPMERGE_DIR=%~1\\%%D"
)
goto :eof

:pick_static
set "SCFILE_WEB_STATIC_DIR="
if exist "%~1\\webapp\\static\\index.html" set "SCFILE_WEB_STATIC_DIR=%~1\\webapp\\static"
if not defined SCFILE_WEB_STATIC_DIR if not "%~2"=="" if exist "%~2\\webapp\\static\\index.html" set "SCFILE_WEB_STATIC_DIR=%~2\\webapp\\static"
if not defined SCFILE_WEB_STATIC_DIR if defined SCFILE_DIR if exist "%SCFILE_DIR%\\webapp\\static\\index.html" set "SCFILE_WEB_STATIC_DIR=%SCFILE_DIR%\\webapp\\static"
goto :eof

:pick_icon
set "SCFILE_WEB_APP_ICON="
if defined SCFILE_WEB_STATIC_DIR (
  if exist "%SCFILE_WEB_STATIC_DIR%\\app_icon.ico" set "SCFILE_WEB_APP_ICON=%SCFILE_WEB_STATIC_DIR%\\app_icon.ico"
  if not defined SCFILE_WEB_APP_ICON if exist "%SCFILE_WEB_STATIC_DIR%\\app_icon.png" set "SCFILE_WEB_APP_ICON=%SCFILE_WEB_STATIC_DIR%\\app_icon.png"
)
goto :eof
