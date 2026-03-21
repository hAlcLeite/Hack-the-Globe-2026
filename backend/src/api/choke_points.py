"""
choke_points.py — RL tactical choke point recommendation endpoints.

GET /api/v1/choke_points/{fire_id} — get ranked deployment recommendations for a fire
"""

from fastapi import APIRouter, HTTPException
from src.ingestion.dummy import get_dummy_choke_points, get_dummy_fire_by_id

router = APIRouter(prefix="/choke_points", tags=["Tactical Command"])


@router.get("/{fire_id}", summary="Get RL-ranked choke point deployment recommendations for a fire")
def get_choke_points(fire_id: str):
    fire = get_dummy_fire_by_id(fire_id)
    if not fire:
        raise HTTPException(status_code=404, detail=f"Fire '{fire_id}' not found.")

    recommendations = get_dummy_choke_points(fire_id)
    return recommendations
