"""
assets.py — First-responder asset inventory endpoints.

GET /api/v1/assets              — list all assets (optional ?province= filter)
GET /api/v1/assets/summary      — get high-level asset counts by type and status
"""

from fastapi import APIRouter, Query
from src.ingestion.dummy import get_dummy_assets, get_dummy_assets_summary

router = APIRouter(prefix="/assets", tags=["Asset Inventory"])


@router.get("/summary", summary="Get summary counts of all assets by type and status")
def assets_summary():
    return get_dummy_assets_summary()


@router.get("/", summary="List all first-responder assets")
def list_assets(province: str | None = Query(default=None, description="Filter by province code, e.g. 'BC' or 'AB'")):
    assets = get_dummy_assets(province=province)
    return {
        "count": len(assets),
        "assets": assets,
    }
