@echo off
echo Starting AD Helper...
echo ========================================
cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -File "ADhelper_fixed.ps1"
pause