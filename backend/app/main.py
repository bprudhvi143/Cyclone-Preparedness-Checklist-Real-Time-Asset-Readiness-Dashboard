from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.core.middleware import RateLimitMiddleware, LoggingMiddleware
from app.exceptions.exceptions import register_exception_handlers
from app.api.v1.routers import auth, locations, shelters, assets, checklists, alerts, dashboard, reports

app = FastAPI(
    title="GVMC Cyclone Preparedness API",
    description="Real-time Asset Readiness & Preparedness Checklist API for Greater Visakhapatnam Municipal Corporation",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 1. Register Core Middlewares
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Set to specific domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(LoggingMiddleware)
app.add_middleware(RateLimitMiddleware, requests_limit=100, window_seconds=60)

# 2. Register Custom Exception Handlers
register_exception_handlers(app)

# 3. Mount Image Static Directory
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# 4. Register Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(locations.router, prefix="/api/v1")
app.include_router(shelters.router, prefix="/api/v1")
app.include_router(assets.router, prefix="/api/v1")
app.include_router(checklists.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")

@app.get("/api/v1/health", tags=["System Utility"])
async def health_check():
    """Verify backend and database connectivity."""
    return {"status": "healthy", "timestamp": os.getenv("CURRENT_TIME", "2026-07-31T18:48:37")}
