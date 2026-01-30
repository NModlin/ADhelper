@echo off
title ADHelper Desktop App - Development Mode
color 0B
echo.
echo ================================================
echo     ADHelper Desktop App
echo     Starting Development Mode...
echo ================================================
echo.

:: Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

:: Check if dist folder exists, if not compile
if not exist "dist\main\main.js" (
    echo Compiling TypeScript...
    call npm run build:main
    echo.
)

:: Start the development server
echo Starting Vite dev server and Electron...
echo.
echo If the app doesn't open, check for errors below.
echo Press Ctrl+C to stop the server.
echo.
call npm run dev

pause

