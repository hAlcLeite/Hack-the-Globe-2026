"""
fires.py — Fire incident endpoints.

GET /api/v1/fires           — list all active fire incidents
GET /api/v1/fires/{fire_id} — get a specific fire by ID

Data source: AWS DynamoDB (canopy-os-events table)
"""

from fastapi import APIRouter, HTTPException
from src.core.db import get_all_fire_events, get_fire_event

router = APIRouter(prefix="/fires", tags=["Fire Incidents"])


@router.get("/", summary="List all active fire incidents")
def list_fires():
    items = get_all_fire_events()
    # Each DynamoDB item stores fire metadata under the 'metadata' key
    fires = [item.get("metadata", item) for item in items]
    return {
        "count": len(fires),
        "fires": fires,
    }


@router.get("/{fire_id}", summary="Get a specific fire incident by ID")
def get_fire(fire_id: str):
    item = get_fire_event(fire_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Fire '{fire_id}' not found.")
    # Return the full item (includes metadata, burn_probability_grid, tactical_choke_points)
    return item
