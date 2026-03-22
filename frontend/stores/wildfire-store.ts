import { create } from "zustand";
import {
  CANADA_VIEW,
  PROVINCE_VIEW,
  INCIDENT_VIEW,
  GROUND_CREW_TEAMS,
  FIRE_ACTIONS,
  WILDFIRE_INCIDENT,
} from "@/data/fake-wildfire";
import {
  type FireSnapshot,
  buildInitialSnapshot,
  tickSnapshot,
  updateSnapshotWithRealData,
} from "@/lib/fire-simulator";
import {
  type Waypoint,
  fetchLiveSpreadPrediction,
  fetchLiveChokePoints,
} from "@/lib/api";

const WIND_DIR_DEG: Record<string, number> = {
  N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315,
};

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
export type ResourceType = "ground-crew" | "planned-burn" | "dozer-line";
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

  plannedBurnPoints: [number, number][];
  addPlannedBurnPoint: (point: [number, number]) => void;
  clearPlannedBurnPoints: () => void;

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
}

export const useWildfireStore = create<WildfireState>((set) => ({
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

  plannedBurnPoints: [],
  addPlannedBurnPoint: (point) =>
    set((state) => ({ plannedBurnPoints: [...state.plannedBurnPoints, point] })),
  clearPlannedBurnPoints: () => set({ plannedBurnPoints: [] }),

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
      return {
        groundCrews: state.groundCrews.map((r) =>
          r.id === id ? { ...r, deployedPosition: undefined, status: "standby" } : r
        ),
        fireActions: state.fireActions.map((r) =>
          r.id === id
            ? { ...r, deployedPosition: undefined, status: r.status === "deployed" ? "ready" : r.status }
            : r
        ),
        ...(isBurn ? { plannedBurnPoints: [] } : {}),
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
      plannedBurnPoints: [],
      fireSnapshot: makeInitialSnapshot(),
    }),

  isAiSidebarOpen: true,
  toggleAiSidebar: () => set((s) => ({ isAiSidebarOpen: !s.isAiSidebarOpen })),

  fireSnapshot: makeInitialSnapshot(),
  tickFireSimulation: () =>
    set((s) => ({
      fireSnapshot: tickSnapshot(s.fireSnapshot, WILDFIRE_INCIDENT.center),
    })),
  resetFireSimulation: () => set({ fireSnapshot: makeInitialSnapshot() }),

  chokePoints: [],
  backendStatus: "idle",
  realWeather: null,
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
