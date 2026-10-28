# ===================================================================
# AgriSim AI — Unified Development Startup Script (PowerShell)
# Launches both FastAPI backend (port 8000) and Vite frontend (port 5173)
# ===================================================================

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " Starting AgriSim AI — Digital Twin & What-If Simulator " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green

# 1. Environment Verification
$env:PYTHONPATH = "backend"

# 2. Start Backend in separate process
Write-Host "[1/2] Launching FastAPI backend server on http://127.0.0.1:8000..." -ForegroundColor Yellow
$backendProcess = Start-Process python -ArgumentList "-m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload" -PassThru -NoNewWindow

Start-Sleep -Seconds 2

# 3. Start Frontend
Write-Host "[2/2] Launching Vite frontend on http://localhost:5173..." -ForegroundColor Yellow
Set-Location frontend
npm run dev -- --host 127.0.0.1 --port 5173
