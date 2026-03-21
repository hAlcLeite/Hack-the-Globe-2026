# 🌲 CanopyOS Core: National Tactical Command

CanopyOS Core is a Palantir-style predictive and tactical backend designed specifically for the Canadian wildland fire landscape. 

While the United States utilizes the Integrated Reporting of Wildland-Fire Information (IRWIN) system as a centralized hub to orchestrate interagency data, Canada's intelligence pipeline is historically fragmented. Crucial telemetry is siloed across provincial and territorial agencies (e.g., BC Wildfire Service, Alberta Wildfire), the Canadian Interagency Forest Fire Centre (CIFFC), and the federal Canadian Wildland Fire Information System (CWFIS). 

CanopyOS acts as the ultimate unifier. It aggregates and normalizes these disparate public data sources into a single, low-latency centralized system. By fusing multi-agency data with live meteorological vectors, CanopyOS predicts fire trajectories and uses reinforcement learning to optimize the tactical deployment of first-responder assets.

## 🚀 Architecture Overview

The backend is split into three highly decoupled operational layers:

1. **The Unification Engine (Data Ingestion):** Rapidly ingests and normalizes unstructured JSON and geospatial feeds from provincial APIs, NRCan's Fire M3 hotspots, and satellite telemetry (Sentinel-2/MODIS). Data is stored in **AWS DynamoDB** for single-digit millisecond retrieval.
2. **Predictive Core (XGBoost):** A time-series machine learning model that analyzes historical topography, the Canadian Forest Fire Danger Rating System (CFFDRS) indices, and wind vectors to generate a dynamic 24-hour Burn Probability Map.
3. **Tactical Command (RL Agent):** An optimization engine that treats first-responder deployment as a high-stakes portfolio optimization problem. It allocates finite interagency assets (crews, bulldozers, aircraft) to optimal geographic choke points to maximize containment and minimize total acreage burned.

## 🛠 Tech Stack

* **Language:** Python 3.12+
* **Package Management:** `uv`
* **API Framework:** FastAPI
* **Machine Learning:** `xgboost`, `scikit-learn`, `pandas`, `geopandas`
* **Optimization/RL:** `ray[rllib]` (or heuristic allocation for MVP)
* **Database:** AWS DynamoDB (`boto3`)

## 📂 Project Structure

```text
├── src/
│   ├── api/                  # FastAPI routers and endpoints
│   ├── core/                 # Config, security, and DB initialization
│   ├── ingestion/            # Aggregators for CWFIS, CIFFC, and provincial APIs
│   ├── models/               # XGBoost and RL tactical models
│   └── main.py               # FastAPI application entry point
├── tests/                    # Pytest test suite
├── .env.example              # Environment variable templates
├── pyproject.toml            # uv project dependencies and metadata
└── uv.lock                   # Deterministic lockfile