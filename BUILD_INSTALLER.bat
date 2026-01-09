@echo off
title ADHelper Desktop App - Build Installer
color 0B
echo.
echo ================================================
echo     ADHelper Desktop App
echo     Building Windows Installer...
echo ================================================
echo.

:: Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

:: Build the installer
echo Building application...
echo This may take a few minutes...
echo.
call npm run build:win

if %errorlevel% equ 0 (
    echo.
    echo ================================================
    echo     Build Successful!
    echo     Installer location: release\
    echo ================================================
    echo.
    explorer release
) else (
    echo.
    echo ================================================
    echo     Build Failed!
    echo     Check the error messages above.
    echo ================================================
    echo.
)

pause

