"""
spread_model.py — XGBoost wildfire spread prediction model.

Predicts how far a fire will spread (in metres) over the next 1 hour and 3 hours,
given a feature vector of fire weather and CFFDRS danger indices.

TRAINING STRATEGY (Hackathon POC):
  We generate synthetic training data using the physics-based Rothermel fire spread
  formula as a ground truth generator:

      spread_rate ∝ FFMC_factor × ISI × exp(0.05039 × wind_speed) / RH

  Then we add realistic noise so XGBoost learns a non-linear approximation.
  This means the model behaves realistically — high ISI + low humidity = fast spread —
  without needing years of historical fire data.

FEATURES (8 inputs):
  wind_speed_km_h, wind_direction_deg, temperature_c, relative_humidity_pct,
  fwi, isi, bui, area_hectares

TARGETS (2 outputs, trained separately):
  spread_1h_m  — predicted spread radius in metres after 1 hour
  spread_3h_m  — predicted spread radius in metres after 3 hours

Run to train + test:
    uv run python -m src.models.spread_model

Run to get a live prediction for a fire:
    from src.models.spread_model import predict_spread
    result = predict_spread("BC-2026-001")
"""

from __future__ import annotations

import logging
import math
import random
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import joblib

logger = logging.getLogger(__name__)

# Model persistence — save trained models alongside this file
MODEL_DIR = Path(__file__).parent
MODEL_1H_PATH = MODEL_DIR / "spread_1h_model.joblib"
MODEL_3H_PATH = MODEL_DIR / "spread_3h_model.joblib"

# Feature names — must match exactly when predicting
FEATURE_COLS = [
    "wind_speed_km_h",
    "wind_direction_deg",
    "temperature_c",
    "relative_humidity_pct",
    "fwi",
    "isi",
    "bui",
    "area_hectares",
]


# ── Synthetic Data Generation ─────────────────────────────────────────────────

def _rothermel_spread_m_per_min(
    wind_speed: float,
    rh: float,
    isi: float,
    ffmc: float,
) -> float:
    """
    Simplified Rothermel-inspired spread rate formula.
    Returns estimated fire spread in metres per minute.

    Real Rothermel uses fuel type, slope, and many more variables.
    For a hackathon POC, this gives realistic behaviour:
      - High ISI + Low RH + High wind = fast spread
      - High RH + Low wind = slow spread
    """
    # Fine fuel moisture factor (FFMC 0-101 → moisture content ~2-100%)
    ffmc_factor = max(0.1, (101 - ffmc) / 100)

    # Wind velocity factor (exponential — Rothermel)
    wind_factor = math.exp(0.05039 * wind_speed)

    # RH damping (high humidity dramatically slows spread)
    rh_damping = max(0.01, 1 - (rh / 120))

    # Base spread rate in m/min
    base = isi * ffmc_factor * wind_factor * rh_damping * 2.5
    return max(0.5, base)


def generate_synthetic_dataset(n_samples: int = 6000, seed: int = 42) -> pd.DataFrame:
    """
    Generate a physics-informed synthetic training dataset.

    Ranges are based on real Canadian wildfire season observations (May–September).
    """
    rng = np.random.default_rng(seed)

    # Sample realistic fire weather ranges
    wind_speed   = rng.uniform(0, 60, n_samples)         # km/h
    wind_dir     = rng.uniform(0, 360, n_samples)         # degrees
    temperature  = rng.uniform(5, 42, n_samples)          # °C
    humidity     = rng.uniform(8, 85, n_samples)          # %
    fwi          = rng.uniform(0, 100, n_samples)         # 0–100+
    isi          = rng.uniform(0, 40, n_samples)          # 0–40
    bui          = rng.uniform(0, 200, n_samples)         # 0–200
    area_ha      = rng.uniform(1, 25000, n_samples)       # hectares

    # FFMC correlates strongly with humidity/temp (derive it)
    ffmc = np.clip(101 - humidity * 0.7 + temperature * 0.4, 0, 101)

    # LABELS — from Rothermel formula + noise
    spread_1h_m = np.array([
        _rothermel_spread_m_per_min(wind_speed[i], humidity[i], isi[i], ffmc[i]) * 60
        + rng.normal(0, 50)  # noise
        for i in range(n_samples)
    ])
    spread_3h_m = np.array([
        _rothermel_spread_m_per_min(wind_speed[i], humidity[i], isi[i], ffmc[i]) * 180
        + rng.normal(0, 200)  # more noise for longer horizon
        for i in range(n_samples)
    ])

    # Clip to realistic values (fire can't spread negative distance)
    spread_1h_m = np.clip(spread_1h_m, 50, 15000)
    spread_3h_m = np.clip(spread_3h_m, 100, 50000)

    return pd.DataFrame({
        "wind_speed_km_h":       wind_speed,
        "wind_direction_deg":    wind_dir,
        "temperature_c":         temperature,
        "relative_humidity_pct": humidity,
        "fwi":                   fwi,
        "isi":                   isi,
        "bui":                   bui,
        "area_hectares":         area_ha,
        "spread_1h_m":           spread_1h_m,
        "spread_3h_m":           spread_3h_m,
    })


# ── Model Training ─────────────────────────────────────────────────────────────

def train_spread_model(n_samples: int = 6000) -> tuple[XGBRegressor, XGBRegressor, dict]:
    """
    Generate synthetic data, train two XGBRegressor models (1h and 3h),
    save them to disk, and return evaluation metrics.

    Returns:
        (model_1h, model_3h, metrics_dict)
    """
    print(f"🌲 Generating {n_samples} synthetic fire spread samples...")
    df = generate_synthetic_dataset(n_samples=n_samples)

    X = df[FEATURE_COLS]
    y_1h = df["spread_1h_m"]
    y_3h = df["spread_3h_m"]

    # Train/test split (80/20)
    X_train, X_test, y1_train, y1_test, y3_train, y3_test = train_test_split(
        X, y_1h, y_3h, test_size=0.2, random_state=42
    )

    # XGBoost config — fast, not overfit
    xgb_params = dict(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1,
    )

    print("🔥 Training 1-hour spread model...")
    model_1h = XGBRegressor(**xgb_params)
    model_1h.fit(X_train, y1_train)

    print("🔥 Training 3-hour spread model...")
    model_3h = XGBRegressor(**xgb_params)
    model_3h.fit(X_train, y3_train)

    # Evaluate
    pred_1h = model_1h.predict(X_test)
    pred_3h = model_3h.predict(X_test)

    metrics = {
        "1h_mae_m":  round(mean_absolute_error(y1_test, pred_1h), 1),
        "1h_r2":     round(r2_score(y1_test, pred_1h), 3),
        "3h_mae_m":  round(mean_absolute_error(y3_test, pred_3h), 1),
        "3h_r2":     round(r2_score(y3_test, pred_3h), 3),
    }

    # Save models to disk
    joblib.dump(model_1h, MODEL_1H_PATH)
    joblib.dump(model_3h, MODEL_3H_PATH)
    print(f"💾 Models saved → {MODEL_DIR}")

    return model_1h, model_3h, metrics


# ── Model Loading (lazy singleton) ────────────────────────────────────────────

_model_1h: Optional[XGBRegressor] = None
_model_3h: Optional[XGBRegressor] = None


def _load_models() -> tuple[XGBRegressor, XGBRegressor]:
    """Load or train models on demand (train once, cache in memory)."""
    global _model_1h, _model_3h
    if _model_1h is None or _model_3h is None:
        if MODEL_1H_PATH.exists() and MODEL_3H_PATH.exists():
            logger.info("Loading pre-trained spread models from disk...")
            _model_1h = joblib.load(MODEL_1H_PATH)
            _model_3h = joblib.load(MODEL_3H_PATH)
        else:
            logger.info("No saved models found — training now...")
            _model_1h, _model_3h, metrics = train_spread_model()
            logger.info(f"Training complete: {metrics}")
    return _model_1h, _model_3h


# ── Public Prediction API ──────────────────────────────────────────────────────

def predict_spread_from_features(features: dict) -> dict:
    """
    Run the XGBoost models on a pre-built feature dict.

    Args:
        features: Dict with keys matching FEATURE_COLS.
                  Missing values are filled with safe defaults.

    Returns:
        Dict with spread predictions and feature importance.
    """
    model_1h, model_3h = _load_models()

    # Build the feature row, filling missing values with moderate defaults
    defaults = {
        "wind_speed_km_h":       20.0,
        "wind_direction_deg":    180.0,
        "temperature_c":         25.0,
        "relative_humidity_pct": 35.0,
        "fwi":                   25.0,
        "isi":                   10.0,
        "bui":                   60.0,
        "area_hectares":         500.0,
    }
    row = {col: features.get(col, defaults[col]) for col in FEATURE_COLS}
    df_row = pd.DataFrame([row])

    spread_1h = float(model_1h.predict(df_row)[0])
    spread_3h = float(model_3h.predict(df_row)[0])

    return {
        "spread_1h_m":  round(max(50, spread_1h)),
        "spread_3h_m":  round(max(100, spread_3h)),
        "features_used": row,
        "model": "XGBoost-Rothermel-Synthetic-v1",
    }


def predict_spread(fire_id: str, fire_data: Optional[dict] = None) -> dict:
    """
    High-level function: given a fire_id, fetch live weather and predict spread.
    Called by the FastAPI predictions endpoint.

    Args:
        fire_id:    The fire ID (e.g. "BC-2026-001")
        fire_data:  Optional fire dict with lat/lon. If None, uses defaults.

    Returns:
        Full prediction response dict.
    """
    from src.ingestion.weather import get_fire_weather

    lat = fire_data.get("latitude", 49.9071) if fire_data else 49.9071
    lon = fire_data.get("longitude", -119.496) if fire_data else -119.496
    area = fire_data.get("area_hectares", 500) if fire_data else 500

    # Fetch live weather for this fire's location
    weather = get_fire_weather(lat, lon)

    if weather:
        features = {
            "wind_speed_km_h":       weather.get("wind_speed_km_h", 20),
            "wind_direction_deg":    weather.get("wind_direction_deg", 180),
            "temperature_c":         weather.get("temperature_c", 25),
            "relative_humidity_pct": weather.get("relative_humidity_pct", 35),
            "fwi":                   25.0,   # CFFDRS fallback (off-season)
            "isi":                   10.0,
            "bui":                   60.0,
            "area_hectares":         float(area or 500),
        }
    else:
        logger.warning(f"No weather data for {fire_id} — using defaults")
        features = {}

    prediction = predict_spread_from_features(features)
    prediction["fire_id"] = fire_id

    return prediction


# ── CLI: Train + Test ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    import json
    logging.basicConfig(level=logging.INFO)

    print("=" * 60)
    print("  CanopyOS XGBoost Fire Spread Model — Training + Test")
    print("=" * 60)

    # Train
    model_1h, model_3h, metrics = train_spread_model(n_samples=6000)

    print("\n📊 Model Evaluation (held-out 20% test set):")
    print(f"  1-hour model:  MAE = {metrics['1h_mae_m']} m  |  R² = {metrics['1h_r2']}")
    print(f"  3-hour model:  MAE = {metrics['3h_mae_m']} m  |  R² = {metrics['3h_r2']}")

    print("\n🔮 Live predictions for demo fires:\n")

    demo_fires = [
        {"fire_id": "BC-2026-001", "name": "Okanagan Ridge Fire",    "latitude": 49.9071, "longitude": -119.4960, "area_hectares": 12450},
        {"fire_id": "BC-2026-003", "name": "Fraser Valley Approach", "latitude": 49.3845, "longitude": -121.4483, "area_hectares": 250},
        {"fire_id": "AB-2026-001", "name": "Peace River Complex",    "latitude": 56.2370, "longitude": -117.2900, "area_hectares": 12500},
    ]

    for fire in demo_fires:
        result = predict_spread(fire["fire_id"], fire)
        wx = result.get("features_used", {})
        print(f"━━━ {fire['name']} ({fire['fire_id']}) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(f"  Weather:  {wx.get('temperature_c')}°C, {wx.get('relative_humidity_pct')}% RH, "
              f"wind {wx.get('wind_speed_km_h')} km/h @ {wx.get('wind_direction_deg')}°")
        print(f"  🔴 Current perimeter: {fire['area_hectares']:,} ha")
        print(f"  🟠 +1h spread radius: {result['spread_1h_m']:,} m")
        print(f"  🟡 +3h spread radius: {result['spread_3h_m']:,} m")
        print()

    # Feature importance
    print("📈 Top feature importances (1h model):")
    fi = dict(zip(FEATURE_COLS, model_1h.feature_importances_))
    for feat, importance in sorted(fi.items(), key=lambda x: -x[1]):
        bar = "█" * int(importance * 40)
        print(f"  {feat:<28} {bar} ({importance:.3f})")
