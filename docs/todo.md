# CanopyOS — Project To-Do

## ✅ Phase 1: Skeleton + Dummy Data
- [x] FastAPI app scaffold (`main.py`, routers, config)
- [x] All 4 API endpoints with dummy data (fires, predictions, assets, choke_points)
- [x] DynamoDB integration (`core/db.py` — read + write helpers)
- [x] Seed script (`core/seed_db.py`) — 4 demo fires seeded live to AWS

## ✅ Phase 2: Real Data Ingestion
- [x] **NASA FIRMS** (`ingestion/firms.py`) — VIIRS satellite hotspots, BC + AB bounding box
- [x] **CWFIS Active Fires** (`ingestion/cwfis.py`) — NRCan official fire registry CSV, no auth
- [x] **Open-Meteo Weather** (`ingestion/weather.py`) — wind, temp, humidity, dew point per fire
- [x] **CFFDRS Indices** (`ingestion/cffdrs.py`) — FWI, ISI, BUI, DC, DMC, FFMC from NRCan stations
  - ⚠️ March = off-season, stations report no FWI. Fix: use synthetic fallback for hackathon demo
- [x] `GET /api/v1/fires/live` → real-time NASA FIRMS data
- [x] Frontend wired to backend — map renders all 4 DynamoDB fires as live markers

## 🔲 Phase 3: ML Models (MVP for Demo)

### Goal
A working, liveable demo for judges. Accuracy is not the priority — **speed and visual output are**.

### 3a — XGBoost Spread Model (`models/spread_model.py`)
**What it does:** Given a fire's current state and weather, predicts how far the fire will spread (in metres) in the next 1h and 3h.

**Feature vector (input to model):**
| Feature | Source | Notes |
|---|---|---|
| `wind_speed_km_h` | Open-Meteo | Key spread driver |
| `wind_direction_deg` | Open-Meteo | Determines direction |
| `temperature_c` | Open-Meteo | Fuel dryness proxy |
| `relative_humidity_pct` | Open-Meteo | Inversely correlates to spread |
| `fwi` | CWFIS/CFFDRS | Overall fire danger (0–100+) |
| `isi` | CWFIS/CFFDRS | Rate of spread index |
| `bui` | CWFIS/CFFDRS | Available fuel index |
| `area_hectares` | DynamoDB | Current fire size |

**Label (what we predict):**
- `spread_radius_1h_m` — estimated spread in metres over 1 hour
- `spread_radius_3h_m` — estimated spread in metres over 3 hours

**Training data strategy (hackathon POC):**
- We will NOT use real historical spread data (requires years of CWFIS archives)
- Instead: generate a **physics-informed synthetic dataset** of ~5000 samples using the Rothermel fire spread formula: `spread_rate ∝ ISI × wind_factor / RH`
- Add noise + realistic ranges from CWFIS historical averages
- Train a lightweight `XGBRegressor` on this synthetic dataset
- This gives us a model that behaves realistically and produces live visual output

**Output:** Two floats — 1h radius and 3h radius in metres. These feed the map's fire spread rings.

**Wire-in:** `GET /api/v1/predictions/{fire_id}` calls this model with live weather fetched from Open-Meteo.

**Status:** `[ ]` Not started

---

### 3b — RL Tactical Agent / Greedy Heuristic (`models/rl_agent.py`)
**What it does:** Given a fire + its spread prediction, score candidate choke points and recommend the best positions for each asset type (crews, dozers, aircraft).

**For the hackathon demo:** Use a **greedy scoring heuristic** (not full DRL training):
```
score(point) = burn_probability × perimeter_vulnerability × road_accessibility
```

- `burn_probability` comes from the XGBoost prediction grid
- `perimeter_vulnerability` is the un-contained arc length (simple geometry from fire radius)
- `road_accessibility` is a static score (1.0 for within 5km of highway, 0.5 otherwise)

**Output:** Ranked list of `[lat, lon, score, recommended_asset_type, rationale]`

**Wire-in:** `GET /api/v1/choke_points/{fire_id}` returns the top 5 choke points.

**Status:** `[ ]` Not started

---

### 3c — Immediate Next Steps
- [ ] Fix CFFDRS synthetic fallback so feature vector is never missing/NaN
- [ ] Write `models/spread_model.py` with synthetic training + XGBoost fit
- [ ] Add `predict_spread(fire_id)` function that:
  1. Fetches weather from Open-Meteo
  2. Fetches CFFDRS indices (or synthetic fallback)
  3. Runs XGBoost prediction
  4. Returns spread radii
- [ ] Wire into `GET /api/v1/predictions/{fire_id}`
- [ ] Wire predictions into frontend map's spread rings (currently hardcoded)
- [ ] Write `models/rl_agent.py` with greedy heuristic
- [ ] Wire into `GET /api/v1/choke_points/{fire_id}`

## 🔲 Phase 4: Polish for Demo Day
- [ ] `npm install` + verify frontend renders 4 fire markers on map
- [ ] Re-seed DynamoDB (`uv run python -m src.core.seed_db`) to push BC-2026-003 demo fire
- [ ] Live demo flow:
  1. Start at national view → 4 pulsing fire dots on map
  2. Click Okanagan Ridge → province view → incident card
  3. Open Mission Control → show spread rings driven by ML model
  4. Show AI choke point recommendations
  5. Deploy assets to map positions
  6. Submit mission → show success overlay
- [ ] Commit all changes to `frontend_integration` branch + open PR to `main`

## Environment Variables
- [x] `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + `AWS_REGION` — configured
- [x] `DYNAMODB_TABLE_NAME=canopy-os-events`
- [x] `NASA_FIRMS_API_KEY` — configured
- [ ] `USE_DUMMY_DATA=False` — confirm set in `.env`
