"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  ChevronRight,
  AlertTriangle,
  Clock,
  Target,
  Wind,
  Thermometer,
  Droplets,
  X,
  ShieldAlert,
  RefreshCw,
  Loader2,
  MapPin,
  Zap,
} from "lucide-react";
import { useWildfireStore } from "@/stores/wildfire-store";
import type { AiRecommendation, ResourceType } from "@/stores/wildfire-store";
import {
  WILDFIRE_INCIDENT,
  INFRASTRUCTURE_AT_RISK,
} from "@/data/fake-wildfire";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES: Record<string, string> = {
  CRITICAL: "border-red-500/60 bg-red-500/10 text-red-400",
  HIGH: "border-orange-500/60 bg-orange-500/10 text-orange-400",
  MEDIUM: "border-amber-500/60 bg-amber-500/10 text-amber-400",
  LOW: "border-zinc-600 bg-zinc-800/50 text-zinc-400",
};

const PRIORITY_DOT: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-amber-500",
  LOW: "bg-zinc-500",
};

const RESOURCE_LABEL: Record<string, string> = {
  "ground-crew": "Ground Crew",
  "dozer-line": "Dozer",
  "air-tanker": "Air Tanker",
  "planned-burn": "Planned Burn",
};

function RecommendationCard({
  s,
  index,
  isFocused,
}: {
  s: AiRecommendation;
  index: number;
  isFocused: boolean;
}) {
  const { setFocusedRecommendationIndex, quickDeploy } = useWildfireStore();
  const hasLocation = typeof s.lat === "number" && typeof s.lon === "number";

  const handleFocus = () => {
    if (!hasLocation) return;
    setFocusedRecommendationIndex(isFocused ? null : index);
  };

  const handleDeploy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasLocation || !s.resource_type || s.resource_type === "planned-burn") return;
    quickDeploy(s.resource_type as ResourceType, [s.lon!, s.lat!]);
  };

  return (
    <div
      className={cn(
        "border p-2.5 space-y-1.5 transition-all",
        PRIORITY_STYLES[s.priority] ?? PRIORITY_STYLES.LOW,
        isFocused && "ring-1 ring-white/20"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[s.priority])} />
          <span className="text-[8px] uppercase tracking-widest font-bold opacity-80">
            {s.priority}
          </span>
          {s.resource_type && (
            <span className="text-[8px] text-zinc-500 uppercase tracking-wider">
              · {RESOURCE_LABEL[s.resource_type] ?? s.resource_type}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[8px] opacity-60">
          <Clock className="h-2.5 w-2.5" />
          {s.timeWindow}
        </div>
      </div>
      <p className="text-[11px] font-medium leading-snug">{s.title}</p>
      <p className="text-[10px] opacity-65 leading-snug">{s.detail}</p>
      <div className="flex items-center gap-1.5 pt-0.5">
        <div className="flex-1 h-0.5 bg-black/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-current rounded-full opacity-60"
            style={{ width: `${s.confidence}%` }}
          />
        </div>
        <span className="text-[8px] opacity-50">{s.confidence}%</span>
      </div>
      {hasLocation && (
        <div className="flex items-center gap-1.5 pt-0.5 border-t border-white/10 mt-1">
          <button
            onClick={handleFocus}
            className="flex items-center gap-1 text-[8px] opacity-70 hover:opacity-100 transition-opacity"
          >
            <MapPin className="h-2.5 w-2.5" />
            {isFocused ? "Hide on map" : "Show on map"}
          </button>
          {s.resource_type && s.resource_type !== "planned-burn" && (
            <button
              onClick={handleDeploy}
              className="ml-auto flex items-center gap-1 text-[8px] bg-current/20 hover:bg-current/30 px-1.5 py-0.5 transition-colors"
            >
              <Zap className="h-2.5 w-2.5" />
              Deploy
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function AiSidebar() {
  const {
    isAiSidebarOpen,
    toggleAiSidebar,
    viewLevel,
    realWeather,
    aiRecommendations,
    aiRecommendationsStatus,
    fetchAiRecommendations,
    focusedRecommendationIndex,
    currentSizeHa,
    containmentPct,
    currentWeather,
    gameLinearHour,
    gameMinute,
    spreadPrediction,
    backendStatus,
  } = useWildfireStore();
  const isOpen = isAiSidebarOpen && viewLevel === "incident";

  // Auto-fetch when sidebar first opens and no recs yet
  useEffect(() => {
    if (isOpen && aiRecommendationsStatus === "idle") {
      fetchAiRecommendations();
    }
  }, [isOpen, aiRecommendationsStatus, fetchAiRecommendations]);

  const windSpeed = realWeather?.windSpeedKph ?? currentWeather.windSpeedKph;
  const tempC = realWeather?.tempC ?? currentWeather.tempC;
  const rhPct = realWeather?.rhPct ?? currentWeather.rhPct;

  const severity =
    containmentPct < 25 ? "EXTREME"
    : containmentPct < 50 ? "HIGH"
    : containmentPct < 75 ? "MODERATE"
    : "LOW";
  const severityColor =
    containmentPct < 25 ? "text-red-400"
    : containmentPct < 50 ? "text-amber-400"
    : containmentPct < 75 ? "text-yellow-400"
    : "text-green-400";

  const gameTimeStr = `${String(gameLinearHour % 24).padStart(2, "0")}:${String(gameMinute).padStart(2, "0")}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: "-100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "-100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 220 }}
          className="fixed left-14 top-0 z-40 h-screen w-72 border-r border-zinc-800 bg-zinc-950/96 backdrop-blur-sm flex flex-col"
        >
          <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2.5 shrink-0 bg-zinc-900/60">
            <div className="flex items-center gap-2">
              <Brain className="h-3.5 w-3.5 text-blue-400" strokeWidth={1.5} />
              <h2 className="text-[11px] font-semibold text-white uppercase tracking-widest">
                AI Analysis
              </h2>
            </div>
            <button
              onClick={toggleAiSidebar}
              className="text-zinc-600 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="border-b border-zinc-800 px-3 py-2.5 bg-red-950/20 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Status</span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-zinc-600 font-mono">{gameTimeStr}</span>
                <span className="text-[9px] text-red-400 font-medium flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                  {WILDFIRE_INCIDENT.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-zinc-900/60 border border-zinc-800 p-1.5 text-center">
                <div className="text-xs font-bold text-orange-400">{Math.round(containmentPct)}%</div>
                <div className="text-[8px] text-zinc-600 uppercase tracking-wider mt-0.5">Contained</div>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800 p-1.5 text-center">
                <div className="text-xs font-bold text-red-400">{(currentSizeHa / 1000).toFixed(1)}k</div>
                <div className="text-[8px] text-zinc-600 uppercase tracking-wider mt-0.5">Hectares</div>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800 p-1.5 text-center">
                <div className={`text-xs font-bold ${severityColor}`}>{severity}</div>
                <div className="text-[8px] text-zinc-600 uppercase tracking-wider mt-0.5">Severity</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 mt-2 text-[9px] text-zinc-500">
              <span className="flex items-center gap-1">
                <Wind className="h-2.5 w-2.5" />
                {windSpeed} km/h
              </span>
              <span className="flex items-center gap-1">
                <Thermometer className="h-2.5 w-2.5" />
                {tempC}°C
              </span>
              <span className="flex items-center gap-1">
                <Droplets className="h-2.5 w-2.5" />
                {rhPct}% RH
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="px-3 py-3 border-b border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Target className="h-3 w-3 text-blue-400" />
                  <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-medium">
                    Containment Recs
                  </span>
                </div>
                <button
                  onClick={fetchAiRecommendations}
                  disabled={aiRecommendationsStatus === "loading"}
                  className="flex items-center gap-1 text-[8px] text-blue-400 hover:text-blue-300 disabled:opacity-40 transition-colors"
                  title="Generate AI recommendations"
                >
                  {aiRecommendationsStatus === "loading" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  {aiRecommendations ? "Refresh" : "Generate"}
                </button>
              </div>

              {(aiRecommendationsStatus === "idle" || aiRecommendationsStatus === "loading") && (
                <div className="flex items-center gap-2 py-4 text-[10px] text-zinc-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400 shrink-0" />
                  Gemini analyzing current conditions…
                </div>
              )}
              {aiRecommendationsStatus === "error" && (
                <div className="text-[10px] text-red-400 py-2">
                  Analysis failed — try refreshing.
                </div>
              )}

              {aiRecommendations && (
                <div className="space-y-2">
                  {aiRecommendations.map((s, i) => (
                    <RecommendationCard
                      key={i}
                      s={s}
                      index={i}
                      isFocused={focusedRecommendationIndex === i}
                    />
                  ))}
                </div>
              )}

              {aiRecommendations && (
                <div className="mt-2 flex items-center gap-1 text-[8px] text-blue-500">
                  <Brain className="h-2.5 w-2.5" />
                  Gemini 2.5 Flash · live conditions
                </div>
              )}
            </div>

            <div className="px-3 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-1.5 mb-2">
                <ShieldAlert className="h-3 w-3 text-red-400" />
                <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-medium">
                  Infrastructure at Risk
                </span>
              </div>
              <div className="space-y-1.5">
                {INFRASTRUCTURE_AT_RISK.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-[10px] text-zinc-400">
                    <AlertTriangle className="h-2.5 w-2.5 text-red-500 shrink-0 mt-0.5" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="px-3 py-3 border-b border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[9px] text-zinc-600 uppercase tracking-widest">Spread Forecast</div>
                {spreadPrediction && (
                  <span className="text-[8px] text-blue-500">XGBoost · live wx</span>
                )}
              </div>
              {backendStatus === "loading" && (
                <div className="text-[9px] text-zinc-600 py-1">Fetching live forecast…</div>
              )}
              {(backendStatus === "loaded" || backendStatus === "idle") && (() => {
                const now = WILDFIRE_INCIDENT.spread.current;
                const h1 = spreadPrediction?.spread_1h_m ?? WILDFIRE_INCIDENT.spread.oneHour;
                const h3 = spreadPrediction?.spread_3h_m ?? WILDFIRE_INCIDENT.spread.threeHour;
                const max = h3;
                return (
                  <div className="space-y-2">
                    {[
                      { label: "Now",  value: now, pct: Math.round((now / max) * 100), color: "bg-red-500" },
                      { label: "+1h", value: h1,  pct: Math.round((h1  / max) * 100), color: "bg-orange-500" },
                      { label: "+3h", value: h3,  pct: 100,                             color: "bg-amber-600" },
                    ].map((row) => (
                      <div key={row.label} className="space-y-0.5">
                        <div className="flex justify-between text-[9px]">
                          <span className="text-zinc-500">{row.label}</span>
                          <span className="text-zinc-400 font-mono">{row.value.toLocaleString()} m radius</span>
                        </div>
                        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div
                            className={cn("h-full rounded-full", row.color)}
                            initial={{ width: 0 }}
                            animate={{ width: `${row.pct}%` }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="mt-1 text-[9px] text-zinc-600 leading-snug">
                      {WILDFIRE_INCIDENT.progression}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="border-t border-zinc-800 px-3 py-2 bg-zinc-900/40 shrink-0 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[9px] text-zinc-600">Phoenix Watch · Wildfire Intelligence</span>
            <ChevronRight className="h-3 w-3 text-zinc-700 ml-auto" />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
