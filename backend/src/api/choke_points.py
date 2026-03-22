"""
choke_points.py — Tactical deployment recommendation endpoints.

GET /api/v1/choke_points/{fire_id}
  Returns PPO-agent waypoints (or greedy fallback if model not trained yet).
  Each waypoint has lat/lon, asset_type, rationale, and confidence score.
"""

from fastapi import APIRouter, HTTPException, Query
from src.core.db import get_fire_event

router = APIRouter(prefix="/choke_points", tags=["Tactical Command"])


@router.get("/live", summary="Live tactical recommendations from coordinates (no DB lookup)")
def get_live_choke_points(
    lat: float = Query(..., description="Fire latitude"),
    lon: float = Query(..., description="Fire longitude"),
    spread_1h_m: float = Query(default=1500.0, description="1-hour spread radius in metres"),
    spread_3h_m: float = Query(default=4200.0, description="3-hour spread radius in metres"),
):
    """
    Return PPO (or greedy) tactical deployment recommendations for any fire location
    without requiring a DynamoDB record. Pass the spread radii from /predictions/live.
    """
    fire_data = {"latitude": lat, "longitude": lon}
    spread_output = {"spread_1h_m": spread_1h_m, "spread_3h_m": spread_3h_m}

    try:
        from src.models.rl_agent import get_tactical_recommendations
        waypoints = get_tactical_recommendations("live", fire_data, spread_output)
        return {
            "spread_1h_m": spread_1h_m,
            "spread_3h_m": spread_3h_m,
            "waypoints": waypoints,
            "total_waypoints": len(waypoints),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tactical agent error: {e}")


@router.get("/{fire_id}", summary="Get tactical deployment recommendations (PPO agent)")
def get_choke_points(fire_id: str):
    """
    Returns AI-generated tactical deployment waypoints for a fire.

    Pipeline:
    1. Fetch fire from DynamoDB
    2. Run XGBoost spread prediction for current conditions
    3. Feed spread output into PPO tactical agent (or greedy fallback)
    4. Return deployment waypoints with asset type + rationale
    """
    # Get fire record from DynamoDB
    fire = get_fire_event(fire_id)
    if not fire:
        raise HTTPException(status_code=404, detail=f"Fire '{fire_id}' not found.")

    fire_data = fire.get("metadata", fire)

    try:
        # Get spread prediction first (XGBoost)
        from src.models.spread_model import predict_spread
        spread_output = predict_spread(fire_id, fire_data)
    except Exception as e:
        spread_output = {"spread_1h_m": 1200, "spread_3h_m": 3600}

    try:
        # Run PPO agent (or greedy fallback)
        from src.models.rl_agent import get_tactical_recommendations
        waypoints = get_tactical_recommendations(fire_id, fire_data, spread_output)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Tactical agent error: {e}"
        )

    return {
        "fire_id": fire_id,
        "spread_1h_m": spread_output.get("spread_1h_m"),
        "spread_3h_m": spread_output.get("spread_3h_m"),
        "model": spread_output.get("model"),
        "waypoints": waypoints,
        "total_waypoints": len(waypoints),
    }
