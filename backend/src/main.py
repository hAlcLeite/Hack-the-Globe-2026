"""
main.py — CanopyOS FastAPI application entry point.

Run with:
    uv run uvicorn src.main:app --reload

API docs available at:
    http://localhost:8000/docs   (Swagger UI)
    http://localhost:8000/redoc  (ReDoc)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.config import settings
from src.api import fires, predictions, assets, choke_points

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "CanopyOS Tactical Command API — Unified Canadian wildfire intelligence pipeline. "
        "Aggregates multi-agency data, predicts fire spread with XGBoost, and recommends "
        "optimal first-responder deployment via a Reinforcement Learning agent."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS (allow all origins during development) ──────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(fires.router, prefix=API_PREFIX)
app.include_router(predictions.router, prefix=API_PREFIX)
app.include_router(assets.router, prefix=API_PREFIX)
app.include_router(choke_points.router, prefix=API_PREFIX)


# ── Health check ─────────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "mode": "dummy_data" if settings.USE_DUMMY_DATA else "live",
    }


@app.get("/", tags=["System"])
def root():
    return {
        "message": "🌲 CanopyOS API is running.",
        "docs": "/docs",
        "health": "/health",
    }
