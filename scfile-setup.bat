@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem SC-FILE:MODDED setup helper (Windows)
rem - creates/repairs venv
rem - installs ALL required deps (including PyInstaller)
rem - optionally starts the web UI afterwards

set "USE_COLOR="

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%.") do set "SCRIPT_DIR=%%~fI"

call :detect_layout "%SCRIPT_DIR%"
if not defined SCFILE_DIR (
  call :log_error "Could not find \"sc-file-*\" folder near: %SCRIPT_DIR%"
  call :log_error "Put this .bat next to sc-file-* (or inside a subfolder of that folder)."
  pause
  exit /b 1
)

set "VENV_DIR=%SCFILE_DIR%\.venv"
set "PY=%VENV_DIR%\Scripts\python.exe"
set "REQ1=%SCFILE_DIR%\requirements.txt"
set "REQ2=%SCFILE_DIR%\requirements-web.txt"
set "SRC_STATIC=%ROOT%\\webapp\\static"
set "PKG_STATIC=%SCFILE_DIR%\\scfile\\webapp\\static"

if not exist "%REQ1%" (
  call :log_error "Missing file: %REQ1%"
  pause
  exit /b 1
)

if not exist "%REQ2%" (
  call :log_error "Missing file: %REQ2%"
  pause
  exit /b 1
)

rem Restore missing bundled assets inside the sc-file package (if user deleted them).
if not exist "%PKG_STATIC%" mkdir "%PKG_STATIC%" >nul 2>nul
if exist "%SRC_STATIC%\\index.html" (
  if not exist "%PKG_STATIC%\\index.html" (
    call :log_info "Restoring missing web assets into: %PKG_STATIC%"
    xcopy /E /I /Y "%SRC_STATIC%\\*" "%PKG_STATIC%\\" >nul
  )
)

rem If venv exists - do not require system python in PATH.
if exist "%PY%" if exist "%VENV_DIR%\pyvenv.cfg" goto :venv_ok

call :log_info "Creating/repairing venv: %VENV_DIR%"
call :find_system_python
if not defined SYS_PY (
  call :log_error "Python 3.11+ not found."
  call :log_error "Install Python 3.11+ and re-run."
  pause
  exit /b 1
)

call %SYS_PY% -m venv "%VENV_DIR%"
if errorlevel 1 (
  call :log_error "Failed to create venv."
  pause
  exit /b 1
)

:venv_ok
if not exist "%PY%" (
  call :log_error "venv python not found: %PY%"
  call :log_error "Delete %VENV_DIR% and run again."
  pause
  exit /b 1
)

call :log_info "Ensuring pip..."
"%PY%" -m pip --version >nul 2>nul
if errorlevel 1 (
  "%PY%" -m ensurepip --upgrade
  if errorlevel 1 (
    call :log_error "Failed to install pip (ensurepip)."
    pause
    exit /b 1
  )
)

call :log_info "Upgrading pip/setuptools/wheel..."
"%PY%" -m pip install --upgrade pip setuptools wheel
if errorlevel 1 (
  call :log_error "pip upgrade failed."
  pause
  exit /b 1
)

call :log_info "Installing requirements (this may take a while)..."
"%PY%" -m pip install -r "%REQ1%" -r "%REQ2%"
if errorlevel 1 (
  call :log_error "Dependency install failed."
  pause
  exit /b 1
)

call :log_info "Verifying imports..."
pushd "%SCFILE_DIR%" >nul 2>nul
"%PY%" -c "import PyInstaller; import fastapi, uvicorn, multipart, webview; import PIL; import scfile.webapp; import scfile.webapp.mapmerge as mm; mm._import_scmapmerge(); print('OK')" 
set "RC=%ERRORLEVEL%"
popd >nul 2>nul
if not "%RC%"=="0" (
  call :log_error "Import check failed. Open the output above and fix the missing package."
  pause
  exit /b %RC%
)

call :log_ok "Setup complete."
echo.
echo Start the Web UI now? (Y/N)
choice /C YN /N
if errorlevel 2 goto :eof

set "LAUNCH_BAT=%SCRIPT_DIR%\\scfile-web.bat"
if not exist "%LAUNCH_BAT%" set "LAUNCH_BAT=%ROOT%\\scfile-web.bat"
if not exist "%LAUNCH_BAT%" (
  call :log_error "Could not find scfile-web.bat near: %SCRIPT_DIR%"
  pause
  exit /b 1
)
call "%LAUNCH_BAT%"
goto :eof

:detect_layout
set "ROOT="
set "SCFILE_DIR="

for %%I in ("%~1.") do set "CUR=%%~fI"

:detect_layout_loop
call :pick_scfile "%CUR%"
if defined SCFILE_DIR (
  set "ROOT=%CUR%"
  goto :eof
)

for %%I in ("%CUR%\\..") do set "PARENT=%%~fI"
if /i "%PARENT%"=="%CUR%" goto :eof
set "CUR=%PARENT%"
goto :detect_layout_loop

:pick_scfile
set "SCFILE_DIR="
if exist "%~1\\sc-file\\pyproject.toml" (
  set "SCFILE_DIR=%~1\\sc-file"
  goto :eof
)
for /f "delims=" %%D in ('dir /b /ad /o:-d "%~1\\sc-file-*" 2^>nul') do (
  if exist "%~1\\%%D\\pyproject.toml" (
    set "SCFILE_DIR=%~1\\%%D"
    goto :eof
  )
)
goto :eof

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

:log_info
echo [INFO] %~1
exit /b 0

:log_warn
echo [WARN] %~1
exit /b 0

:log_error
echo [ERROR] %~1
exit /b 0

:log_ok
echo [OK] %~1
exit /b 0
