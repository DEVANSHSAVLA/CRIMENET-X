@echo off
title CRIMENET-X Launcher
color 0B

echo ==========================================================
echo   CRIMENET-X: AI-Powered Criminal Intelligence Platform
echo ==========================================================
echo.

cd /d "%~dp0"

echo [1/4] Freeing ports 3000 and 8001 if previously in use...
powershell -Command "Get-NetTCPConnection -LocalPort 3000, 8001 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

echo.
echo [2/4] Ingesting official CBI-Interpol Red Notice dataset (379)...
python -c "import sys; sys.path.insert(0, './backend'); from scripts.ingest_red_notices import ingest_dataset; ingest_dataset()"

echo.
echo [3/4] Starting FastAPI Intelligence API on http://localhost:8001...
start "CRIMENET-X Backend (Port 8001)" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"

echo.
echo [4/4] Starting Next.js 3D Console on http://localhost:3000...
start "CRIMENET-X Frontend (Port 3000)" cmd /k "cd /d %~dp0frontend && npm run dev -- -p 3000"

echo.
echo ==========================================================
echo   CRIMENET-X Command Center Initialized!
echo.
echo   Frontend: http://localhost:3000/command-center
echo   Backend:  http://localhost:8001/docs
echo ==========================================================
echo.
echo Opening browser in 5 seconds...
powershell -NoProfile -Command "Start-Sleep -Seconds 5"
start http://localhost:3000/command-center
