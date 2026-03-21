"""
fires.py — Fire incident endpoints.

GET /api/v1/fires           — list all active fire incidents
GET /api/v1/fires/{fire_id} — get a specific fire by ID

Data sources:
  - DynamoDB (seeded dummy data + future real data)  →  primary
  - NASA FIRMS VIIRS live hotspots                   →  /fires/live endpoint
"""

from fastapi import APIRouter, HTTPException
from src.core.db import get_all_fire_events, get_fire_event
from src.ingestion.firms import get_firms_fires

router = APIRouter(prefix="/fires", tags=["Fire Incidents"])


@router.get("/", summary="List all active fire incidents (from DynamoDB)")
def list_fires():
    """Returns all fire events stored in DynamoDB."""
    items = get_all_fire_events()
    fires = [item.get("metadata", item) for item in items]
    return {
        "count": len(fires),
        "fires": fires,
    }


@router.get("/live", summary="Fetch real-time VIIRS satellite hotspots over BC + AB")
def list_live_fires():
    """
    Calls the NASA FIRMS API live to return the last 24h of VIIRS satellite
    fire detections over Western Canada. Does NOT touch DynamoDB.
    Rate-safe: 1 API call per request (limit: 5000/10min).
    """
    fires = get_firms_fires()
    return {
        "count": len(fires),
        "source": "NASA_FIRMS_VIIRS_NOAA20",
        "coverage": "BC + AB (last 24h)",
        "fires": fires,
    }


@router.get("/{fire_id}", summary="Get a specific fire incident by ID")
def get_fire(fire_id: str):
    """Returns the full DynamoDB record for a fire (metadata + burn grid + choke points)."""
    item = get_fire_event(fire_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Fire '{fire_id}' not found.")
    return item
