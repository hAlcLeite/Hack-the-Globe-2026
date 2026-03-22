import { create } from "zustand";
import {
  CANADA_VIEW,
  PROVINCE_VIEW,
  INCIDENT_VIEW,
  GROUND_CREW_TEAMS,
  FIRE_ACTIONS,
  WILDFIRE_INCIDENT,
} from "@/data/demo-wildfire";
import {
  type FireSnapshot,
  buildInitialSnapshot,
  tickSnapshot,
  updateSnapshotWithRealData,
} from "@/lib/fire-simulator";
import {
  type Waypoint,
  type SpreadPrediction,
  fetchLiveSpreadPrediction,
  fetchLiveChokePoints,
} from "@/lib/api";

const WIND_DIR_DEG: Record<string, number> = {
  N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315,
};

// ─── Tactical proximity weight ────────────────────────────────────────────────
// Resources only contribute to containment if they are actually near the fire.
// A crew placed 80 km away in Williams Lake provides zero tactical value.
// Full credit within 8 km of the fire center; partial 8–15 km; zero beyond.
const _LAT_M = 110540;
const _LNG_M = 111320 * Math.cos(WILDFIRE_INCIDENT.center[1] * (Math.PI / 180));

function containmentWeight(pos: [number, number] | undefined): number {
  if (!pos) return 0;
  const dLat = (pos[1] - WILDFIRE_INCIDENT.center[1]) * _LAT_M;
  const dLon = (pos[0] - WILDFIRE_INCIDENT.center[0]) * _LNG_M;
  const distM = Math.sqrt(dLat * dLat + dLon * dLon);
  if (distM < 4_000) return 1.0;   // on or near the fire perimeter: full credit
  if (distM < 8_000) return 0.25;  // flanking / access road: minor credit
  return 0;                         // too far away: zero
}

// ─── Weather schedule ─────────────────────────────────────────────────────────
// BC interior wildfire day: hot/dry/windy afternoon → evening SW wind shift →
// overnight cooling. Linear hours (14 = 2 pm, 24 = midnight).
const GAME_START_HOUR = 14;
const GAME_MINUTES_PER_TICK = 3; // each tick = 3 real seconds = 3 game minutes
const WIND_SHIFT_TRIGGER_HOUR = 20; // 8 pm SW wind shift fires the alert

interface WeatherEntry {
  linearHour: number;
  windDirDeg: number;
  windSpeedKph: number;
  tempC: number;
  rhPct: number;
}

const WEATHER_SCHEDULE: WeatherEntry[] = [
  { linearHour: 14, windDirDeg: 315, windSpeedKph: 24, tempC: 27, rhPct: 11 },
  { linearHour: 15, windDirDeg: 315, windSpeedKph: 28, tempC: 29, rhPct: 9 },
  { linearHour: 16, windDirDeg: 310, windSpeedKph: 34, tempC: 31, rhPct: 7 },
  { linearHour: 17, windDirDeg: 300, windSpeedKph: 30, tempC: 30, rhPct: 9 },
  { linearHour: 18, windDirDeg: 280, windSpeedKph: 26, tempC: 27, rhPct: 13 },
  { linearHour: 19, windDirDeg: 260, windSpeedKph: 22, tempC: 24, rhPct: 17 },
  { linearHour: 20, windDirDeg: 225, windSpeedKph: 18, tempC: 21, rhPct: 22 }, // SW shift
  { linearHour: 21, windDirDeg: 210, windSpeedKph: 14, tempC: 18, rhPct: 28 },
  { linearHour: 22, windDirDeg: 190, windSpeedKph: 10, tempC: 15, rhPct: 35 },
  { linearHour: 23, windDirDeg: 180, windSpeedKph:  8, tempC: 13, rhPct: 40 },
  { linearHour: 24, windDirDeg: 180, windSpeedKph:  6, tempC: 11, rhPct: 48 },
];

function getWeatherForLinearHour(linearHour: number): WeatherEntry {
  let match = WEATHER_SCHEDULE[0];
  for (const entry of WEATHER_SCHEDULE) {
    if (entry.linearHour <= linearHour) match = entry;
    else break;
  }
  return match;
}

// ─── Tick computation (pure, used by both real-time and fast-forward) ─────────

interface TickableState {
  tickCount: number;
  gameLinearHour: number;
  gameMinute: number;
  currentWeather: { windDirDeg: number; windSpeedKph: number; tempC: number; rhPct: number };
  windShiftFired: boolean;
  windShiftAlert: boolean;
  deployedBurnLines: [number, number][][];
  groundCrews: Resource[];
  fireActions: Resource[];
  fireSnapshot: FireSnapshot;
  containmentPct: number;
  currentSizeHa: number;
  gameWon: boolean;
}

function computeNextTick(s: TickableState): TickableState {
  const newTickCount = s.tickCount + 1;
  const gameMinutesElapsed = newTickCount * GAME_MINUTES_PER_TICK;
  const newLinearHour = GAME_START_HOUR + Math.floor(gameMinutesElapsed / 60);
  const newGameMinute = gameMinutesElapsed % 60;
  const newWeather = getWeatherForLinearHour(newLinearHour);

  // Wind shift: first tick crossing WIND_SHIFT_TRIGGER_HOUR
  const crossedWindShift = !s.windShiftFired && newLinearHour >= WIND_SHIFT_TRIGGER_HOUR;
  const windShiftFired = s.windShiftFired || crossedWindShift;
  const windShiftAlert = s.windShiftAlert || crossedWindShift;

  // Update fire snapshot wind direction from schedule
  const updatedSnapshot = {
    ...s.fireSnapshot,
    wind: { directionDeg: newWeather.windDirDeg, speedKph: newWeather.windSpeedKph },
  };

  const barriers = s.deployedBurnLines;
  const containmentPoints: [number, number][] = [
    ...s.groundCrews.filter((r) => r.deployedPosition).map((r) => r.deployedPosition as [number, number]),
    ...s.fireActions
      .filter((r) => (r.type === "dozer-line" || r.type === "air-tanker") && r.deployedPosition)
      .map((r) => r.deployedPosition as [number, number]),
  ];

  const fireSnapshot = tickSnapshot(updatedSnapshot, WILDFIRE_INCIDENT.center, barriers, containmentPoints);

  // Containment % — only counts resources deployed tactically near the fire.
  // Placement matters: a crew 80 km away gives zero credit.
  const crewRate = s.groundCrews
    .filter((r) => r.deployedPosition)
    .reduce((sum, r) => sum + containmentWeight(r.deployedPosition) * 0.1, 0);
  const dozerRate = s.fireActions
    .filter((r) => r.type === "dozer-line" && r.deployedPosition)
    .reduce((sum, r) => sum + containmentWeight(r.deployedPosition) * 0.15, 0);
  const tankerRate = s.fireActions
    .filter((r) => r.type === "air-tanker" && r.deployedPosition)
    .reduce((sum, r) => sum + containmentWeight(r.deployedPosition) * 0.2, 0);
  // Burn lines are drawn directly on the map near the fire — always count if present
  const burnLineCount = s.deployedBurnLines.length;
  const burnRate = burnLineCount * 0.1;
  const ratePerTick = crewRate + dozerRate + tankerRate + burnRate;
  const containmentPct = Math.min(95, s.containmentPct + ratePerTick);

  // Count effectively-deployed resources (proximity-weighted sum for growth calc)
  const effectiveDeployed = crewRate / 0.2 + dozerRate / 0.3 + tankerRate / 0.4;
  const totalDeployed = Math.round(effectiveDeployed) + Math.min(1, burnLineCount);
  const growthHa = containmentPct >= 80 ? -30 : Math.max(0, 14 - totalDeployed * 3);
  const currentSizeHa = Math.max(100, s.currentSizeHa + growthHa);

  const gameWon = containmentPct >= 95;

  return {
    ...s,
    tickCount: newTickCount,
    gameLinearHour: newLinearHour,
    gameMinute: newGameMinute,
    currentWeather: {
      windDirDeg: newWeather.windDirDeg,
      windSpeedKph: newWeather.windSpeedKph,
      tempC: newWeather.tempC,
      rhPct: newWeather.rhPct,
    },
    windShiftFired,
    windShiftAlert,
    fireSnapshot,
    containmentPct,
    currentSizeHa,
    gameWon,
  };
}

function makeInitialSnapshot(): FireSnapshot {
  return buildInitialSnapshot(
    WILDFIRE_INCIDENT.center,
    WIND_DIR_DEG[WILDFIRE_INCIDENT.wind.direction] ?? 315,
    WILDFIRE_INCIDENT.wind.speed,
    1500, // current perimeter radius (m)
    900   // burn scar radius (m) — smaller inner core
  );
}

export type ViewLevel = "national" | "province" | "incident";
export type ResourceType = "ground-crew" | "planned-burn" | "dozer-line" | "air-tanker";
export type ResourceStatus = "standby" | "ready" | "deployed";

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  count?: number;
  experience?: string;
  status: ResourceStatus;
  description?: string;
  deployedPosition?: [number, number];
}

interface Viewport {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

interface WildfireState {
  viewLevel: ViewLevel;
  setViewLevel: (level: ViewLevel) => void;

  viewport: Viewport;
  setViewport: (vp: Viewport) => void;

  groundCrews: Resource[];
  fireActions: Resource[];

  selectedResourceId: string | null;
  setSelectedResourceId: (id: string | null) => void;

  placementMousePos: { lng: number; lat: number } | null;
  setPlacementMousePos: (pos: { lng: number; lat: number } | null) => void;

  // Active burn line being drawn (uncommitted)
  activeBurnLine: [number, number][];
  addActiveBurnPoint: (point: [number, number]) => void;
  commitBurnLine: () => void;
  // All committed burn lines (barriers)
  deployedBurnLines: [number, number][][];
  clearAllBurnLines: () => void;

  deployResource: (id: string, position: [number, number]) => void;
  removeDeployment: (id: string) => void;

  submitted: boolean;
  submittedAt: string | null;
  submit: () => void;
  resetMission: () => void;

  isAiSidebarOpen: boolean;
  toggleAiSidebar: () => void;

  fireSnapshot: FireSnapshot;
  tickFireSimulation: () => void;
  resetFireSimulation: () => void;

  // Backend-sourced data
  chokePoints: Waypoint[];
  backendStatus: "idle" | "loading" | "loaded" | "error";
  fetchBackendData: () => Promise<void>;
  // Expose real weather for UI display
  realWeather: { windDirDeg: number; windSpeedKph: number; tempC: number; rhPct: number } | null;
  // Real XGBoost spread prediction (used by AI recommendations + spread forecast panel)
  spreadPrediction: SpreadPrediction | null;

  // Gemini AI recommendations
  aiRecommendations: AiRecommendation[] | null;
  aiRecommendationsStatus: "idle" | "loading" | "loaded" | "error";
  fetchAiRecommendations: () => Promise<void>;

  // Map focus — set by clicking a recommendation card
  focusedRecommendationIndex: number | null;
  setFocusedRecommendationIndex: (i: number | null) => void;

  // Deploy a resource at AI-suggested coordinates
  quickDeploy: (resourceType: ResourceType, position: [number, number]) => void;

  // Game simulation state
  gameLinearHour: number;
  gameMinute: number;
  tickCount: number;
  currentSizeHa: number;
  containmentPct: number;
  currentWeather: { windDirDeg: number; windSpeedKph: number; tempC: number; rhPct: number };
  windShiftAlert: boolean;
  windShiftFired: boolean;
  gameWon: boolean;
  fastForwardGame: () => void;
  dismissWindShiftAlert: () => void;
}

export interface AiRecommendation {
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  detail: string;
  confidence: number;
  timeWindow: string;
  // AI-suggested deployment location and resource
  lat?: number;
  lon?: number;
  resource_type?: ResourceType;
}

export const useWildfireStore = create<WildfireState>((set, get) => ({
  viewLevel: "national",
  setViewLevel: (level) => {
    const vp =
      level === "national"
        ? CANADA_VIEW
        : level === "province"
          ? PROVINCE_VIEW
          : INCIDENT_VIEW;
    set({ viewLevel: level, viewport: vp });
  },

  viewport: CANADA_VIEW,
  setViewport: (vp) => set({ viewport: vp }),

  groundCrews: GROUND_CREW_TEAMS.map((r) => ({ ...r })) as Resource[],
  fireActions: FIRE_ACTIONS.map((r) => ({ ...r })) as Resource[],

  selectedResourceId: null,
  setSelectedResourceId: (id) => set({ selectedResourceId: id }),

  placementMousePos: null,
  setPlacementMousePos: (pos) => set({ placementMousePos: pos }),

  activeBurnLine: [],
  addActiveBurnPoint: (point) =>
    set((state) => ({ activeBurnLine: [...state.activeBurnLine, point] })),
  commitBurnLine: () =>
    set((state) => ({
      deployedBurnLines:
        state.activeBurnLine.length >= 2
          ? [...state.deployedBurnLines, state.activeBurnLine]
          : state.deployedBurnLines,
      activeBurnLine: [],
    })),
  deployedBurnLines: [],
  clearAllBurnLines: () => set({ deployedBurnLines: [], activeBurnLine: [] }),

  deployResource: (id, position) =>
    set((state) => ({
      groundCrews: state.groundCrews.map((r) =>
        r.id === id ? { ...r, deployedPosition: position, status: "deployed" } : r
      ),
      fireActions: state.fireActions.map((r) =>
        r.id === id ? { ...r, deployedPosition: position, status: "deployed" } : r
      ),
      selectedResourceId: null,
      placementMousePos: null,
    })),

  removeDeployment: (id) =>
    set((state) => {
      const isBurn = state.fireActions.find((r) => r.id === id)?.type === "planned-burn";
      if (isBurn) {
        return { deployedBurnLines: [], activeBurnLine: [] };
      }
      return {
        groundCrews: state.groundCrews.map((r) =>
          // Reset to standby so they can be redeployed
          r.id === id ? { ...r, deployedPosition: undefined, status: "standby" } : r
        ),
        fireActions: state.fireActions.map((r) =>
          r.id === id
            ? { ...r, deployedPosition: undefined, status: "ready" }
            : r
        ),
        selectedResourceId: null,
      };
    }),

  submitted: false,
  submittedAt: null,
  submit: () =>
    set({
      submitted: true,
      submittedAt: new Date().toLocaleTimeString("en-CA", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }),
  resetMission: () =>
    set({
      submitted: false,
      submittedAt: null,
      groundCrews: GROUND_CREW_TEAMS.map((r) => ({ ...r })) as Resource[],
      fireActions: FIRE_ACTIONS.map((r) => ({ ...r })) as Resource[],
      selectedResourceId: null,
      placementMousePos: null,
      activeBurnLine: [],
      deployedBurnLines: [],
      chokePoints: [],
      backendStatus: "idle",
      realWeather: null,
      spreadPrediction: null,
      aiRecommendations: null,
      aiRecommendationsStatus: "idle",
      fireSnapshot: makeInitialSnapshot(),
      gameLinearHour: GAME_START_HOUR,
      gameMinute: 0,
      tickCount: 0,
      currentSizeHa: WILDFIRE_INCIDENT.size,
      containmentPct: WILDFIRE_INCIDENT.containment,
      currentWeather: { windDirDeg: 315, windSpeedKph: 24, tempC: 27, rhPct: 11 },
      windShiftAlert: false,
      windShiftFired: false,
      gameWon: false,
    }),

  isAiSidebarOpen: true,
  toggleAiSidebar: () => set((s) => ({ isAiSidebarOpen: !s.isAiSidebarOpen })),

  fireSnapshot: makeInitialSnapshot(),
  tickFireSimulation: () =>
    set((s) => {
      if (s.gameWon) return {};
      return computeNextTick({
        tickCount: s.tickCount,
        gameLinearHour: s.gameLinearHour,
        gameMinute: s.gameMinute,
        currentWeather: s.currentWeather,
        windShiftFired: s.windShiftFired,
        windShiftAlert: s.windShiftAlert,
        deployedBurnLines: s.deployedBurnLines,
        groundCrews: s.groundCrews,
        fireActions: s.fireActions,
        fireSnapshot: s.fireSnapshot,
        containmentPct: s.containmentPct,
        currentSizeHa: s.currentSizeHa,
        gameWon: s.gameWon,
      });
    }),

  fastForwardGame: () =>
    set((s) => {
      if (s.gameWon) return {};
      let tickState: TickableState = {
        tickCount: s.tickCount,
        gameLinearHour: s.gameLinearHour,
        gameMinute: s.gameMinute,
        currentWeather: s.currentWeather,
        windShiftFired: s.windShiftFired,
        windShiftAlert: s.windShiftAlert,
        deployedBurnLines: s.deployedBurnLines,
        groundCrews: s.groundCrews,
        fireActions: s.fireActions,
        fireSnapshot: s.fireSnapshot,
        containmentPct: s.containmentPct,
        currentSizeHa: s.currentSizeHa,
        gameWon: s.gameWon,
      };
      for (let i = 0; i < 60; i++) {
        tickState = computeNextTick(tickState);
        if (tickState.gameWon) break;
      }
      return {
        tickCount: tickState.tickCount,
        gameLinearHour: tickState.gameLinearHour,
        gameMinute: tickState.gameMinute,
        currentWeather: tickState.currentWeather,
        windShiftFired: tickState.windShiftFired,
        windShiftAlert: tickState.windShiftAlert,
        fireSnapshot: tickState.fireSnapshot,
        containmentPct: tickState.containmentPct,
        currentSizeHa: tickState.currentSizeHa,
        gameWon: tickState.gameWon,
      };
    }),

  dismissWindShiftAlert: () =>
    set((s) => ({
      windShiftAlert: false,
      // Recall all resources so the user can reposition them
      groundCrews: s.groundCrews.map((r) => ({ ...r, deployedPosition: undefined, status: "standby" as const })),
      fireActions: s.fireActions.map((r) =>
        r.type !== "planned-burn" ? { ...r, deployedPosition: undefined, status: "ready" as const } : r
      ),
      deployedBurnLines: [],
      activeBurnLine: [],
      selectedResourceId: null,
    })),

  resetFireSimulation: () => set({ fireSnapshot: makeInitialSnapshot() }),

  chokePoints: [],
  backendStatus: "idle",
  realWeather: null,
  spreadPrediction: null,

  gameLinearHour: GAME_START_HOUR,
  gameMinute: 0,
  tickCount: 0,
  currentSizeHa: WILDFIRE_INCIDENT.size,
  containmentPct: WILDFIRE_INCIDENT.containment,
  currentWeather: { windDirDeg: 315, windSpeedKph: 24, tempC: 27, rhPct: 11 },
  windShiftAlert: false,
  windShiftFired: false,
  gameWon: false,

  aiRecommendations: null,
  aiRecommendationsStatus: "idle",
  fetchAiRecommendations: async () => {
    set({ aiRecommendationsStatus: "loading" });
    try {
      const s = get();
      const deployedActions = [
        ...s.groundCrews.filter((r) => r.deployedPosition).map((r) => r.name + " (ground crew)"),
        ...s.fireActions.filter((r) => r.type !== "planned-burn" && r.deployedPosition).map((r) => r.name),
        ...(s.deployedBurnLines.length > 0 ? [`${s.deployedBurnLines.length} planned burn line(s)`] : []),
      ];
      const resp = await fetch("/api/ai-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fireData: WILDFIRE_INCIDENT,
          weather: s.realWeather,
          spreadMeters: s.spreadPrediction
            ? { spread_1h_m: s.spreadPrediction.spread_1h_m, spread_3h_m: s.spreadPrediction.spread_3h_m }
            : null,
          deployedActions,
        }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      set({ aiRecommendations: data.recommendations, aiRecommendationsStatus: "loaded" });
    } catch {
      set({ aiRecommendationsStatus: "error" });
    }
  },

  focusedRecommendationIndex: null,
  setFocusedRecommendationIndex: (i) => set({ focusedRecommendationIndex: i }),

  quickDeploy: (resourceType, position) =>
    set((state) => {
      if (resourceType === "ground-crew") {
        // Deploy first available ground crew
        const crew = state.groundCrews.find((r) => !r.deployedPosition);
        if (!crew) return {};
        return {
          groundCrews: state.groundCrews.map((r) =>
            r.id === crew.id ? { ...r, deployedPosition: position, status: "deployed" } : r
          ),
          focusedRecommendationIndex: null,
        };
      }
      // For action types: deploy first matching undeployed action
      const action = state.fireActions.find(
        (r) => r.type === resourceType && !r.deployedPosition
      );
      if (!action) return {};
      return {
        fireActions: state.fireActions.map((r) =>
          r.id === action.id ? { ...r, deployedPosition: position, status: "deployed" } : r
        ),
        focusedRecommendationIndex: null,
      };
    }),

  fetchBackendData: async () => {
    set({ backendStatus: "loading" });
    // center is [lng, lat] (GeoJSON order) — must destructure correctly
    const [lon, lat] = WILDFIRE_INCIDENT.center;
    const areaHa = WILDFIRE_INCIDENT.size;

    try {
      // 1. Get XGBoost spread prediction + live weather in one call
      const spread = await fetchLiveSpreadPrediction(lat, lon, areaHa);

      if (spread) {
        const windDir = spread.features_used?.wind_direction_deg ?? WIND_DIR_DEG[WILDFIRE_INCIDENT.wind.direction] ?? 315;
        const windSpeed = spread.features_used?.wind_speed_km_h ?? WILDFIRE_INCIDENT.wind.speed;

        // Update fire simulator: real wind + real XGBoost forecast radii
        set((s) => ({
          fireSnapshot: updateSnapshotWithRealData(
            s.fireSnapshot,
            WILDFIRE_INCIDENT.center,
            windDir,
            windSpeed,
            spread.spread_1h_m,
            spread.spread_3h_m
          ),
          realWeather: {
            windDirDeg: windDir,
            windSpeedKph: windSpeed,
            tempC: spread.features_used?.temperature_c ?? 0,
            rhPct: spread.features_used?.relative_humidity_pct ?? 0,
          },
          spreadPrediction: spread,
        }));

        // 2. Get PPO tactical waypoints using the real spread radii
        const choke = await fetchLiveChokePoints(lat, lon, spread.spread_1h_m, spread.spread_3h_m);
        if (choke) {
          set({ chokePoints: choke.waypoints, backendStatus: "loaded" });
        } else {
          set({ backendStatus: "loaded" });
        }
      } else {
        set({ backendStatus: "error" });
      }
    } catch {
      set({ backendStatus: "error" });
    }
  },
}));
