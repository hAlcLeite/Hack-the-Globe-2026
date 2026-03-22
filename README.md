# 🌲 CanopyOS — National Wildfire Tactical Intelligence Platform

> **Hack the Globe 2026** — Built by Team CanopyOS

CanopyOS is a **Palantir-style predictive command system** for Canadian wildland fire response. Canada's wildfire intelligence is historically fragmented across provincial agencies (BC Wildfire Service, Alberta Wildfire), federal systems (CWFIS, CIFFC), and satellite networks. CanopyOS unifies all of this into a single real-time platform — ingesting live fire data, fusing it with fire weather indices, and using machine learning to predict fire spread and optimize first-responder deployment.

---

## 🎯 The Problem

Canada has no centralized, real-time wildfire command system. Fire managers across BC, Alberta, and the territories are making life-or-death deployment decisions using siloed spreadsheets, phone calls between agencies, and manually reading satellite imagery. Every hour of delay in asset deployment costs thousands of hectares of forest. CanopyOS solves this.

---

## 🚀 What It Does

| Layer | What It Does |
|---|---|
| **Data Unification** | Pulls live fire data from NASA FIRMS (satellite hotspots), CWFIS/NRCan (official fire registry), and real-time weather from Open-Meteo |
| **Predictive Spread Model** | XGBoost model trained on CFFDRS fire weather indices (FWI, ISI, BUI), wind vectors, temperature, and humidity — outputs a 24h burn probability grid |
| **Tactical Command (RL Agent)** | Scores candidate geographic choke points using the burn probability grid and available interagency assets (crews, dozers, aircraft) to recommend optimal deployments |
| **Live Dashboard** | Palantir-style dark-mode tactical map showing all active fires, fire spread rings, resource positions, and AI recommendations |

---

## 🛠 Tech Stack

| Component | Technology |
|---|---|
| **Frontend** | Next.js 15, TypeScript, Zustand, react-map-gl (MapLibre), Framer Motion |
| **Backend API** | Python 3.12, FastAPI, Uvicorn |
| **Database** | AWS DynamoDB (`ca-central-1`) |
| **ML Models** | XGBoost, scikit-learn, pandas |
| **Data Sources** | NASA FIRMS (VIIRS satellite), CWFIS/NRCan (active fires + CFFDRS), Open-Meteo (weather) |
| **Package Manager** | `uv` (Python), `npm` (Node) |

---

## 📂 Repository Structure

```
Hack-the-Globe-2026/
├── backend/                   # FastAPI backend (Python)
│   ├── src/
│   │   ├── api/               # REST API endpoints (fires, predictions, assets, choke_points)
│   │   ├── core/              # Config, DynamoDB connection, DB helpers
│   │   ├── ingestion/         # Data pipeline (FIRMS, CWFIS, weather, CFFDRS)
│   │   ├── models/            # XGBoost spread model + RL tactical agent
│   │   └── main.py            # FastAPI app entry point
│   ├── .env                   # ⚠️ Secret credentials — never commit
│   └── pyproject.toml         # Python dependencies (managed by uv)
│
├── frontend/                  # Next.js frontend (TypeScript)
│   ├── app/                   # Next.js app router
│   ├── components/map/        # Tactical map (wildfire-map.tsx)
│   ├── components/sidebar/    # AI recommendations + media sidebar
│   ├── stores/                # Zustand global state (wildfire-store.ts)
│   ├── lib/api.ts             # Typed backend API client
│   └── data/fake-wildfire.ts  # Demo state (assets, AI suggestions, mission log)
│
└── docs/
    └── todo.md                # Project task tracker
```

---

## ⚙️ Quick Start

### Prerequisites
- Python 3.12+ with `uv` (`pip install uv`)
- Node.js 18+ with `npm`
- AWS account with DynamoDB table `canopy-os-events` in `ca-central-1`

### Backend
```bash
cd backend
cp .env.example .env          # Fill in your AWS + FIRMS keys
uv sync                       # Install Python deps
uv run python -m src.core.seed_db   # Seed DynamoDB with demo fires
uv run uvicorn src.main:app --reload
# → API live at http://localhost:8000
# → Swagger docs at http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# → Dashboard live at http://localhost:3000
```

---

## 📡 API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/v1/fires` | All fires from DynamoDB |
| `GET /api/v1/fires/live` | Real-time NASA FIRMS satellite hotspots |
| `GET /api/v1/fires/{id}` | Single fire with burn grid + choke points |
| `GET /api/v1/predictions/{id}` | 24h burn probability map |
| `GET /api/v1/assets` | First-responder asset inventory |
| `GET /api/v1/choke_points/{id}` | Ranked tactical deployment zones |
| `GET /health` | System status |

---

## 🔑 Environment Variables

Copy `backend/.env.example` → `backend/.env`:

```env
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ca-central-1
DYNAMODB_TABLE_NAME=canopy-os-events
NASA_FIRMS_API_KEY=...          # Free: https://firms.modaps.eosdis.nasa.gov/api/area/
USE_DUMMY_DATA=False
```