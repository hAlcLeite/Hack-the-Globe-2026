# 🌲 CanopyOS Core: National Tactical Command Backend

CanopyOS Core is a Palantir-style predictive and tactical backend designed specifically for the Canadian wildland fire landscape.

While the United States utilizes the Integrated Reporting of Wildland-Fire Information (IRWIN) system as a centralized hub, Canada's intelligence pipeline is historically fragmented — siloed across provincial agencies (BC Wildfire Service, Alberta Wildfire), federal systems (CWFIS, CIFFC), and satellite networks. CanopyOS acts as the ultimate unifier: it aggregates and normalizes these disparate sources into a single, low-latency system. By fusing multi-agency data with live meteorological vectors, CanopyOS predicts fire trajectories and uses reinforcement learning to optimize the tactical deployment of first-responder assets.

---

## 🚀 Architecture Overview

The backend is split into three highly decoupled operational layers:

1. **Unification Engine (Data Ingestion):** Ingests and normalizes data from provincial ArcGIS APIs, NRCan's CWFIS open data, and NASA FIRMS satellite telemetry. Stored in **AWS DynamoDB** for single-digit millisecond retrieval.
2. **Predictive Core (XGBoost):** A time-series ML model that analyzes topography, CFFDRS fire danger indices (FWI, ISI, BUI), and wind vectors to generate a dynamic 24-hour Burn Probability Map.
3. **Tactical Command (RL Agent):** Treats first-responder deployment as a portfolio optimization problem — allocating finite interagency assets (crews, bulldozers, aircraft) to optimal geographic choke points to maximize containment.

---

## 🛠 Tech Stack

| Tool | Purpose |
|---|---|
| Python 3.12+ | Language |
| `uv` | Package management & virtual env |
| FastAPI + Uvicorn | HTTP API framework |
| AWS DynamoDB + `boto3` | Primary database |
| `httpx` | Async HTTP for data ingestion |
| `pydantic-settings` | Config + `.env` loading |
| `shapely` | Geospatial calculations |
| `xgboost`, `scikit-learn` | ML spread model (Phase 3) |

---

## 📂 Full File Reference

```
backend/
├── src/
│   ├── main.py                      # FastAPI app entry point. Mounts all API routers.
│   │
│   ├── core/
│   │   ├── config.py                # Loads all settings from .env using pydantic-settings.
│   │   │                            # Single source of truth for API keys, region, table name.
│   │   ├── db.py                    # AWS DynamoDB connection and helper functions.
│   │   │                            # put_fire_event(), get_fire_event(), get_all_fire_events()
│   │   └── seed_db.py               # One-off script to push dummy data into DynamoDB.
│   │                                # Run: uv run python -m src.core.seed_db
│   │
│   ├── api/
│   │   ├── fires.py                 # GET /api/v1/fires        → all fires from DynamoDB
│   │   │                            # GET /api/v1/fires/live   → real-time NASA FIRMS hotspots
│   │   │                            # GET /api/v1/fires/{id}   → single fire by ID
│   │   ├── predictions.py           # GET /api/v1/predictions/{fire_id}
│   │   │                            # Returns 24h burn probability grid for a fire.
│   │   │                            # (Currently dummy data — Phase 3 wires in XGBoost)
│   │   ├── assets.py                # GET /api/v1/assets        → all first-responder assets
│   │   │                            # GET /api/v1/assets/summary → counts by type/status
│   │   └── choke_points.py          # GET /api/v1/choke_points/{fire_id}
│   │                                # Returns ranked deployment zones from RL agent.
│   │                                # (Currently dummy greedy heuristic — Phase 3 wires in DRL)
│   │
│   └── ingestion/
│       ├── dummy.py                 # Hardcoded dummy data for all data types.
│       │                            # Used during Phase 1. Still used by assets + predictions.
│       ├── firms.py                 # NASA FIRMS VIIRS ingestion.
│       │                            # Pulls last-24h satellite fire hotspots over BC + AB.
│       │                            # No DB write — called live by GET /fires/live
│       │                            # Run: uv run python -m src.ingestion.firms
│       └── cwfis.py                 # Canadian Wildland Fire Information System ingestion.
│                                    # Downloads NRCan's official activefires.csv daily file.
│                                    # Normalizes to FireEvent schema, filters to BC + AB.
│                                    # Run: uv run python -m src.ingestion.cwfis
│
├── .env                             # ⚠️ Secret credentials. NEVER commit. Git-ignored.
├── .env.example                     # Template for teammates. Safe to commit.
├── pyproject.toml                   # Project metadata + all Python dependencies (uv).
└── uv.lock                          # Deterministic lockfile. Always commit this.
```

---

## ⚙️ Setup & Running

### 1. Install dependencies
```bash
uv sync
```

### 2. Configure environment
Copy `.env.example` to `.env` and fill in your AWS credentials and NASA FIRMS key:
```bash
cp .env.example .env
```

### 3. Start the dev server
```bash
uv run uvicorn src.main:app --reload
```

API will be live at **http://localhost:8000**
Interactive docs at **http://localhost:8000/docs**

### 4. Seed the database (first time only)
```bash
uv run python -m src.core.seed_db
```

### 5. Test individual ingestion modules
```bash
uv run python -m src.ingestion.firms    # NASA satellite hotspots
uv run python -m src.ingestion.cwfis   # NRCan official active fires
```

---

## 🔑 Environment Variables (`.env`)

| Variable | Required | Description |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | ✅ | IAM user key for DynamoDB access |
| `AWS_SECRET_ACCESS_KEY` | ✅ | IAM user secret |
| `AWS_REGION` | ✅ | e.g. `ca-central-1` |
| `DYNAMODB_TABLE_NAME` | ✅ | e.g. `canopy-os-events` |
| `NASA_FIRMS_API_KEY` | ✅ | From https://firms.modaps.eosdis.nasa.gov/api/area/ |
| `USE_DUMMY_DATA` | ❌ | Set `False` for real data (default `True`) |

---

## 📡 API Quick Reference

| Method | Endpoint | Data Source | Description |
|---|---|---|---|
| GET | `/api/v1/fires` | DynamoDB | All stored fire events |
| GET | `/api/v1/fires/live` | NASA FIRMS | Real-time satellite hotspots (BC + AB, last 24h) |
| GET | `/api/v1/fires/{id}` | DynamoDB | Single fire with burn grid + choke points |
| GET | `/api/v1/predictions/{id}` | Dummy/XGBoost | 24h burn probability grid |
| GET | `/api/v1/assets` | Dummy | First-responder asset inventory |
| GET | `/api/v1/assets/summary` | Dummy | Asset counts by type and status |
| GET | `/api/v1/choke_points/{id}` | Dummy/RL Agent | Ranked tactical deployment zones |