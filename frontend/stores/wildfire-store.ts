import { create } from "zustand";
import {
  CANADA_VIEW,
  PROVINCE_VIEW,
  INCIDENT_VIEW,
  GROUND_CREW_TEAMS,
  FIRE_ACTIONS,
} from "@/data/fake-wildfire";

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
    }),

  isAiSidebarOpen: true,
  toggleAiSidebar: () => set((s) => ({ isAiSidebarOpen: !s.isAiSidebarOpen })),
}));
