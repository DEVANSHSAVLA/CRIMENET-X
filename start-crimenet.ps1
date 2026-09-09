# CRIMENET-X Quick Start Script
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  CRIMENET-X: AI-Powered Intelligence Platform" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n[1/3] Ingesting official CBI-Interpol Red Notice dataset (379)..." -ForegroundColor Yellow
python -c "import sys; sys.path.insert(0, '$root/backend'); from scripts.ingest_red_notices import ingest_dataset; ingest_dataset()"

Write-Host "`n[2/3] Launching FastAPI Intelligence API on http://localhost:8001..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root/backend'; uvicorn app.main:app --reload --port 8001"

Write-Host "`n[3/3] Launching Next.js Intelligence Console on http://localhost:3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root/frontend'; npm run dev -- -p 3000"

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  CRIMENET-X Operations Center Ready!" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:3000/command-center" -ForegroundColor White
Write-Host "  Backend:  http://localhost:8001/docs" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
