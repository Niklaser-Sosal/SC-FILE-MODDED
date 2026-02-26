@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem SC-FILE:MODDED fast-module test launcher
rem - enables debug output
rem - passes file paths to trigger fast mode

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%.") do set "SCRIPT_DIR=%%~fI"

set "SCFILE_DEBUG=1"
set "NO_COLOR=1"

if "%~1"=="" (
  echo [INFO] No files passed.
  echo [INFO] Paste a file path (or multiple paths separated by ^|) and press Enter:
  set /p "USER_PATHS=> "
  if not defined USER_PATHS (
    echo [ERROR] No path provided.
    pause
    endlocal & exit /b 1
  )
  set "ARGS="
  for %%P in (%USER_PATHS:^|= %) do (
    set "ARGS=!ARGS! \"%%~P\""
  )
)

echo [INFO] Running scfile-web.bat with debug (fast mode)...
pushd "%SCRIPT_DIR%"
if defined ARGS (
  call "%SCRIPT_DIR%scfile-web.bat" !ARGS!
) else (
  call "%SCRIPT_DIR%scfile-web.bat" %*
)
set "RC=%ERRORLEVEL%"
popd

if not "%RC%"=="0" (
  echo [ERROR] scfile-web.bat exited with code %RC%.
  pause
  endlocal & exit /b %RC%
)

endlocal & exit /b 0
