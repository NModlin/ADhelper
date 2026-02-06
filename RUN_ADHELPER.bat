@echo off
REM ============================================================================
REM  ADHelper Quick Start Launcher
REM  
REM  This batch file provides a simple one-click way to launch the ADHelper
REM  PowerShell script with proper execution policy and error handling.
REM  
REM  Author: ADHelper Team
REM  Date: 2026-02-03
REM ============================================================================

REM Set console title and colors
title ADHelper - Active Directory Management Tool
color 0B

REM Display banner
echo.
echo ============================================================================
echo   ADHelper - Active Directory Management Tool
echo ============================================================================
echo.
echo   This tool helps you manage Active Directory users with features like:
echo   - User validation and group assignment
echo   - License management (Microsoft 365)
echo   - Proxy address configuration
echo   - Password reset and account unlocking
echo   - Bulk user processing
echo   - Secure credential storage
echo.
echo ============================================================================
echo.

REM Check if running with administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [WARNING] This script is not running as Administrator.
    echo           Some Active Directory operations may require admin rights.
    echo.
    echo Press any key to continue anyway, or close this window to exit...
    pause >nul
    echo.
)

REM Check if ADhelper.ps1 exists
echo [1/3] Checking for ADhelper.ps1...
if not exist "ADhelper.ps1" (
    color 0C
    echo.
    echo [ERROR] ADhelper.ps1 not found in the current directory!
    echo.
    echo Current directory: %CD%
    echo.
    echo Please ensure you are running this batch file from the ADhelper directory.
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
echo       [OK] ADhelper.ps1 found
echo.

REM Check if PowerShell is available
echo [2/3] Checking for PowerShell...
where powershell.exe >nul 2>&1
if %errorLevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] PowerShell not found!
    echo.
    echo PowerShell is required to run ADhelper.
    echo Please ensure PowerShell is installed and in your PATH.
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
echo       [OK] PowerShell found
echo.

REM Display pre-launch information
echo [3/3] Preparing to launch ADhelper...
echo.
echo ============================================================================
echo   IMPORTANT INFORMATION
echo ============================================================================
echo.
echo   - You will be prompted for your ADMIN credentials (a- account)
echo   - Choose to store credentials securely for future sessions
echo   - The script will log all operations to ADHelper-Log.txt
echo   - Press Ctrl+C at any time to exit the script
echo.
echo ============================================================================
echo.
echo Press any key to launch ADhelper, or close this window to cancel...
pause >nul
echo.

REM Launch the PowerShell script
echo Launching ADhelper.ps1...
echo.
echo ============================================================================
echo.

REM Execute PowerShell with proper parameters
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "ADhelper.ps1"

REM Capture the exit code
set SCRIPT_EXIT_CODE=%errorLevel%

REM Display completion message
echo.
echo ============================================================================
echo.

if %SCRIPT_EXIT_CODE% equ 0 (
    color 0A
    echo [SUCCESS] ADhelper completed successfully.
) else (
    color 0E
    echo [WARNING] ADhelper exited with code: %SCRIPT_EXIT_CODE%
    echo.
    echo This may indicate an error or that the script was cancelled.
    echo Check ADHelper-Log.txt for details.
)

echo.
echo Press any key to close this window...
pause >nul
exit /b %SCRIPT_EXIT_CODE%

