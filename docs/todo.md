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
- [x] **Wind U/V decomposition** — fixes cyclic wind direction problem
- [x] **Slope feature** — uphill fire acceleration via Rothermel slope factor
- [x] **RH trend feature** — temporal drying context
- [x] R² = 0.977, MAE = 421m (1h) / 1323m (3h) on held-out test set ✅
- [x] Weights saved to `src/models/spread_1h_model.joblib` + `spread_3h_model.joblib`
- [x] `GET /api/v1/predictions/{fire_id}` → real XGBoost predictions wired in

## 🔲 Phase 3b: PPO Tactical Agent
> See `docs/ppo_plan.md` for full architecture.
- [ ] Add `gymnasium` + `stable-baselines3` to `pyproject.toml`
- [ ] `models/fire_env.py` — 50×50 cellular automata `gymnasium.Env` wired to XGBoost spread rate
- [ ] `models/train_rl_agent.py` — PPO training script (50k timesteps, ~90s)
- [ ] `models/rl_agent.py` — inference: returns `[{lat, lon, asset_type}]` waypoints
- [ ] Update `api/choke_points.py` — replace greedy heuristic with PPO output
- [ ] Frontend: render PPO waypoints as tactical deployment lines on map

## 🔲 Phase 4: Demo Day Polish
- [ ] `npm install` in `frontend/` + verify 4 fire markers render
- [ ] Re-seed DynamoDB after model training: `uv run python -m src.core.seed_db`
- [ ] Verify `GET /api/v1/predictions/BC-2026-001` returns real ML output, not dummy
- [ ] Wire map spread rings from live prediction API (currently hardcoded in fake-wildfire.ts)
- [ ] Commit + push to `frontend_integration` branch, open PR to `main`
- [ ] Test full demo flow end-to-end:
  1. National view → 4 fire dots
  2. Click Okanagan → province view → incident card
  3. Mission Control → spread rings from XGBoost
  4. AI choke points from PPO agent
  5. Deploy assets → submit mission

## Environment Variables
- [x] `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + `AWS_REGION`
- [x] `DYNAMODB_TABLE_NAME=canopy-os-events`
- [x] `NASA_FIRMS_API_KEY`
- [x] `USE_DUMMY_DATA=False`
