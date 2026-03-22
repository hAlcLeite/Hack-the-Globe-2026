"""
predictions.py — Burn probability spread prediction endpoints.

GET /api/v1/predictions/{fire_id} — real XGBoost spread prediction for a fire
"""

from fastapi import APIRouter, HTTPException, Query
from src.core.db import get_fire_event

router = APIRouter(prefix="/predictions", tags=["Spread Predictions"])


@router.get("/live", summary="Live spread prediction from coordinates (no DB lookup)")
def get_live_spread_prediction(
    lat: float = Query(..., description="Fire latitude"),
    lon: float = Query(..., description="Fire longitude"),
    area_ha: float = Query(default=500.0, description="Current fire size in hectares"),
):
    """
    Run XGBoost spread prediction for any lat/lon without requiring a fire record in DynamoDB.
    Fetches live weather from Open-Meteo and returns +1h and +3h spread radii.
    Ideal for demo mode and fires not yet seeded into DynamoDB.
    """
    fire_data = {"latitude": lat, "longitude": lon, "area_hectares": area_ha}
    try:
        from src.models.spread_model import predict_spread
        result = predict_spread("live", fire_data)
        return result
    except Exception as e:
        return {
            "fire_id": "live",
            "spread_1h_m": 1500,
            "spread_3h_m": 4200,
            "features_used": {},
            "model": "fallback-static",
            "error": str(e),
        }


@router.get("/{fire_id}", summary="Get 24h spread prediction for a fire (XGBoost)")
def get_spread_prediction(fire_id: str):
    """
    Returns a real ML-based fire spread prediction for the given fire_id.

    - Fetches the fire record from DynamoDB to get lat/lon/area
    - Fetches live weather from Open-Meteo at the fire's location
    - Runs the XGBoost Rothermel spread model
    - Returns predicted spread radii at 1h and 3h horizons
    """
    # Get fire from DynamoDB
    fire = get_fire_event(fire_id)
    if not fire:
        raise HTTPException(status_code=404, detail=f"Fire '{fire_id}' not found.")

    # Extract fire_data from DynamoDB item structure
    fire_data = fire.get("metadata", fire)

    try:
        from src.models.spread_model import predict_spread
        result = predict_spread(fire_id, fire_data)
        return result
    except Exception as e:
        # Graceful fallback if model fails to load
        return {
            "fire_id": fire_id,
            "spread_1h_m": 1500,
            "spread_3h_m": 4200,
            "features_used": {},
            "model": "fallback-static",
            "error": str(e),
        }
