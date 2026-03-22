"use client";

import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import Map, {
  Source,
  Layer,
  Marker,
  type MapRef,
  type MapMouseEvent,
  type ViewStateChangeEvent,
} from "react-map-gl/mapbox";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ChevronRight, Flame, ZoomIn } from "lucide-react";
import { useWildfireStore } from "@/stores/wildfire-store";
import type { Resource } from "@/stores/wildfire-store";
import type { Waypoint } from "@/lib/api";
import { WILDFIRE_INCIDENT, FIREBREAK_ROAD_GEOJSON } from "@/data/fake-wildfire";
import { CANADA_PROVINCE_LABELS_GEOJSON } from "@/data/canada-provinces";
import { cn } from "@/lib/utils";

const DARK_STYLE = "mapbox://styles/mapbox/dark-v11";
const SATELLITE_STYLE = "mapbox://styles/mapbox/satellite-streets-v12";
const CANADA_MAX_BOUNDS = [
  [-145, 40],
  [-48, 84],
] as [[number, number], [number, number]];

const ARCGIS_PROVINCES_URL =
  "https://services.arcgis.com/zmLUiqh7X11gGV2d/arcgis/rest/services/Canada_Provinical_boundaries_generalized/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson";

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

const FIRE_CENTER = WILDFIRE_INCIDENT.center;

const RESOURCE_EMOJI: Record<string, string> = {
  "ground-crew": "👥",
  "planned-burn": "🔥",
  "dozer-line": "🚜",
  "air-tanker": "✈️",
};

const PRIORITY_RING: Record<string, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#f59e0b",
  LOW: "#6b7280",
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

function SuggestionZoneMarker({
  rec,
  isFocused,
}: {
  rec: import("@/stores/wildfire-store").AiRecommendation;
  isFocused: boolean;
}) {
  const color = PRIORITY_RING[rec.priority] ?? "#6b7280";
  const emoji = RESOURCE_EMOJI[rec.resource_type ?? "ground-crew"] ?? "📍";
  const size = isFocused ? 52 : 40;

  return (
    <div className="flex flex-col items-center group cursor-default" style={{ width: size, height: size }}>
      {/* Pulsing ring */}
      <div
        className="absolute rounded-full animate-ping opacity-30"
        style={{ width: size, height: size, border: `2px solid ${color}` }}
      />
      <div
        className="relative rounded-full flex items-center justify-center text-sm shadow-xl"
        style={{
          width: size,
          height: size,
          border: `2px solid ${color}`,
          background: `${color}22`,
          boxShadow: `0 0 16px ${color}55`,
        }}
      >
        {emoji}
      </div>
      {/* Label on focus */}
      {isFocused && (
        <div className="mt-1 bg-zinc-900/95 border border-zinc-700 px-2 py-1 text-[9px] text-white whitespace-nowrap shadow-xl max-w-[160px] text-center leading-tight">
          {rec.title}
        </div>
      )}
    </div>
  );
}

function WaypointMarker({ waypoint }: { waypoint: Waypoint }) {
  const isAir = waypoint.asset_type === "helicopter";
  return (
    <div className="flex flex-col items-center cursor-default group">
      <div
        className={cn(
          "h-8 w-8 rounded-full border-2 flex items-center justify-center text-sm shadow-lg relative",
          isAir
            ? "bg-blue-900/80 border-blue-400 shadow-blue-500/30"
            : "bg-yellow-900/80 border-yellow-400 shadow-yellow-500/30"
        )}
      >
        {isAir ? "🚁" : "🪖"}
        {/* PPO confidence ring */}
        <div
          className={cn(
            "absolute inset-0 rounded-full border-2 animate-ping opacity-30",
            isAir ? "border-blue-400" : "border-yellow-400"
          )}
        />
      </div>
      {/* Tooltip on hover */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1.5 bg-zinc-900/95 border border-zinc-700 px-2 py-1.5 text-[8px] text-zinc-300 whitespace-nowrap pointer-events-none max-w-[180px] space-y-0.5 shadow-xl">
        <div className={cn("font-semibold", isAir ? "text-blue-400" : "text-yellow-400")}>
          {isAir ? "Helicopter" : "Ground Crew"} · {waypoint.direction ?? "AI"}
        </div>
        <div className="text-zinc-400 leading-tight">{waypoint.rationale}</div>
        <div className="text-zinc-600">
          {waypoint.source === "ppo_agent" ? "PPO agent" : "Greedy heuristic"} ·{" "}
          score {waypoint.score.toFixed(2)}
        </div>
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
    setSelectedResourceId,
    deployResource,
    removeDeployment,
    setPlacementMousePos,
    placementMousePos,
    groundCrews,
    fireActions,
    activeBurnLine,
    addActiveBurnPoint,
    commitBurnLine,
    deployedBurnLines,
    fireSnapshot,
    tickFireSimulation,
    chokePoints,
    backendStatus,
    fetchBackendData,
    aiRecommendations,
    focusedRecommendationIndex,
  } = useWildfireStore();

  const allResources = [...groundCrews, ...fireActions];
  const deployedResources = allResources.filter((r) => r.deployedPosition);
  const selectedResource = selectedResourceId
    ? allResources.find((r) => r.id === selectedResourceId) ?? null
    : null;

  // Fly to the right view when viewLevel changes
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
      map.flyTo({ center: FIRE_CENTER, zoom: 13, pitch: 60, bearing: -20, duration: 2500 });
    }
  }, [viewLevel, mapLoaded]);

  // Globe (national/province) ↔ Mercator (incident) — custom WebGL layers need Mercator
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const mb = (mapRef.current as any)?.getMap?.();
    if (!mb) return;
    mb.setProjection({ name: viewLevel === "incident" ? "mercator" : "globe" });
  }, [viewLevel, mapLoaded]);

  // Tick fire simulation every 3s while in incident view
  useEffect(() => {
    if (viewLevel !== "incident") return;
    const id = setInterval(tickFireSimulation, 1000);
    return () => clearInterval(id);
  }, [viewLevel, tickFireSimulation]);

  // Fetch real spread + choke points once when entering incident view
  useEffect(() => {
    if (viewLevel === "incident" && backendStatus === "idle") {
      fetchBackendData();
    }
  }, [viewLevel, backendStatus, fetchBackendData]);

  // Fly to a focused AI recommendation's coordinates
  useEffect(() => {
    if (focusedRecommendationIndex === null || !mapRef.current || !mapLoaded) return;
    const rec = aiRecommendations?.[focusedRecommendationIndex];
    if (!rec || typeof rec.lat !== "number" || typeof rec.lon !== "number") return;
    mapRef.current.flyTo({
      center: [rec.lon, rec.lat],
      zoom: 13.5,
      pitch: 55,
      bearing: -20,
      duration: 1200,
    });
  }, [focusedRecommendationIndex, aiRecommendations, mapLoaded]);

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
          const pt: [number, number] = [event.lngLat.lng, event.lngLat.lat];
          if (activeBurnLine.length === 0) {
            addActiveBurnPoint(pt);
          } else {
            // Second click: add point and commit the line — stays selectable for another
            addActiveBurnPoint(pt);
            commitBurnLine();
            setSelectedResourceId(null);
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
    [measureMode, selectedResourceId, selectedResource, viewLevel, deployResource, setViewLevel, activeBurnLine, addActiveBurnPoint, commitBurnLine, setSelectedResourceId]
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

  // Active (in-progress) burn line GeoJSON
  const activeBurnLineGeoJSON = useMemo(() => {
    if (activeBurnLine.length < 2) return null;
    return {
      type: "FeatureCollection" as const,
      features: [{ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: activeBurnLine } }],
    };
  }, [activeBurnLine]);

  // All committed burn lines GeoJSON (as a MultiLineString for efficiency)
  const deployedBurnLinesGeoJSON = useMemo(() => {
    if (deployedBurnLines.length === 0) return null;
    return {
      type: "FeatureCollection" as const,
      features: deployedBurnLines.map((line, i) => ({
        type: "Feature" as const,
        properties: { id: i },
        geometry: { type: "LineString" as const, coordinates: line },
      })),
    };
  }, [deployedBurnLines]);

  const burnPreviewGeoJSON = useMemo(() => {
    if (activeBurnLine.length !== 1 || !placementMousePos || selectedResource?.type !== "planned-burn") return null;
    return {
      type: "FeatureCollection" as const,
      features: [{ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: [activeBurnLine[0], [placementMousePos.lng, placementMousePos.lat]] } }],
    };
  }, [activeBurnLine, placementMousePos, selectedResource?.type]);

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
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
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
        onLoad={() => {
          setMapLoaded(true);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mb = (mapRef.current as any)?.getMap();
          if (!mb) return;

          mb.setProjection({ name: "globe" });
          mb.setFog({
            color: "rgb(180, 210, 240)",
            "high-color": "rgb(30, 80, 200)",
            "horizon-blend": 0.04,
            "space-color": "rgb(6, 8, 20)",
            "star-intensity": 0.5,
          });

          const applyTerrain = () => {
            if (!mb.getSource("mapbox-dem")) {
              mb.addSource("mapbox-dem", {
                type: "raster-dem",
                url: "mapbox://mapbox.mapbox-terrain-dem-v1",
                tileSize: 512,
                maxzoom: 14,
              });
            }
            mb.setTerrain({ source: "mapbox-dem", exaggeration: 1.4 });
          };

          mb.on("style.load", applyTerrain);
          applyTerrain();
        }}
        mapStyle={viewLevel === "national" ? DARK_STYLE : SATELLITE_STYLE}
        maxBounds={CANADA_MAX_BOUNDS}
        style={{ width: "100%", height: "100%" }}
        antialias={true}
        attributionControl={false}
      >
        {/* ── 3-D buildings (non-national only) ── */}
        {mapLoaded && viewLevel !== "national" && (
          <Layer
            id="3d-buildings"
            source="composite"
            source-layer="building"
            filter={["==", "extrude", "true"]}
            type="fill-extrusion"
            minzoom={14}
            paint={{
              "fill-extrusion-color": [
                "interpolate", ["linear"], ["get", "height"],
                0, "#4b5563", 20, "#6b7280", 50, "#9ca3af", 100, "#d1d5db",
              ],
              "fill-extrusion-height": ["get", "height"],
              "fill-extrusion-base": ["get", "min_height"],
              "fill-extrusion-opacity": 0.85,
              "fill-extrusion-vertical-gradient": true,
              "fill-extrusion-ambient-occlusion-intensity": 0.4,
              "fill-extrusion-ambient-occlusion-radius": 3,
            }}
          />
        )}

        {/* ── Province outlines + labels (national + province) ── */}
        {mapLoaded && viewLevel !== "incident" && (
          <>
            <Source id="arcgis-provinces" type="geojson" data={ARCGIS_PROVINCES_URL}>
              <Layer
                id="canada-outline-glow"
                type="line"
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{
                  "line-color": "#ffffff",
                  "line-width": ["interpolate", ["linear"], ["zoom"], 3, 4, 6, 6, 8, 10, 10, 14],
                  "line-blur": ["interpolate", ["linear"], ["zoom"], 3, 3, 6, 5, 8, 8, 10, 10],
                  "line-opacity": 0.35,
                }}
              />
              <Layer
                id="canada-outline-main"
                type="line"
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{
                  "line-color": "#ffffff",
                  "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.8, 6, 1.2, 8, 2, 10, 2.5],
                  "line-opacity": 0.9,
                }}
              />
            </Source>

            <Source id="province-label-points" type="geojson" data={CANADA_PROVINCE_LABELS_GEOJSON}>
              <Layer
                id="province-labels"
                type="symbol"
                layout={{
                  "symbol-placement": "point",
                  "text-font": ["Open Sans SemiBold", "Arial Unicode MS Bold"],
                  "text-size": ["interpolate", ["linear"], ["zoom"], 3, 9, 5, 11, 8, 13, 10, 15],
                  "text-letter-spacing": 0.06,
                  "text-allow-overlap": false,
                  "text-max-width": 8,
                  "text-pitch-alignment": "viewport",
                  "text-field": [
                    "case",
                    ["==", ["get", "name"], "British Columbia"], "British Columbia",
                    ["==", ["get", "name"], "Alberta"], "Alberta",
                    ["==", ["get", "name"], "Saskatchewan"], "Saskatchewan",
                    ["==", ["get", "name"], "Manitoba"], "Manitoba",
                    ["==", ["get", "name"], "Ontario"], "Ontario",
                    ["==", ["get", "name"], "Quebec"], "Québec",
                    ["==", ["get", "name"], "New Brunswick"], "New Brunswick",
                    ["==", ["get", "name"], "Nova Scotia"], "Nova Scotia",
                    ["==", ["get", "name"], "Prince Edward Island"], "Prince Edward Island",
                    ["==", ["get", "name"], "Newfoundland and Labrador"], "Newfoundland & Labrador",
                    ["==", ["get", "name"], "Yukon"], "Yukon",
                    ["==", ["get", "name"], "Northwest Territories"], "NW Territories",
                    ["==", ["get", "name"], "Nunavut"], "Nunavut",
                    ["get", "name"],
                  ],
                }}
                paint={{
                  "text-color": "#dbeafe",
                  "text-halo-color": "rgba(15, 23, 42, 0.95)",
                  "text-halo-width": 1.5,
                  "text-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.5, 5, 0.8, 8, 1],
                }}
              />
            </Source>
          </>
        )}

        {/* ── Measure tool ── */}
        {measureLineGeoJSON && (
          <Source id="measure-line" type="geojson" data={measureLineGeoJSON}>
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
        {measurePoints.map((pt, i) => (
          <Marker key={i} longitude={pt[0]} latitude={pt[1]} anchor="center">
            <div className="h-3 w-3 rounded-full bg-yellow-400 border-2 border-yellow-200 shadow shadow-yellow-400/50" />
          </Marker>
        ))}

        {/* ── FSR firebreak road (incident only) ── */}
        {mapLoaded && viewLevel === "incident" && (
          <Source id="firebreak-road" type="geojson" data={FIREBREAK_ROAD_GEOJSON}>
            <Layer id="firebreak-road-glow" type="line" paint={{ "line-color": "#78716c", "line-width": 6, "line-blur": 4, "line-opacity": 0.3 }} />
            <Layer id="firebreak-road-line" type="line" paint={{ "line-color": "#a8a29e", "line-width": 1.5, "line-dasharray": [5, 3], "line-opacity": 0.6 }} />
          </Source>
        )}

        {/* ══════════════════════════════════════════════
            FIRE LAYER STACK (incident view)
            Bottom → Top:
              1. Burn scar fill
              2. 3h forecast fill + line
              3. 1h forecast fill + line
              4. Active perimeter fill + edge line
              5. Hotspots
            ══════════════════════════════════════════════ */}
        {viewLevel === "incident" && (
          <>
            {/* 1 · Burn scar — dark charcoal, soft edges */}
            <Source id="burn-scar" type="geojson" data={fireSnapshot.burnScar}>
              <Layer
                id="burn-scar-fill"
                type="fill"
                paint={{ "fill-color": "#1c1209", "fill-opacity": 0.65 }}
              />
              <Layer
                id="burn-scar-line"
                type="line"
                paint={{ "line-color": "#3b2512", "line-width": 1.5, "line-opacity": 0.5 }}
              />
            </Source>

            {/* 2 · 3h forecast — faint amber shell */}
            <Source id="fire-forecast-3h" type="geojson" data={fireSnapshot.forecast3h}>
              <Layer
                id="fire-forecast-3h-fill"
                type="fill"
                paint={{ "fill-color": "#78350f", "fill-opacity": 0.12 }}
              />
              <Layer
                id="fire-forecast-3h-line"
                type="line"
                paint={{
                  "line-color": "#d97706",
                  "line-width": 1.5,
                  "line-dasharray": [5, 4],
                  "line-opacity": 0.6,
                }}
              />
            </Source>

            {/* 3 · 1h forecast — slightly stronger orange shell */}
            <Source id="fire-forecast-1h" type="geojson" data={fireSnapshot.forecast1h}>
              <Layer
                id="fire-forecast-1h-fill"
                type="fill"
                paint={{ "fill-color": "#c2410c", "fill-opacity": 0.16 }}
              />
              <Layer
                id="fire-forecast-1h-line"
                type="line"
                paint={{
                  "line-color": "#f97316",
                  "line-width": 2,
                  "line-dasharray": [3, 3],
                  "line-opacity": 0.8,
                }}
              />
            </Source>

            {/* 4 · Active perimeter — bright fill + solid glowing edge */}
            <Source id="fire-current" type="geojson" data={fireSnapshot.perimeter}>
              <Layer
                id="fire-current-fill"
                type="fill"
                paint={{ "fill-color": "#ff5a1f", "fill-opacity": 0.22 }}
              />
              {/* Glow halo */}
              <Layer
                id="fire-current-glow"
                type="line"
                paint={{
                  "line-color": "#ff5a1f",
                  "line-width": 8,
                  "line-blur": 6,
                  "line-opacity": 0.35,
                }}
              />
              {/* Crisp edge */}
              <Layer
                id="fire-current-line"
                type="line"
                paint={{
                  "line-color": "#ffb347",
                  "line-width": 2.5,
                  "line-opacity": 0.95,
                }}
              />
            </Source>

            {/* 5 · Hotspots — individual heat points */}
            <Source id="hotspots" type="geojson" data={fireSnapshot.hotspots}>
              <Layer
                id="hotspots-glow"
                type="circle"
                paint={{
                  "circle-radius": 9,
                  "circle-color": "#ff3b00",
                  "circle-blur": 0.6,
                  "circle-opacity": 0.3,
                }}
              />
              <Layer
                id="hotspots-core"
                type="circle"
                paint={{
                  "circle-radius": 4,
                  "circle-color": "#ff6b35",
                  "circle-opacity": 0.85,
                }}
              />
            </Source>
          </>
        )}

        {/* ── Committed burn barriers ── */}
        {viewLevel === "incident" && deployedBurnLinesGeoJSON && (
          <Source id="deployed-burn-lines" type="geojson" data={deployedBurnLinesGeoJSON}>
            <Layer id="deployed-burn-glow" type="line" paint={{ "line-color": "#ef4444", "line-width": 10, "line-blur": 8, "line-opacity": 0.25 }} />
            <Layer id="deployed-burn-main" type="line" paint={{ "line-color": "#fb923c", "line-width": 3, "line-dasharray": [4, 2], "line-opacity": 0.95 }} />
          </Source>
        )}
        {/* ── Active (in-progress) burn line ── */}
        {viewLevel === "incident" && activeBurnLineGeoJSON && (
          <Source id="active-burn-line" type="geojson" data={activeBurnLineGeoJSON}>
            <Layer id="active-burn-line-glow" type="line" paint={{ "line-color": "#f97316", "line-width": 8, "line-blur": 6, "line-opacity": 0.3 }} />
            <Layer id="active-burn-line-main" type="line" paint={{ "line-color": "#fb923c", "line-width": 3, "line-dasharray": [4, 2], "line-opacity": 0.9 }} />
          </Source>
        )}
        {viewLevel === "incident" && burnPreviewGeoJSON && (
          <Source id="planned-burn-preview" type="geojson" data={burnPreviewGeoJSON}>
            <Layer id="planned-burn-preview-line" type="line" paint={{ "line-color": "#f97316", "line-width": 2, "line-dasharray": [3, 3], "line-opacity": 0.55 }} />
          </Source>
        )}
        {viewLevel === "incident" && activeBurnLine.length >= 1 && (
          <Marker longitude={activeBurnLine[0][0]} latitude={activeBurnLine[0][1]} anchor="center">
            <div className="h-3 w-3 rounded-full bg-orange-500 border-2 border-orange-300 shadow shadow-orange-500/50" />
          </Marker>
        )}

        {/* ── Fire dot markers (national + province views) ── */}
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

        {viewLevel === "incident" && (
          <Marker longitude={FIRE_CENTER[0]} latitude={FIRE_CENTER[1]} anchor="center">
            <div className="h-5 w-5 rounded-full bg-red-600 border-2 border-red-300 shadow-lg shadow-red-500/60 fire-dot" />
          </Marker>
        )}

        {viewLevel === "province" && (
          <Marker longitude={FIRE_CENTER[0]} latitude={FIRE_CENTER[1] + 0.08} anchor="bottom">
            <AnimatePresence>
              {showWarningCard && (
                <IncidentWarningCard onClick={() => setViewLevel("incident")} />
              )}
            </AnimatePresence>
          </Marker>
        )}

        {/* ── Deployed resource markers — click to redeploy ── */}
        {viewLevel === "incident" &&
          deployedResources
            .filter((r) => r.type !== "planned-burn")
            .map((r) =>
              r.deployedPosition ? (
                <Marker key={r.id} longitude={r.deployedPosition[0]} latitude={r.deployedPosition[1]} anchor="bottom">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDeployment(r.id);
                      setSelectedResourceId(r.id);
                    }}
                    title="Click to redeploy"
                    className="cursor-pointer"
                  >
                    <ResourceMarker resource={r} />
                  </div>
                </Marker>
              ) : null
            )}

        {viewLevel === "incident" &&
          selectedResource &&
          selectedResource.type !== "planned-burn" &&
          placementMousePos && (
            <Marker longitude={placementMousePos.lng} latitude={placementMousePos.lat} anchor="bottom">
              <PlacementIndicator resource={selectedResource} />
            </Marker>
          )}

        {/* ── AI recommendation suggestion zones ── */}
        {viewLevel === "incident" &&
          aiRecommendations?.map((rec, i) => {
            if (typeof rec.lat !== "number" || typeof rec.lon !== "number") return null;
            // Validate coordinates are within BC bounds
            if (rec.lat < 49 || rec.lat > 60 || rec.lon < -140 || rec.lon > -114) return null;
            return (
              <Marker key={`ai-${i}`} longitude={rec.lon} latitude={rec.lat} anchor="center">
                <SuggestionZoneMarker rec={rec} isFocused={focusedRecommendationIndex === i} />
              </Marker>
            );
          })}

        {/* ── PPO / AI tactical waypoints ── */}
        {viewLevel === "incident" &&
          chokePoints.map((wp, i) => (
            <Marker key={i} longitude={wp.longitude} latitude={wp.latitude} anchor="bottom">
              <WaypointMarker waypoint={wp} />
            </Marker>
          ))}
      </Map>

      {/* ── Breadcrumb banner ── */}
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

      {/* ── Legend (incident view) ── */}
      {viewLevel === "incident" && (
        <div className="absolute bottom-28 right-4 z-10 pointer-events-none">
          <div className="bg-zinc-950/80 border border-zinc-800 backdrop-blur-sm px-3 py-2 space-y-1.5">
            <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">Fire Layers</div>

            {/* Burn scar */}
            <div className="flex items-center gap-2">
              <div className="h-2 w-4 bg-[#1c1209] border border-[#3b2512] opacity-90" />
              <span className="text-[9px] text-zinc-400">Burn scar</span>
            </div>

            {/* Active perimeter */}
            <div className="flex items-center gap-2">
              <div className="h-2 w-4 bg-[#ff5a1f] opacity-80" />
              <span className="text-[9px] text-zinc-400">Active perimeter</span>
            </div>

            {/* Forecasts */}
            <div className="flex items-center gap-2">
              <div className="h-px w-4 border-t-2 border-dashed border-orange-500 opacity-80" />
              <span className="text-[9px] text-zinc-400">+1 hr forecast</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-px w-4 border-t-2 border-dashed border-amber-600 opacity-70" />
              <span className="text-[9px] text-zinc-400">+3 hr forecast</span>
            </div>

            {/* Hotspots */}
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-[#ff6b35] opacity-85" />
              <span className="text-[9px] text-zinc-400">Hotspots</span>
            </div>

            {/* Firebreak */}
            <div className="flex items-center gap-2 mt-1 pt-1 border-t border-zinc-800">
              <div className="h-px w-4 border-t-2 border-dashed border-stone-400 opacity-60" />
              <span className="text-[9px] text-zinc-500">Likely FSR firebreak</span>
            </div>

            {/* Backend data status */}
            <div className="flex items-center gap-2 mt-1 pt-1 border-t border-zinc-800">
              <div
                className={cn("h-1.5 w-1.5 rounded-full shrink-0", {
                  "bg-zinc-600": backendStatus === "idle",
                  "bg-yellow-500 animate-pulse": backendStatus === "loading",
                  "bg-green-500": backendStatus === "loaded",
                  "bg-red-500": backendStatus === "error",
                })}
              />
              <span className="text-[9px] text-zinc-500">
                {backendStatus === "idle" && "Awaiting backend"}
                {backendStatus === "loading" && "Fetching real data…"}
                {backendStatus === "loaded" && "XGBoost + PPO active"}
                {backendStatus === "error" && "Backend offline — simulator"}
              </span>
            </div>

            {/* Measure tool */}
            <div
              className={cn(
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
