# CanopyOS Backend — To-Do List

## Phase 1: Skeleton + Dummy Data ✅ (In Progress)
- [x] Set up `pyproject.toml` with `uv`
- [/] Scaffold `backend/src/` directory structure
  - [/] `main.py` — FastAPI app entry point
  - [/] `core/config.py` — environment variable loader
  - [/] `api/fires.py` — fire incident routes
  - [/] `api/predictions.py` — burn probability map routes
  - [/] `api/assets.py` — first-responder asset routes
  - [/] `api/choke_points.py` — RL choke point recommendation routes
  - [/] `ingestion/dummy.py` — dummy data generators for all above

## Phase 2: Real Data Ingestion
- [ ] **NASA FIRMS ingestion** (`ingestion/firms.py`)
  - Sign up for free API key at https://firms.modaps.eosdis.nasa.gov/api/area/
  - Pull MODIS/VIIRS active fire hotspots for Canada (bounding box)
  - Normalize to `FireEvent` schema
- [ ] **CWFIS/NRCan ingestion** (`ingestion/cwfis.py`)
  - Pull national active fire perimeters (GeoJSON, no auth needed)
  - Pull CFFDRS fire danger indices (FWI, ISI, BUI)
- [ ] **BC Wildfire Service ingestion** (`ingestion/bcws.py`)
  - Pull ArcGIS REST endpoints for active BC fire polygons
  - Normalize to `FireEvent` schema
- [ ] **Alberta Wildfire ingestion** (`ingestion/ab_wildfire.py`)
  - Pull ArcGIS REST endpoints for Alberta fire polygons
- [ ] **ECCC Datamart ingestion** (`ingestion/eccc.py`)
  - Pull HRDPS wind vectors (speed + direction) for fire zones
  - Pull temperature and humidity for CFFDRS index calculation
- [x] **DynamoDB integration** (`core/db.py`)
  - Set up `boto3` client with environment credentials
  - Write/read helpers for `FireEvent`, `BurnProbabilityGrid`, `AssetInventory`
  - Replace all dummy data with real DynamoDB reads

## Phase 3: ML Models
- [ ] **XGBoost Spread Model** (`models/spread_model.py`)
  - Define feature vector: `[wind_speed, wind_dir, humidity, temp, FWI, ISI, BUI, slope, fuel_type]`
  - Train on historical CWFIS spread data OR use pre-trained weights
  - Expose `predict_spread(fire_id) -> BurnProbabilityGrid` function
  - Wire into `GET /api/v1/predictions/{fire_id}`

- [ ] **RL Tactical Agent — MVP Greedy Heuristic** (`models/rl_agent.py`)
  - Score candidate choke points: `burn_probability × perimeter_vulnerability × accessibility`
  - Rank top N choke points per available asset type (crews, dozers, aircraft)
  - Expose `recommend_deployment(fire_id, assets) -> List[ChokepointRecommendation]`
  - Wire into `GET /api/v1/choke_points/{fire_id}`

- [ ] **RL Tactical Agent — V2 DRL** (stretch goal)
  - Set up `ray[rllib]` training environment simulating fire spread + asset constraints
  - Train policy and export trained weights
  - Replace greedy heuristic with policy inference

## Phase 4: API Hardening + Testing
- [ ] Add FastAPI background task scheduler (poll ingestion every 5 min)
- [ ] Add Pydantic response validation to all endpoints
- [ ] Write `pytest` tests for all ingestion normalizers (`tests/`)
- [ ] Add `/health` endpoint and basic error handling middleware
- [ ] Set up CORS middleware for frontend integration
- [ ] Containerize with `Dockerfile` (stretch goal)

## Environment Variables Needed (`.env`)
- [ ] `NASA_FIRMS_API_KEY` — from https://firms.modaps.eosdis.nasa.gov
- [ ] `AWS_ACCESS_KEY_ID` — AWS credentials for DynamoDB
- [ ] `AWS_SECRET_ACCESS_KEY`
- [ ] `AWS_REGION` (e.g. `ca-central-1`)
- [ ] `DYNAMODB_TABLE_NAME`
