import os
import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.database.session import init_db
from app.routes import (
    crops_router,
    simulation_router,
    optimization_router,
    stress_test_router,
    risk_router,
    ai_router,
    history_router,
    reports_router
)

# Structured application logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("agrisim.api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize SQLite database tables
    logger.info("Initializing AgriSim AI SQLite persistence tables...")
    init_db()
    logger.info("Biophysical database ready.")
    yield
    # Shutdown
    logger.info("AgriSim AI backend shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AgriSim AI - Agricultural Digital Twin and What-If Simulator Backend API",
    lifespan=lifespan
)

# Global unhandled exception handler to prevent leaking stack traces
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error processing {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal simulation engine error occurred. Please verify your parameters."}
    )

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers under API V1 Prefix
api_prefix = settings.API_V1_STR
app.include_router(crops_router, prefix=api_prefix)
app.include_router(simulation_router, prefix=api_prefix)
app.include_router(optimization_router, prefix=api_prefix)
app.include_router(stress_test_router, prefix=api_prefix)
app.include_router(risk_router, prefix=api_prefix)
app.include_router(ai_router, prefix=api_prefix)
app.include_router(history_router, prefix=api_prefix)
app.include_router(reports_router, prefix=api_prefix)

@app.get("/api/health")
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "sqlite_connected"
    }

# Mount production static files if frontend is built
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
frontend_dist = os.path.join(BASE_DIR, "frontend", "dist")
if not os.path.exists(frontend_dist):
    frontend_dist = "/app/frontend/dist"

if os.path.exists(frontend_dist) and os.path.exists(os.path.join(frontend_dist, "index.html")):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("redoc") or full_path.startswith("openapi.json"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "message": "Welcome to AgriSim AI Backend API",
            "docs_url": "/docs",
            "health_check": "/api/health"
        }
