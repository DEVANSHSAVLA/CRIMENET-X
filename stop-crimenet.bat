@echo off
title Stop CRIMENET-X
color 0C

echo ==========================================================
echo   Shutting Down CRIMENET-X Servers...
echo ==========================================================
echo.

powershell -NoProfile -Command "$conns = Get-NetTCPConnection -LocalPort 3000, 8001 -State Listen -ErrorAction SilentlyContinue; if ($conns) { foreach ($c in $conns) { Write-Host 'Stopping PID' $c.OwningProcess 'on port' $c.LocalPort; Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue } } else { Write-Host 'No servers running on ports 3000 or 8001.' }"

echo.
echo ==========================================================
echo   CRIMENET-X Servers Stopped Successfully.
echo ==========================================================
powershell -NoProfile -Command "Start-Sleep -Seconds 2"
