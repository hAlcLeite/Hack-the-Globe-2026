import { create } from "zustand";
import {
  CANADA_VIEW,
  PROVINCE_VIEW,
  INCIDENT_VIEW,
  FIRST_RESPONDERS,
  ACTION_ASSETS,
} from "@/data/fake-wildfire";
import { fetchFires, type FireEvent } from "@/lib/api";

export type ViewLevel = "national" | "province" | "incident";
export type ResourceType = "ground-crew" | "air-tanker" | "helicopter" | "heavy-equipment";
export type ResourceStatus = "standby" | "ready" | "deployed";

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  count?: number;
  status: ResourceStatus;
  icon: string;
  assignedLocation?: string;
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

  // ── Live fire data from backend ──────────────────────────────────────────
  fires: FireEvent[];
  firesLoading: boolean;
  firesError: string | null;
  fetchFires: () => Promise<void>;
  selectedFireId: string | null;
  setSelectedFireId: (id: string | null) => void;

  firstResponders: Resource[];
  actionAssets: Resource[];

  selectedResourceId: string | null;
  setSelectedResourceId: (id: string | null) => void;

  deployResource: (id: string, position: [number, number]) => void;
  assignResourceLocation: (id: string, label: string) => void;

  submitted: boolean;
  submittedAt: string | null;
  submit: () => void;
  resetMission: () => void;

  isAiSidebarOpen: boolean;
  isMediaSidebarOpen: boolean;
  toggleAiSidebar: () => void;
  toggleMediaSidebar: () => void;
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

  // ── Fire data ─────────────────────────────────────────────────────────────
  fires: [],
  firesLoading: false,
  firesError: null,
  selectedFireId: null,
  setSelectedFireId: (id) => set({ selectedFireId: id }),
  fetchFires: async () => {
    set({ firesLoading: true, firesError: null });
    try {
      const fires = await fetchFires();
      set({ fires, firesLoading: false });
    } catch {
      set({ firesError: "Failed to load fire data", firesLoading: false });
    }
  },

  firstResponders: FIRST_RESPONDERS.map((r) => ({ ...r })) as Resource[],
  actionAssets: ACTION_ASSETS.map((r) => ({ ...r })) as Resource[],

  selectedResourceId: null,
  setSelectedResourceId: (id) => set({ selectedResourceId: id }),

  deployResource: (id, position) =>
    set((state) => ({
      firstResponders: state.firstResponders.map((r) =>
        r.id === id ? { ...r, deployedPosition: position, status: "deployed" } : r
      ),
      actionAssets: state.actionAssets.map((r) =>
        r.id === id ? { ...r, deployedPosition: position, status: "deployed" } : r
      ),
      selectedResourceId: null,
    })),

  assignResourceLocation: (id, label) =>
    set((state) => ({
      firstResponders: state.firstResponders.map((r) =>
        r.id === id ? { ...r, assignedLocation: label } : r
      ),
      actionAssets: state.actionAssets.map((r) =>
        r.id === id ? { ...r, assignedLocation: label } : r
      ),
    })),

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
      firstResponders: FIRST_RESPONDERS.map((r) => ({ ...r })) as Resource[],
      actionAssets: ACTION_ASSETS.map((r) => ({ ...r })) as Resource[],
      selectedResourceId: null,
    }),

  isAiSidebarOpen: true,
  isMediaSidebarOpen: true,
  toggleAiSidebar: () => set((s) => ({ isAiSidebarOpen: !s.isAiSidebarOpen })),
  toggleMediaSidebar: () => set((s) => ({ isMediaSidebarOpen: !s.isMediaSidebarOpen })),
}));
