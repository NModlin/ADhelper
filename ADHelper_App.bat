@echo off
echo Starting AD Helper...
echo ========================================
cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -File "ADhelper.ps1"
pause