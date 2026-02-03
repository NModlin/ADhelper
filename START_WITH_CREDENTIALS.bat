@echo off
REM ADHelper - Quick Start with Credential Storage
REM This script helps you set up and run ADHelper with stored credentials

echo ========================================
echo   ADHelper - Credential Setup
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js is installed
echo.

REM Check if dependencies are installed
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed
    echo.
)

REM Build the main process
echo [INFO] Building Electron main process...
call npm run build:main
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to build main process
    pause
    exit /b 1
)
echo [OK] Main process built
echo.

REM Test credential manager
echo ========================================
echo   Testing Credential Manager
echo ========================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "test-credential-manager.ps1"
echo.

REM Ask if user wants to save credentials now
echo ========================================
echo   Credential Setup
echo ========================================
echo.
echo Would you like to save your Active Directory credentials now?
echo (You can also do this later in the Settings page)
echo.
set /p SAVE_NOW="Save credentials now? (Y/N): "

if /i "%SAVE_NOW%"=="Y" (
    echo.
    echo Enter your Active Directory credentials:
    echo.
    set /p AD_USERNAME="AD Username (e.g., a-nmodlin): "
    set /p AD_PASSWORD="AD Password: "
    
    echo.
    echo Saving credentials...
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\CredentialManager.ps1" -Action Save -Target "ADHelper_ActiveDirectory" -Username "%AD_USERNAME%" -Password "%AD_PASSWORD%"
    
    echo.
    echo [OK] Credentials saved!
    echo.
)

echo ========================================
echo   Starting ADHelper
echo ========================================
echo.
echo The application will start in a few seconds...
echo.
echo IMPORTANT:
echo - Go to Settings to manage your credentials
echo - Credentials are stored securely in Windows Credential Manager
echo - You only need to enter them once!
echo.
echo Press Ctrl+C to stop the application
echo.

REM Start the application
call npm run dev

pause

