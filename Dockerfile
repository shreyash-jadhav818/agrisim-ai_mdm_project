# ===================================================================
# AgriSim AI — Multi-Stage Production Dockerfile
# ===================================================================

# Stage 1: Build Frontend Assets
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python Backend & Unified Server
FROM python:3.11-slim AS final
WORKDIR /app

# Install system utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Install backend dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source code
COPY backend/ ./backend/

# Copy built frontend dist into static serving directory
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Environment variables
ENV PYTHONPATH=/app/backend
ENV DATABASE_URL=sqlite:////app/agrisim.db
ENV PORT=8000
ENV HOST=0.0.0.0

# Volume for persistent SQLite database
VOLUME ["/app"]

EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
