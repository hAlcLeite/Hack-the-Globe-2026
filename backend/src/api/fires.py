"""
fires.py — Fire incident endpoints.

GET /api/v1/fires           — list all active fire incidents
GET /api/v1/fires/{fire_id} — get a specific fire by ID
"""

from fastapi import APIRouter, HTTPException
from src.ingestion.dummy import get_dummy_fires, get_dummy_fire_by_id

router = APIRouter(prefix="/fires", tags=["Fire Incidents"])


@router.get("/", summary="List all active fire incidents")
def list_fires():
    fires = get_dummy_fires()
    return {
        "count": len(fires),
        "fires": fires,
    }


@router.get("/{fire_id}", summary="Get a specific fire incident by ID")
def get_fire(fire_id: str):
    fire = get_dummy_fire_by_id(fire_id)
    if not fire:
        raise HTTPException(status_code=404, detail=f"Fire '{fire_id}' not found.")
    return fire
