@echo off
setlocal
cd /d "%~dp0"
python hydro_sentinel_ui.py
if errorlevel 1 (
  echo.
  echo [ERROR] Echec du lancement UI.
  pause
)
