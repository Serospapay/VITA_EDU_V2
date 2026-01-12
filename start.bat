@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
REM VITA-Edu Launch Script

echo ========================================
echo   VITA-Edu Starting...
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if backend and frontend directories exist
if not exist "backend" (
    echo ERROR: backend directory not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ERROR: frontend directory not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

REM Check if node_modules exist
if not exist "backend\node_modules" (
    echo WARNING: Backend dependencies not installed!
    echo Run: cd backend ^&^& npm install
    echo.
    set /p install="Install dependencies now? (y/n): "
    if /i "!install!"=="y" (
        echo Installing backend dependencies...
        cd backend
        call npm install
        if errorlevel 1 (
            echo ERROR: Failed to install backend dependencies!
            pause
            exit /b 1
        )
        cd ..
    ) else (
        echo Cannot continue without dependencies.
        pause
        exit /b 1
    )
)

if not exist "frontend\node_modules" (
    echo WARNING: Frontend dependencies not installed!
    echo Run: cd frontend ^&^& npm install
    echo.
    set /p install="Install dependencies now? (y/n): "
    if /i "!install!"=="y" (
        echo Installing frontend dependencies...
        cd frontend
        call npm install
        if errorlevel 1 (
            echo ERROR: Failed to install frontend dependencies!
            pause
            exit /b 1
        )
        cd ..
    ) else (
        echo Cannot continue without dependencies.
        pause
        exit /b 1
    )
)

REM Check if ports are available
netstat -ano | findstr ":5000" >nul 2>&1
if not errorlevel 1 (
    echo WARNING: Port 5000 is already in use!
    echo Backend might already be running.
    echo.
)

netstat -ano | findstr ":3000" >nul 2>&1
if not errorlevel 1 (
    echo WARNING: Port 3000 is already in use!
    echo Frontend might already be running.
    echo.
)

REM Start Backend
echo [1/3] Starting Backend...
cd /d "%~dp0backend"
start "VITA-Edu-Backend" cmd /k "title VITA-Edu-Backend && npm run dev"
cd /d "%~dp0"

REM Wait for backend to start
echo [2/3] Waiting 10 seconds for backend to start...
timeout /t 10 /nobreak >nul

REM Start Frontend
echo [3/3] Starting Frontend...
cd /d "%~dp0frontend"
start "VITA-Edu-Frontend" cmd /k "title VITA-Edu-Frontend && npm run dev"
cd /d "%~dp0"

REM Wait for frontend to start
echo Waiting 5 seconds for frontend to start...
timeout /t 5 /nobreak >nul

REM Open browser
echo Opening browser...
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo.
echo ========================================
echo   VITA-Edu Running!
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo API Docs: http://localhost:5000/api-docs
echo.
echo Local mode: Only accessible from this computer
echo.
echo Press any key to stop all services...
pause >nul

REM Kill processes when user exits
echo.
echo Stopping services...
taskkill /F /FI "WINDOWTITLE eq VITA-Edu-Backend*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq VITA-Edu-Frontend*" >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do taskkill /F /PID %%a >nul 2>&1
echo All services stopped.
timeout /t 2 >nul
