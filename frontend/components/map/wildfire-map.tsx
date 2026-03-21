"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import Map, {
  NavigationControl,
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
import { WILDFIRE_INCIDENT } from "@/data/fake-wildfire";
import { CANADA_OUTLINE_GEOJSON } from "@/data/canada-geojson";
import { cn } from "@/lib/utils";

// Free tile styles — no API key required
const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const SATELLITE_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
// Note: CARTO doesn't provide satellite tiles; we use dark style throughout
// and switch pitch/zoom for the "terrain feel". This keeps everything free.

// Create a circle GeoJSON polygon (from cision, adapted)
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

// Resource marker
function ResourceMarker({
  resource,
  onClick,
}: {
  resource: Resource;
  onClick: () => void;
}) {
  const isResponder = resource.type === "ground-crew";
  return (
    <div
      className="resource-marker flex flex-col items-center cursor-pointer group"
      onClick={onClick}
    >
      <div
        className={cn(
          "h-8 w-8 border-2 flex items-center justify-center text-white font-bold text-[10px] shadow-lg",
          isResponder
            ? "bg-yellow-600 border-yellow-400"
            : "bg-orange-700 border-orange-400"
        )}
      >
        {isResponder ? "👥" : "✈"}
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 bg-zinc-900/95 border border-zinc-700 px-2 py-1 text-[9px] text-white whitespace-nowrap pointer-events-none">
        {resource.name}
      </div>
    </div>
  );
}

// Pulsing fire dot for national / province views
function FireDot({ size = "sm" }: { size?: "sm" | "lg" }) {
  const s = size === "lg" ? 24 : 14;
  const ring = size === "lg" ? 48 : 28;
  return (
    <div className="relative flex items-center justify-center" style={{ width: ring, height: ring }}>
      <div
        className="absolute rounded-full bg-red-500 opacity-40 fire-ring"
        style={{ width: ring, height: ring }}
      />
      <div
        className="absolute rounded-full bg-red-500 opacity-25 fire-ring"
        style={{ width: ring * 1.3, height: ring * 1.3, animationDelay: "0.5s" }}
      />
      <div
        className="relative rounded-full bg-red-600 border-2 border-red-300 shadow-lg shadow-red-500/50 fire-dot"
        style={{ width: s, height: s }}
      />
    </div>
  );
}

// Province-level warning card shown on map
function IncidentWarningCard({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="bg-zinc-950/95 border border-red-500/60 backdrop-blur-sm shadow-xl shadow-red-900/30 pointer-events-auto"
      style={{ minWidth: 220 }}
    >
      <div className="border-b border-red-500/40 px-3 py-2 flex items-center gap-2 bg-red-950/30">
        <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
        <span className="text-[10px] text-red-400 font-semibold uppercase tracking-widest">Active Wildfire</span>
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
      </div>
      <div className="px-3 py-2.5">
        <div className="text-sm font-semibold text-white mb-1">{WILDFIRE_INCIDENT.name}</div>
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
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 bg-red-600 hover:bg-red-500 transition-colors text-[10px] font-semibold uppercase tracking-widest text-white"
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

  const {
    viewLevel,
    setViewLevel,
    setViewport,
    selectedResourceId,
    deployResource,
    firstResponders,
    actionAssets,
    submitted,
  } = useWildfireStore();

  const allResources = [...firstResponders, ...actionAssets];
  const deployedResources = allResources.filter((r) => r.deployedPosition);

  // Fly to the correct location whenever viewLevel changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    if (viewLevel === "national") {
      map.flyTo({
        center: [-96.0, 60.0],
        zoom: 3.2,
        pitch: 0,
        bearing: 0,
        duration: 2000,
      });
      setShowWarningCard(false);
    } else if (viewLevel === "province") {
      map.flyTo({
        center: FIRE_CENTER,
        zoom: 8.5,
        pitch: 40,
        bearing: -10,
        duration: 2200,
      });
      setTimeout(() => setShowWarningCard(true), 2500);
    } else if (viewLevel === "incident") {
      setShowWarningCard(false);
      map.flyTo({
        center: FIRE_CENTER,
        zoom: 11.5,
        pitch: 55,
        bearing: -20,
        duration: 2500,
      });
    }
  }, [viewLevel, mapLoaded]);

  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      // Place selected resource at click position
      if (selectedResourceId && viewLevel === "incident") {
        deployResource(selectedResourceId, [event.lngLat.lng, event.lngLat.lat]);
        return;
      }
      // National: clicking near fire dot → province view
      if (viewLevel === "national") {
        const [fireLng, fireLat] = FIRE_CENTER;
        const dist = Math.sqrt(
          Math.pow(event.lngLat.lng - fireLng, 2) +
            Math.pow(event.lngLat.lat - fireLat, 2)
        );
        if (dist < 2.5) setViewLevel("province");
      }
    },
    [selectedResourceId, viewLevel, deployResource, setViewLevel]
  );

  const handleMapLoad = useCallback(() => setMapLoaded(true), []);

  const cursorStyle = selectedResourceId ? "crosshair" : "grab";

  return (
    <div className="relative w-full h-full" style={{ cursor: cursorStyle }}>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: -96.0,
          latitude: 60.0,
          zoom: 3.2,
          pitch: 0,
          bearing: 0,
        }}
        onMove={(evt: ViewStateChangeEvent) =>
          setViewport({
            longitude: evt.viewState.longitude,
            latitude: evt.viewState.latitude,
            zoom: evt.viewState.zoom,
            pitch: evt.viewState.pitch,
            bearing: evt.viewState.bearing,
          })
        }
        onClick={handleMapClick}
        onLoad={handleMapLoad}
        mapStyle={DARK_STYLE}
        style={{ width: "100%", height: "100%" }}
        antialias={true}
      >
        <NavigationControl position="bottom-right" />

        {/* Canada outline — national view */}
        {mapLoaded && (
          <Source id="canada-outline" type="geojson" data={CANADA_OUTLINE_GEOJSON}>
            {/* Blue fill */}
            <Layer
              id="canada-fill"
              type="fill"
              paint={{
                "fill-color": "#1d4ed8",
                "fill-opacity": viewLevel === "national" ? 0.06 : 0,
              }}
            />
            {/* Outer glow */}
            <Layer
              id="canada-glow"
              type="line"
              paint={{
                "line-color": "#1d4ed8",
                "line-width": viewLevel === "national" ? 10 : 0,
                "line-blur": 8,
                "line-opacity": 0.5,
              }}
            />
            {/* Sharp inner line */}
            <Layer
              id="canada-line"
              type="line"
              paint={{
                "line-color": "#3b82f6",
                "line-width": viewLevel === "national" ? 1.5 : 0,
                "line-opacity": 0.9,
              }}
            />
          </Source>
        )}

        {/* Fire spread rings — incident view */}
        {viewLevel === "incident" && (
          <>
            {/* 3-hour projection */}
            <Source
              id="fire-ring-3h"
              type="geojson"
              data={createCircleGeoJSON(FIRE_CENTER, FIRE_SPREAD.threeHour)}
            >
              <Layer
                id="fire-ring-3h-fill"
                type="fill"
                paint={{ "fill-color": "#d97706", "fill-opacity": 0.08 }}
              />
              <Layer
                id="fire-ring-3h-line"
                type="line"
                paint={{
                  "line-color": "#d97706",
                  "line-width": 1.5,
                  "line-dasharray": [4, 3],
                  "line-opacity": 0.7,
                }}
              />
            </Source>

            {/* 1-hour projection */}
            <Source
              id="fire-ring-1h"
              type="geojson"
              data={createCircleGeoJSON(FIRE_CENTER, FIRE_SPREAD.oneHour)}
            >
              <Layer
                id="fire-ring-1h-fill"
                type="fill"
                paint={{ "fill-color": "#f97316", "fill-opacity": 0.12 }}
              />
              <Layer
                id="fire-ring-1h-line"
                type="line"
                paint={{
                  "line-color": "#f97316",
                  "line-width": 2,
                  "line-dasharray": [3, 2],
                  "line-opacity": 0.85,
                }}
              />
            </Source>

            {/* Current fire perimeter */}
            <Source
              id="fire-current"
              type="geojson"
              data={createCircleGeoJSON(FIRE_CENTER, FIRE_SPREAD.current)}
            >
              <Layer
                id="fire-current-fill"
                type="fill"
                paint={{ "fill-color": "#ef4444", "fill-opacity": 0.22 }}
              />
              <Layer
                id="fire-current-line"
                type="line"
                paint={{
                  "line-color": "#ef4444",
                  "line-width": 2.5,
                  "line-opacity": 1,
                }}
              />
            </Source>
          </>
        )}

        {/* Fire dot marker — national & province views */}
        {(viewLevel === "national" || viewLevel === "province") && (
          <Marker longitude={FIRE_CENTER[0]} latitude={FIRE_CENTER[1]} anchor="center">
            <div
              className="cursor-pointer"
              onClick={() => {
                if (viewLevel === "national") setViewLevel("province");
                else if (viewLevel === "province") setViewLevel("incident");
              }}
            >
              <FireDot size={viewLevel === "province" ? "lg" : "sm"} />
            </div>
          </Marker>
        )}

        {/* Incident view: fire center icon */}
        {viewLevel === "incident" && (
          <Marker longitude={FIRE_CENTER[0]} latitude={FIRE_CENTER[1]} anchor="center">
            <div className="h-5 w-5 rounded-full bg-red-600 border-2 border-red-300 shadow-lg shadow-red-500/60 fire-dot" />
          </Marker>
        )}

        {/* Province view: warning card */}
        {viewLevel === "province" && (
          <Marker
            longitude={FIRE_CENTER[0]}
            latitude={FIRE_CENTER[1] + 0.08}
            anchor="bottom"
          >
            <AnimatePresence>
              {showWarningCard && (
                <IncidentWarningCard onClick={() => setViewLevel("incident")} />
              )}
            </AnimatePresence>
          </Marker>
        )}

        {/* Deployed resource markers */}
        {viewLevel === "incident" &&
          deployedResources.map((r) =>
            r.deployedPosition ? (
              <Marker
                key={r.id}
                longitude={r.deployedPosition[0]}
                latitude={r.deployedPosition[1]}
                anchor="bottom"
              >
                <ResourceMarker resource={r} onClick={() => {}} />
              </Marker>
            ) : null
          )}
      </Map>

      {/* HUD: view level indicator */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <motion.div
          key={viewLevel}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-zinc-950/80 border border-zinc-800 backdrop-blur-sm px-4 py-2 flex items-center gap-3"
        >
          <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          <span className="text-[10px] text-zinc-400 uppercase tracking-widest">
            {viewLevel === "national" && "Canada — National Overview"}
            {viewLevel === "province" && "British Columbia — Okanagan Region"}
            {viewLevel === "incident" && "Mission Control — Okanagan Ridge Fire"}
          </span>
          {viewLevel === "incident" && (
            <span className="flex items-center gap-1 text-[10px] text-red-400">
              <Flame className="h-3 w-3" />
              Out of Control
            </span>
          )}
        </motion.div>
      </div>

      {/* National view: click hint */}
      {viewLevel === "national" && mapLoaded && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.6 }}
            className="bg-zinc-950/70 border border-zinc-800 backdrop-blur-sm px-3 py-1.5"
          >
            <span className="text-[10px] text-zinc-500">
              Click the red marker in British Columbia to investigate
            </span>
          </motion.div>
        </div>
      )}

      {/* Placing resource hint */}
      {selectedResourceId && viewLevel === "incident" && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-blue-950/90 border border-blue-500/60 backdrop-blur-sm px-4 py-2 flex items-center gap-2"
          >
            <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[11px] text-blue-300 font-medium">
              Click on the map to place unit
            </span>
          </motion.div>
        </div>
      )}

      {/* Submit success overlay */}
      {submitted && viewLevel === "incident" && (
        <div className="absolute top-16 right-4 z-20 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-green-950/90 border border-green-500/60 backdrop-blur-sm px-4 py-3 space-y-1"
          >
            <div className="text-[10px] text-green-400 font-semibold uppercase tracking-widest flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              Mission Deployed
            </div>
            <div className="text-[10px] text-zinc-400">
              {deployedResources.length} unit{deployedResources.length > 1 ? "s" : ""} dispatched to field
            </div>
          </motion.div>
        </div>
      )}

      {/* Fire spread legend */}
      {viewLevel === "incident" && (
        <div className="absolute bottom-12 right-16 z-10 pointer-events-none">
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
          </div>
        </div>
      )}
    </div>
  );
}
