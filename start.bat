@echo off
echo ==========================================================
echo  Starting AgriSim AI - Digital Twin ^& What-If Simulator
echo ==========================================================

set PYTHONPATH=backend
echo [1/2] Launching FastAPI backend server on http://127.0.0.1:8000...
start "AgriSim AI Backend" python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

timeout /t 3 /nobreak > nul

echo [2/2] Launching Vite frontend on http://localhost:5173...
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
