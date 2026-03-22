# CanopyOS — Project To-Do

## ✅ Phase 1: Skeleton + Dummy Data
- [x] FastAPI app scaffold (`main.py`, routers, config)
- [x] All 4 API endpoints with dummy data (fires, predictions, assets, choke_points)
- [x] DynamoDB integration (`core/db.py` — read + write helpers)
- [x] Seed script (`core/seed_db.py`) — 4 demo fires seeded live to AWS

## ✅ Phase 2: Real Data Ingestion
- [x] **NASA FIRMS** (`ingestion/firms.py`) — VIIRS satellite hotspots, BC + AB
- [x] **CWFIS Active Fires** (`ingestion/cwfis.py`) — NRCan official fire CSV, no auth
- [x] **Open-Meteo Weather** (`ingestion/weather.py`) — wind, temp, humidity, dew point per fire. Verified 4/4 fires ✅
- [x] **CFFDRS Indices** (`ingestion/cffdrs.py`) — FWI, ISI, BUI from NRCan stations
  - ⚠️ Currently 0/4 fires matched — March off-season, stations not reporting FWI. Using synthetic fallback in model.
- [x] `GET /api/v1/fires/live` → real-time NASA FIRMS data
- [x] Frontend wired to backend — map renders all 4 DynamoDB fires as live markers

## ✅ Phase 3a: XGBoost Spread Model
- [x] `models/spread_model.py` — XGBoost v2 with 11 features
- [x] Synthetic Rothermel-physics training data (6,000 samples)
- [x] Wind U/V decomposition, slope factor, and RH trend features
- [x] R² = 0.977, MAE = 421m (1h) / 1323m (3h) on held-out test set ✅
- [x] Weights saved to `src/models/spread_1h_model.joblib` + `spread_3h_model.joblib`
- [x] `GET /api/v1/predictions/{fire_id}` → real XGBoost predictions wired in

## ✅ Phase 3b: PPO Tactical Agent
- [x] Added `gymnasium` + `stable-baselines3` deps
- [x] `models/fire_env.py` — 50×50 cellular automata `gymnasium.Env` wired to XGBoost spread rate
- [x] `models/train_rl_agent.py` — Trained 50,000 timesteps. Reward improved from -84 to +22 ✅
- [x] Weights saved to `src/models/tactical_ppo_agent.zip`
- [x] `models/rl_agent.py` — inference script with greedy geometric fallback safety net
- [x] Updated `api/choke_points.py` — real PPO pipeline active

## 🔲 Phase 4: Demo Day Polish
- [ ] Start frontend + verify map renders
- [ ] Re-seed DynamoDB if necessary: `uv run python -m src.core.seed_db`
- [ ] Connect PPO output visualizer to Frontend Map lines (currently hardcoded)
- [ ] Commit + push to `frontend_integration` branch, open PR to `main`
- [ ] Test full demo flow end-to-end:
  1. National view → 4 fire dots
  2. Click Okanagan → province view → incident card
  3. Mission Control → spread rings from XGBoost
  4. AI Choke points from PPO agent drawn on map
  5. Deploy assets → submit mission

## Environment Variables
- [x] `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + `AWS_REGION`
- [x] `DYNAMODB_TABLE_NAME=canopy-os-events`
- [x] `NASA_FIRMS_API_KEY`
- [x] `USE_DUMMY_DATA=False`
