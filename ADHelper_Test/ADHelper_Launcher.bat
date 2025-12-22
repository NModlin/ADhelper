@echo off
title AD Helper - Group & Proxy Manager
color 0B
echo.
echo ================================================
echo     AD Helper - Group & Proxy Manager
echo ================================================
echo.
echo Starting AD Helper...
echo.

:: Change to script directory
cd /d "%~dp0"

:: Check if PowerShell script exists
if not exist "ADhelper.ps1" (
    echo ERROR: ADhelper_fixed.ps1 not found in current directory!
    echo Current directory: %CD%
    echo.
    pause
    exit /b 1
)

:: Run PowerShell script with proper execution policy
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& '%~dp0ADhelper.ps1'"

:: Keep window open if script exits with error
if %errorlevel% neq 0 (
    echo.
    echo Script ended with error code: %errorlevel%
    echo.
    pause
)