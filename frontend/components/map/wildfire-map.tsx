"use client";

import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import Map, {
  Source,
  Layer,
  Marker,
  type MapRef,
  type MapMouseEvent,
  type ViewStateChangeEvent,
} from "react-map-gl/maplibre";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ChevronRight, Flame, ZoomIn } from "lucide-react";
import { useWildfireStore } from "@/stores/wildfire-store";
import type { Resource } from "@/stores/wildfire-store";
import { WILDFIRE_INCIDENT, FIREBREAK_ROAD_GEOJSON } from "@/data/fake-wildfire";
import { CANADA_PROVINCE_LABELS_GEOJSON } from "@/data/canada-provinces";
import { cn } from "@/lib/utils";

const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const CANADA_MAX_BOUNDS = [
  [-145, 40],
  [-48, 84],
] as [[number, number], [number, number]];

const ARCGIS_PROVINCES_URL =
  "https://services.arcgis.com/zmLUiqh7X11gGV2d/arcgis/rest/services/Canada_Provinical_boundaries_generalized/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson";

// ---------------------------------------------------------------------------
// Topographic layer specs — reference the existing "carto" vector source so
// no extra network requests are needed. source-layer names come from the
// OpenMapTiles schema used by CartoDB dark-matter.
// ---------------------------------------------------------------------------
const TOPO_LAYERS = [
  // Water bodies (lakes, sea)
  {
    id: "topo-water",
    type: "fill" as const,
    source: "carto",
    "source-layer": "water",
    paint: {
      "fill-color": "#1d4ed8",
      "fill-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.25, 8, 0.5, 14, 0.65],
    },
  },
  // Rivers and streams
  {
    id: "topo-waterway",
    type: "line" as const,
    source: "carto",
    "source-layer": "waterway",
    paint: {
      "line-color": "#2563eb",
      "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.5, 10, 1.5, 14, 3],
      "line-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0, 7, 0.65, 14, 0.9],
    },
  },
  // Forest / woodland (dark green)
  {
    id: "topo-forest",
    type: "fill" as const,
    source: "carto",
    "source-layer": "landcover",
    filter: ["==", ["get", "class"], "wood"],
    paint: {
      "fill-color": "#166534",
      "fill-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.2, 8, 0.4, 14, 0.55],
    },
  },
  // Grassland / meadow (lighter green)
  {
    id: "topo-grass",
    type: "fill" as const,
    source: "carto",
    "source-layer": "landcover",
    filter: ["==", ["get", "class"], "grass"],
    paint: {
      "fill-color": "#15803d",
      "fill-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0, 8, 0.3, 14, 0.45],
    },
  },
  // Parks and nature reserves (olive green)
  {
    id: "topo-parks",
    type: "fill" as const,
    source: "carto",
    "source-layer": "park",
    paint: {
      "fill-color": "#14532d",
      "fill-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0.15, 8, 0.3, 14, 0.45],
    },
  },
  // Major roads — motorway / trunk / primary (yellow)
  {
    id: "topo-roads-major",
    type: "line" as const,
    source: "carto",
    "source-layer": "transportation",
    filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary"]]],
    paint: {
      "line-color": "#ca8a04",
      "line-width": ["interpolate", ["linear"], ["zoom"], 6, 1, 10, 2.5, 14, 5],
      "line-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0, 7, 0.8, 14, 1],
    },
  },
  // Secondary / tertiary roads (amber-brown)
  {
    id: "topo-roads-minor",
    type: "line" as const,
    source: "carto",
    "source-layer": "transportation",
    filter: ["in", ["get", "class"], ["literal", ["secondary", "tertiary", "minor"]]],
    paint: {
      "line-color": "#92400e",
      "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.4, 10, 1, 14, 2],
      "line-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0, 9, 0.7, 14, 1],
    },
  },
];

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function createCircleGeoJSON(center: [number, number], radiusMeters: number, points = 64) {
  const [lng, lat] = center;
  const pts: [number, number][] = [];
  const R = 6371000;
  for (let i = 0; i < points; i++) {
    const angle = (i * 360) / points;
    const bearing = (angle * Math.PI) / 180;
    const lat1 = (lat * Math.PI) / 180;
    const lng1 = (lng * Math.PI) / 180;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(radiusMeters / R) +
        Math.cos(lat1) * Math.sin(radiusMeters / R) * Math.cos(bearing)
    );
    const lng2 =
      lng1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(radiusMeters / R) * Math.cos(lat1),
        Math.cos(radiusMeters / R) - Math.sin(lat1) * Math.sin(lat2)
      );
    pts.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }
  pts.push(pts[0]);
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: { type: "Polygon" as const, coordinates: [pts] },
        properties: {},
      },
    ],
  };
}

const FIRE_CENTER = WILDFIRE_INCIDENT.center;
const FIRE_SPREAD = WILDFIRE_INCIDENT.spread;

const RESOURCE_EMOJI: Record<string, string> = {
  "ground-crew": "👥",
  "planned-burn": "🔥",
  "dozer-line": "🚜",
};

function ResourceMarker({ resource }: { resource: Resource }) {
  const emoji = RESOURCE_EMOJI[resource.type] ?? "📍";
  const isGround = resource.type === "ground-crew";

  return (
    <div className="resource-marker flex flex-col items-center cursor-default group">
      <div
        className={cn(
          "h-9 w-9 border-2 flex items-center justify-center text-base shadow-lg",
          isGround
            ? "bg-yellow-900/80 border-yellow-500"
            : "bg-orange-900/80 border-orange-500"
        )}
      >
        {emoji}
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 bg-zinc-900/95 border border-zinc-700 px-2 py-1 text-[9px] text-white whitespace-nowrap pointer-events-none">
        {resource.name}
      </div>
    </div>
  );
}

function PlacementIndicator({ resource }: { resource: Resource }) {
  const emoji = RESOURCE_EMOJI[resource.type] ?? "📍";
  return (
    <div className="flex flex-col items-center pointer-events-none">
      <div className="h-9 w-9 border-2 border-blue-400 border-dashed bg-blue-900/60 flex items-center justify-center text-base opacity-80 animate-pulse">
        {emoji}
      </div>
      <div className="mt-1 bg-blue-950/90 border border-blue-500/50 px-2 py-1 text-[9px] text-blue-300 whitespace-nowrap">
        {resource.name}
      </div>
    </div>
  );
}

function FireDot({ size = "sm" }: { size?: "sm" | "lg" }) {
  const s = size === "lg" ? 24 : 14;
  const ring = size === "lg" ? 50 : 30;
  return (
    <div className="relative flex items-center justify-center" style={{ width: ring, height: ring }}>
      <div className="absolute rounded-full bg-red-500 opacity-40 fire-ring" style={{ width: ring, height: ring }} />
      <div className="absolute rounded-full bg-red-500 opacity-20 fire-ring" style={{ width: ring * 1.4, height: ring * 1.4, animationDelay: "0.6s" }} />
      <div className="relative rounded-full bg-red-600 border-2 border-red-300 shadow-lg shadow-red-500/50 fire-dot" style={{ width: s, height: s }} />
    </div>
  );
}

function IncidentWarningCard({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className="bg-zinc-950/96 border border-red-500/60 backdrop-blur-sm shadow-xl"
      style={{ minWidth: 210 }}
    >
      <div className="border-b border-red-500/40 px-3 py-1.5 flex items-center gap-2 bg-red-950/30">
        <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />
        <span className="text-[9px] text-red-400 font-semibold uppercase tracking-widest">Active Wildfire</span>
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
      </div>
      <div className="px-3 py-2">
        <div className="text-[10px] text-zinc-400 space-y-0.5">
          <div className="flex justify-between">
            <span>Status</span>
            <span className="text-red-400 font-medium">{WILDFIRE_INCIDENT.status}</span>
          </div>
          <div className="flex justify-between">
            <span>Size</span>
            <span className="text-orange-400">{WILDFIRE_INCIDENT.size.toLocaleString()} ha</span>
          </div>
          <div className="flex justify-between">
            <span>Contained</span>
            <span className="text-amber-400">{WILDFIRE_INCIDENT.containment}%</span>
          </div>
        </div>
        <button
          onClick={onClick}
          className="mt-2.5 w-full flex items-center justify-center gap-1 py-1.5 bg-red-600 hover:bg-red-500 transition-colors text-[10px] font-semibold uppercase tracking-widest text-white"
        >
          <ZoomIn className="h-3 w-3" />
          Open Mission Control
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  );
}

export function WildfireMap() {
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showWarningCard, setShowWarningCard] = useState(false);
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);

  const {
    viewLevel,
    setViewLevel,
    setViewport,
    selectedResourceId,
    deployResource,
    setPlacementMousePos,
    placementMousePos,
    groundCrews,
    fireActions,
    plannedBurnPoints,
    addPlannedBurnPoint,
  } = useWildfireStore();

  const allResources = [...groundCrews, ...fireActions];
  const deployedResources = allResources.filter((r) => r.deployedPosition);
  const selectedResource = selectedResourceId
    ? allResources.find((r) => r.id === selectedResourceId) ?? null
    : null;

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    if (viewLevel === "national") {
      map.flyTo({ center: [-96.0, 60.0], zoom: 3.2, pitch: 0, bearing: 0, duration: 2000 });
      setShowWarningCard(false);
    } else if (viewLevel === "province") {
      map.flyTo({ center: FIRE_CENTER, zoom: 8.5, pitch: 40, bearing: -10, duration: 2200 });
      setTimeout(() => setShowWarningCard(true), 2500);
    } else if (viewLevel === "incident") {
      setShowWarningCard(false);
      map.flyTo({ center: FIRE_CENTER, zoom: 11.5, pitch: 55, bearing: -20, duration: 2500 });
    }
  }, [viewLevel, mapLoaded]);

  // [M] hotkey toggles measure mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "m" || e.key === "M") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setMeasureMode((prev) => !prev);
        setMeasurePoints([]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const measureDistance =
    measurePoints.length === 2
      ? haversineKm(measurePoints[0], measurePoints[1])
      : null;

  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      if (measureMode) {
        const pt: [number, number] = [event.lngLat.lng, event.lngLat.lat];
        setMeasurePoints((prev) => (prev.length >= 2 ? [pt] : [...prev, pt]));
        return;
      }
      if (selectedResourceId && viewLevel === "incident") {
        if (selectedResource?.type === "planned-burn") {
          if (plannedBurnPoints.length === 0) {
            addPlannedBurnPoint([event.lngLat.lng, event.lngLat.lat]);
          } else if (plannedBurnPoints.length === 1) {
            addPlannedBurnPoint([event.lngLat.lng, event.lngLat.lat]);
            deployResource(selectedResourceId, [event.lngLat.lng, event.lngLat.lat]);
          }
          return;
        }
        deployResource(selectedResourceId, [event.lngLat.lng, event.lngLat.lat]);
        return;
      }
      if (viewLevel === "national") {
        const [fireLng, fireLat] = FIRE_CENTER;
        const dist = Math.sqrt(
          Math.pow(event.lngLat.lng - fireLng, 2) + Math.pow(event.lngLat.lat - fireLat, 2)
        );
        if (dist < 2.5) setViewLevel("province");
      }
    },
    [measureMode, selectedResourceId, selectedResource, viewLevel, deployResource, setViewLevel, plannedBurnPoints, addPlannedBurnPoint]
  );

  const mouseRaf = useRef<number | null>(null);
  const moveRaf = useRef<number | null>(null);

  const handleMouseMove = useCallback(
    (event: MapMouseEvent) => {
      if (!(selectedResourceId && viewLevel === "incident")) return;
      if (mouseRaf.current) cancelAnimationFrame(mouseRaf.current);
      const lng = event.lngLat.lng;
      const lat = event.lngLat.lat;
      mouseRaf.current = requestAnimationFrame(() => {
        setPlacementMousePos({ lng, lat });
      });
    },
    [selectedResourceId, viewLevel, setPlacementMousePos]
  );

  const handleMouseLeave = useCallback(() => {
    setPlacementMousePos(null);
  }, [setPlacementMousePos]);

  useEffect(() => {
    return () => {
      if (mouseRaf.current) cancelAnimationFrame(mouseRaf.current);
      if (moveRaf.current) cancelAnimationFrame(moveRaf.current);
    };
  }, []);

  // Memoized GeoJSON — stable references prevent MapLibre from seeing new source data every render
  const fireRing3h = useMemo(() => createCircleGeoJSON(FIRE_CENTER, FIRE_SPREAD.threeHour), []);
  const fireRing1h = useMemo(() => createCircleGeoJSON(FIRE_CENTER, FIRE_SPREAD.oneHour), []);
  const fireCurrent = useMemo(() => createCircleGeoJSON(FIRE_CENTER, FIRE_SPREAD.current), []);

  const burnLineGeoJSON = useMemo(() => {
    if (plannedBurnPoints.length < 2) return null;
    return {
      type: "FeatureCollection" as const,
      features: [{ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: plannedBurnPoints } }],
    };
  }, [plannedBurnPoints]);

  const burnPreviewGeoJSON = useMemo(() => {
    if (plannedBurnPoints.length !== 1 || !placementMousePos || selectedResource?.type !== "planned-burn") return null;
    return {
      type: "FeatureCollection" as const,
      features: [{ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: [plannedBurnPoints[0], [placementMousePos.lng, placementMousePos.lat]] } }],
    };
  }, [plannedBurnPoints, placementMousePos, selectedResource?.type]);

  const measureLineGeoJSON = useMemo(() => {
    if (measurePoints.length !== 2) return null;
    return {
      type: "FeatureCollection" as const,
      features: [{ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: measurePoints } }],
    };
  }, [measurePoints]);

  return (
    <div
      className="relative w-full h-full"
      style={{ cursor: measureMode ? "crosshair" : selectedResourceId ? "crosshair" : "grab" }}
    >
      <Map
        ref={mapRef}
        initialViewState={{ longitude: -96.0, latitude: 60.0, zoom: 3.2, pitch: 0, bearing: 0 }}
        onMove={(evt: ViewStateChangeEvent) => {
          if (moveRaf.current) cancelAnimationFrame(moveRaf.current);
          const vs = evt.viewState;
          moveRaf.current = requestAnimationFrame(() =>
            setViewport({ longitude: vs.longitude, latitude: vs.latitude, zoom: vs.zoom, pitch: vs.pitch, bearing: vs.bearing })
          );
        }}
        onClick={handleMapClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onLoad={() => setMapLoaded(true)}
        mapStyle={DARK_STYLE}
        maxBounds={CANADA_MAX_BOUNDS}
        style={{ width: "100%", height: "100%" }}
        antialias={true}
        attributionControl={false}
      >
        {/* Topographic layers — vegetation, water, roads (carto source, no extra requests) */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {mapLoaded && TOPO_LAYERS.map((spec) => <Layer key={spec.id} {...(spec as any)} />)}

        {/* Province boundaries from ArcGIS + reliable hand-coded label centroids */}
        {mapLoaded && viewLevel !== "incident" && (
          <>
            <Source id="arcgis-provinces" type="geojson" data={ARCGIS_PROVINCES_URL}>
              <Layer
                id="canada-outline-glow"
                type="line"
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{
                  "line-color": "#ffffff",
                  "line-width": [
                    "interpolate", ["linear"], ["zoom"],
                    3, 4, 6, 6, 8, 10, 10, 14,
                  ],
                  "line-blur": [
                    "interpolate", ["linear"], ["zoom"],
                    3, 3, 6, 5, 8, 8, 10, 10,
                  ],
                  "line-opacity": 0.35,
                }}
              />
              <Layer
                id="canada-outline-main"
                type="line"
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{
                  "line-color": "#ffffff",
                  "line-width": [
                    "interpolate", ["linear"], ["zoom"],
                    3, 0.8, 6, 1.2, 8, 2, 10, 2.5,
                  ],
                  "line-opacity": 0.9,
                }}
              />
            </Source>

            {/* Province name labels — hand-coded centroids so field names are known */}
            <Source id="province-label-points" type="geojson" data={CANADA_PROVINCE_LABELS_GEOJSON}>
              <Layer
                id="province-labels"
                type="symbol"
                layout={{
                  "symbol-placement": "point",
                  "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
                  "text-size": [
                    "interpolate", ["linear"], ["zoom"],
                    3, 9, 5, 11, 8, 13, 10, 15,
                  ],
                  "text-letter-spacing": 0.06,
                  "text-allow-overlap": false,
                  "text-max-width": 8,
                  "text-pitch-alignment": "viewport",
                  "text-field": [
                    "case",
                    ["==", ["get", "name"], "British Columbia"],    "British Columbia",
                    ["==", ["get", "name"], "Alberta"],              "Alberta",
                    ["==", ["get", "name"], "Saskatchewan"],         "Saskatchewan",
                    ["==", ["get", "name"], "Manitoba"],             "Manitoba",
                    ["==", ["get", "name"], "Ontario"],              "Ontario",
                    ["==", ["get", "name"], "Quebec"],               "Québec",
                    ["==", ["get", "name"], "New Brunswick"],        "New Brunswick",
                    ["==", ["get", "name"], "Nova Scotia"],          "Nova Scotia",
                    ["==", ["get", "name"], "Prince Edward Island"], "Prince Edward Island",
                    ["==", ["get", "name"], "Newfoundland and Labrador"], "Newfoundland & Labrador",
                    ["==", ["get", "name"], "Yukon"],                "Yukon",
                    ["==", ["get", "name"], "Northwest Territories"],"NW Territories",
                    ["==", ["get", "name"], "Nunavut"],              "Nunavut",
                    ["get", "name"]
                  ],
                }}
                paint={{
                  "text-color": "#dbeafe",
                  "text-halo-color": "rgba(15, 23, 42, 0.95)",
                  "text-halo-width": 1.5,
                  "text-opacity": [
                    "interpolate", ["linear"], ["zoom"],
                    3, 0.5, 5, 0.8, 8, 1,
                  ],
                }}
              />
            </Source>
          </>
        )}

        {/* Measure line */}
        {measureLineGeoJSON && (
          <Source
            id="measure-line"
            type="geojson"
            data={measureLineGeoJSON}
          >
            <Layer
              id="measure-line-layer"
              type="line"
              paint={{
                "line-color": "#facc15",
                "line-width": 2,
                "line-dasharray": [4, 3],
                "line-opacity": 0.9,
              }}
            />
          </Source>
        )}

        {/* Measure point markers */}
        {measurePoints.map((pt, i) => (
          <Marker key={i} longitude={pt[0]} latitude={pt[1]} anchor="center">
            <div className="h-3 w-3 rounded-full bg-yellow-400 border-2 border-yellow-200 shadow shadow-yellow-400/50" />
          </Marker>
        ))}

        {/* Firebreak road — incident view */}
        {mapLoaded && viewLevel === "incident" && (
          <Source id="firebreak-road" type="geojson" data={FIREBREAK_ROAD_GEOJSON}>
            <Layer
              id="firebreak-road-glow"
              type="line"
              paint={{
                "line-color": "#78716c",
                "line-width": 6,
                "line-blur": 4,
                "line-opacity": 0.3,
              }}
            />
            <Layer
              id="firebreak-road-line"
              type="line"
              paint={{
                "line-color": "#a8a29e",
                "line-width": 1.5,
                "line-dasharray": [5, 3],
                "line-opacity": 0.6,
              }}
            />
          </Source>
        )}

        {/* Fire spread rings — incident view */}
        {viewLevel === "incident" && (
          <>
            <Source id="fire-ring-3h" type="geojson" data={fireRing3h}>
              <Layer id="fire-ring-3h-fill" type="fill" paint={{ "fill-color": "#d97706", "fill-opacity": 0.07 }} />
              <Layer id="fire-ring-3h-line" type="line" paint={{ "line-color": "#d97706", "line-width": 1.5, "line-dasharray": [4, 3], "line-opacity": 0.7 }} />
            </Source>
            <Source id="fire-ring-1h" type="geojson" data={fireRing1h}>
              <Layer id="fire-ring-1h-fill" type="fill" paint={{ "fill-color": "#f97316", "fill-opacity": 0.11 }} />
              <Layer id="fire-ring-1h-line" type="line" paint={{ "line-color": "#f97316", "line-width": 2, "line-dasharray": [3, 2], "line-opacity": 0.85 }} />
            </Source>
            <Source id="fire-current" type="geojson" data={fireCurrent}>
              <Layer id="fire-current-fill" type="fill" paint={{ "fill-color": "#ef4444", "fill-opacity": 0.22 }} />
              <Layer id="fire-current-line" type="line" paint={{ "line-color": "#ef4444", "line-width": 2.5, "line-opacity": 1 }} />
            </Source>
          </>
        )}

        {/* Planned burn line — completed */}
        {viewLevel === "incident" && burnLineGeoJSON && (
          <Source id="planned-burn-line" type="geojson" data={burnLineGeoJSON}>
            <Layer
              id="planned-burn-line-glow"
              type="line"
              paint={{ "line-color": "#f97316", "line-width": 8, "line-blur": 6, "line-opacity": 0.3 }}
            />
            <Layer
              id="planned-burn-line-main"
              type="line"
              paint={{ "line-color": "#fb923c", "line-width": 3, "line-dasharray": [4, 2], "line-opacity": 0.95 }}
            />
          </Source>
        )}

        {/* Planned burn line — preview while drawing */}
        {viewLevel === "incident" && burnPreviewGeoJSON && (
          <Source id="planned-burn-preview" type="geojson" data={burnPreviewGeoJSON}>
            <Layer
              id="planned-burn-preview-line"
              type="line"
              paint={{ "line-color": "#f97316", "line-width": 2, "line-dasharray": [3, 3], "line-opacity": 0.55 }}
            />
          </Source>
        )}

        {/* Planned burn anchor point (first click) */}
        {viewLevel === "incident" && plannedBurnPoints.length >= 1 && (
          <Marker longitude={plannedBurnPoints[0][0]} latitude={plannedBurnPoints[0][1]} anchor="center">
            <div className="h-3 w-3 rounded-full bg-orange-500 border-2 border-orange-300 shadow shadow-orange-500/50" />
          </Marker>
        )}

        {/* Fire dot — national & province */}
        {(viewLevel === "national" || viewLevel === "province") && (
          <Marker longitude={FIRE_CENTER[0]} latitude={FIRE_CENTER[1]} anchor="center">
            <div
              className="cursor-pointer"
              onClick={() => {
                if (viewLevel === "national") setViewLevel("province");
                else setViewLevel("incident");
              }}
            >
              <FireDot size={viewLevel === "province" ? "lg" : "sm"} />
            </div>
          </Marker>
        )}

        {/* Fire center dot — incident */}
        {viewLevel === "incident" && (
          <Marker longitude={FIRE_CENTER[0]} latitude={FIRE_CENTER[1]} anchor="center">
            <div className="h-5 w-5 rounded-full bg-red-600 border-2 border-red-300 shadow-lg shadow-red-500/60 fire-dot" />
          </Marker>
        )}

        {/* Province view: warning popup */}
        {viewLevel === "province" && (
          <Marker longitude={FIRE_CENTER[0]} latitude={FIRE_CENTER[1] + 0.08} anchor="bottom">
            <AnimatePresence>
              {showWarningCard && (
                <IncidentWarningCard onClick={() => setViewLevel("incident")} />
              )}
            </AnimatePresence>
          </Marker>
        )}

        {/* Deployed resource markers (not planned burn — shown as line) */}
        {viewLevel === "incident" &&
          deployedResources
            .filter((r) => r.type !== "planned-burn")
            .map((r) =>
              r.deployedPosition ? (
                <Marker key={r.id} longitude={r.deployedPosition[0]} latitude={r.deployedPosition[1]} anchor="bottom">
                  <ResourceMarker resource={r} />
                </Marker>
              ) : null
            )}

        {/* Ghost placement indicator follows mouse (point placements only) */}
        {viewLevel === "incident" &&
          selectedResource &&
          selectedResource.type !== "planned-burn" &&
          placementMousePos && (
            <Marker longitude={placementMousePos.lng} latitude={placementMousePos.lat} anchor="bottom">
              <PlacementIndicator resource={selectedResource} />
            </Marker>
          )}
      </Map>

      {/* HUD: view level indicator — province and incident only */}
      {viewLevel !== "national" && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <motion.div
            key={viewLevel}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-zinc-950/80 border border-zinc-800 backdrop-blur-sm px-4 py-1.5 flex items-center gap-3"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest">
              {viewLevel === "province" && "British Columbia — Cariboo Plateau Region"}
              {viewLevel === "incident" && "Mission Control · BC Wildfire"}
            </span>
            {viewLevel === "incident" && (
              <span className="flex items-center gap-1 text-[10px] text-red-400">
                <Flame className="h-3 w-3" />
                Out of Control
              </span>
            )}
          </motion.div>
        </div>
      )}

      {/* Spread legend */}
      {viewLevel === "incident" && (
        <div className="absolute bottom-28 right-4 z-10 pointer-events-none">
          <div className="bg-zinc-950/80 border border-zinc-800 backdrop-blur-sm px-3 py-2 space-y-1.5">
            <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">Fire Spread</div>
            {[
              { color: "bg-red-500", label: "Current perimeter" },
              { color: "bg-orange-500", label: "+1 hour forecast" },
              { color: "bg-amber-600", label: "+3 hour forecast" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className={cn("h-2 w-4 opacity-80", color)} />
                <span className="text-[9px] text-zinc-400">{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-1 pt-1 border-t border-zinc-800">
              <div className="h-px w-4 border-t-2 border-dashed border-stone-400 opacity-60" />
              <span className="text-[9px] text-zinc-500">Likely FSR firebreak</span>
            </div>
            <div className={cn(
              "flex items-center gap-2 mt-1 pt-1 border-t border-zinc-800 pointer-events-auto cursor-pointer select-none",
              measureMode ? "opacity-100" : "opacity-60 hover:opacity-100"
            )}
              onClick={() => { setMeasureMode(m => !m); setMeasurePoints([]); }}
            >
              <kbd className="text-[8px] bg-zinc-800 border border-zinc-700 px-1 rounded text-zinc-400">M</kbd>
              <span className={cn("text-[9px]", measureMode ? "text-yellow-400" : "text-zinc-500")}>
                {measureMode
                  ? measureDistance !== null
                    ? `${measureDistance.toFixed(1)} km`
                    : "Click two points"
                  : "Measure distance"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
