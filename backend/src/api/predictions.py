"""
predictions.py — Burn probability spread prediction endpoints.

GET /api/v1/predictions/{fire_id} — get 24h burn probability grid for a fire
"""

from fastapi import APIRouter, HTTPException
from src.ingestion.dummy import get_dummy_burn_probability, get_dummy_fire_by_id

router = APIRouter(prefix="/predictions", tags=["Spread Predictions"])


@router.get("/{fire_id}", summary="Get 24h burn probability grid for a fire")
def get_spread_prediction(fire_id: str):
    fire = get_dummy_fire_by_id(fire_id)
    if not fire:
        raise HTTPException(status_code=404, detail=f"Fire '{fire_id}' not found.")

    grid = get_dummy_burn_probability(fire_id)
    return grid
